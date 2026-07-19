#!/usr/bin/env node
/**
 * backfill-title-i18n.mjs — repair already-published Tournaments whose
 * `titleI18n` has a slot that silently fell back to the source original
 * (the ES-shows-Korean bug, B-2.1). The publish-path fix (per-language calls)
 * stops NEW docs from regressing; this heals the OLD ones.
 *
 * DRY-RUN by default: reads every `tournaments` doc, plans which need work
 * (planTitleBackfill), PRINTS the plan, and translates/writes NOTHING.
 * Pass --apply to re-translate the affected slots (Haiku) and write `titleI18n`.
 *
 * Usage:
 *   node functions/scripts/backfill-title-i18n.mjs            # dry-run (no model, no writes)
 *   node functions/scripts/backfill-title-i18n.mjs --apply    # translate + write
 *   node functions/scripts/backfill-title-i18n.mjs --help
 *
 * Auth: FIREBASE_ADMIN_SDK_KEY (raw JSON or base64) — admin SDK bypasses rules.
 *       ANTHROPIC_API_KEY — required only for --apply (dry-run makes no model call).
 *
 * ⚠️ Refuses to --apply when NODE_ENV=production (deliberate 대표 action in a
 * controlled env, mirroring migrate-categories). The 대표 runs it locally with
 * the production service-account key, NODE_ENV unset. Idempotent: re-running
 * after a successful pass finds nothing to do.
 *
 * Scope: titleI18n ONLY (the reported, Voter-visible field). `description` has no
 * flat anchor (stored as a 3-lang object, no separate original) and is not shown
 * on any surface today — out of scope. Going forward, consider persisting
 * `sourceLang` at publish so any future re-translation is unambiguous.
 */
import admin from "firebase-admin";
import Anthropic from "@anthropic-ai/sdk";
import {
  planTitleBackfill,
  mergeTitleI18n,
} from "./backfill-title-i18n.lib.mjs";

// Keep in sync with functions/src/core/models.ts (HAIKU_MODEL).
const HAIKU_MODEL = "claude-haiku-4-5";
const LANG_NAME = { ko: "Korean(한국어)", en: "English", es: "Spanish(español)" };

const HELP = `backfill-title-i18n — heal titleI18n slots that fell back to the source (B-2.1)

  (no flag)   DRY-RUN: print the plan, make no model call, write nothing
  --apply     re-translate affected slots (Haiku) and write titleI18n
  --help, -h  show this help
`;

function parseArgs(argv) {
  const out = { apply: false, help: false };
  for (const arg of argv) {
    if (arg === "--help" || arg === "-h") out.help = true;
    else if (arg === "--apply") out.apply = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return out;
}

function loadServiceAccount() {
  const raw = process.env.FIREBASE_ADMIN_SDK_KEY;
  if (!raw) return null;
  const decoded = raw.trim().startsWith("{")
    ? raw
    : Buffer.from(raw, "base64").toString("utf8");
  return JSON.parse(decoded);
}

function buildPrompt(title, target) {
  return [
    `다음 Tournament 제목을 ${LANG_NAME[target]}(${target})로 자연스럽게 번역해줘.`,
    `제목: "${title}"`,
    "",
    `JSON 객체 하나로만 반환: { "title": string }`,
    "규칙: 고유명사(Tournament·Contestant)와 사람 이름은 원문 유지 · JSON 외 텍스트 금지",
  ].join("\n");
}

async function translateTitle(anthropic, title, target) {
  const resp = await anthropic.messages.create({
    model: HAIKU_MODEL,
    max_tokens: 256,
    messages: [{ role: "user", content: buildPrompt(title, target) }],
  });
  const block = resp.content[0];
  const text = block && block.type === "text" ? block.text : "";
  const m = text.match(/\{[\s\S]*\}/);
  try {
    const parsed = JSON.parse(m ? m[0] : text);
    return typeof parsed.title === "string" ? parsed.title.trim() : "";
  } catch {
    return ""; // caller falls back to the flat title (mergeTitleI18n)
  }
}

async function main() {
  let opts;
  try {
    opts = parseArgs(process.argv.slice(2));
  } catch (err) {
    console.error(`Argument error: ${err.message}\n`);
    console.error(HELP);
    process.exit(1);
  }
  if (opts.help) {
    console.log(HELP);
    return;
  }

  if (opts.apply && process.env.NODE_ENV === "production") {
    console.error(
      "ABORT: NODE_ENV=production — backfill refuses to --apply against production.\n" +
        "Run it locally with the production service-account key (NODE_ENV unset) after a dry-run.",
    );
    process.exit(1);
  }

  const serviceAccount = loadServiceAccount();
  if (!serviceAccount) {
    console.error(
      "ABORT: FIREBASE_ADMIN_SDK_KEY is required (raw JSON or base64 service-account key).",
    );
    process.exit(1);
  }
  if (admin.apps.length === 0) {
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  }
  const db = admin.firestore();

  const snap = await db.collection("tournaments").get();
  const tournaments = snap.docs.map((d) => ({
    id: d.id,
    title: d.get("title"),
    titleI18n: d.get("titleI18n"),
  }));
  const plan = planTitleBackfill(tournaments);

  console.log(
    `backfill-title-i18n: ${tournaments.length} tournaments · ${
      opts.apply ? "APPLY" : "DRY-RUN"
    }`,
  );
  console.log(`\n  needs backfill (${plan.needs.length}):`);
  for (const n of plan.needs) {
    console.log(`    ${n.id}: "${n.title}" · retranslate [${n.langs.join(", ")}]`);
  }
  console.log(`  ok (already complete): ${plan.ok.length}`);
  if (plan.skipped.length) {
    console.log(`\n  ⚠ skipped (${plan.skipped.length}):`);
    for (const s of plan.skipped) console.log(`    ${s.id}: ${s.reason}`);
  }

  if (!opts.apply) {
    console.log(
      "\nDRY-RUN — no model calls, no writes. Re-run with --apply to translate + write.",
    );
    return;
  }
  if (plan.needs.length === 0) {
    console.log("\nNothing to backfill. Done.");
    return;
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error("ABORT: ANTHROPIC_API_KEY is required for --apply.");
    process.exit(1);
  }
  const anthropic = new Anthropic({ apiKey });
  const byId = new Map(snap.docs.map((d) => [d.id, d.get("titleI18n")]));

  const updates = [];
  for (const n of plan.needs) {
    const translated = {};
    for (const l of n.langs) {
      translated[l] = await translateTitle(anthropic, n.title, l);
    }
    const nextI18n = mergeTitleI18n(n.title, byId.get(n.id), translated);
    updates.push({ id: n.id, titleI18n: nextI18n });
    console.log(
      `  ✓ ${n.id}: ${n.langs
        .map((l) => `${l}="${nextI18n[l]}"`)
        .join(" · ")}`,
    );
  }

  // Firestore batches cap at 500 ops; chunk to be safe.
  for (let i = 0; i < updates.length; i += 400) {
    const batch = db.batch();
    for (const u of updates.slice(i, i + 400)) {
      batch.update(db.doc(`tournaments/${u.id}`), { titleI18n: u.titleI18n });
    }
    await batch.commit();
  }
  console.log(`\n✓ backfilled ${updates.length} tournaments. Done.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
