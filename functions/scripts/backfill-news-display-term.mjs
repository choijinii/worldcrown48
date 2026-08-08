#!/usr/bin/env node
/**
 * backfill-news-display-term.mjs — heal ALREADY-PUBLISHED articles that were written
 * before the 표시 용어 층 (PR #60 · LANGUAGE.md v2.0 §1). 대표 결정 2026-08-08.
 *
 * The publish path is already fixed: newsPrompts 지침 6 shipped and the four news
 * functions were redeployed 2026-08-08, so NEW articles never say "Voter". This
 * repairs the ones written before that. Rules live in the .lib.mjs and are unit-tested
 * against the real production strings (backfillNewsDisplayTerm.test.ts).
 *
 * DRY-RUN by default: reads every `news` doc, prints a full before/after audit, and
 * writes NOTHING. Pass --apply to write.
 *
 * Usage:
 *   node functions/scripts/backfill-news-display-term.mjs             # dry-run
 *   node functions/scripts/backfill-news-display-term.mjs --published # only published
 *   node functions/scripts/backfill-news-display-term.mjs --apply     # back up + write
 *   node functions/scripts/backfill-news-display-term.mjs --help
 *
 * Auth: FIREBASE_ADMIN_SDK_KEY (raw JSON or base64) — admin SDK bypasses rules.
 *
 * Safety rails, in the order they fire:
 *   1. --apply refuses when NODE_ENV=production (mirrors backfill-title-i18n: the 대표
 *      runs it locally against the prod key with NODE_ENV unset, after a dry-run).
 *   2. RESIDUE ABORT — if any doc still contains a 지칭 the rules did not enumerate,
 *      the run stops before writing ANYTHING. A half-converted article is worse than
 *      an unconverted one, and an unknown form means a human should look.
 *   3. Every touched doc is snapshotted to outputs/ BEFORE the first write.
 *   4. Only the text slots planArticleBackfill returns are written. status · slug ·
 *      template · evidence · publishedAt · stats numbers · matchup proper nouns are
 *      never in the write payload.
 *
 * Idempotent: a second run finds nothing to do.
 */
import fs from "node:fs";
import path from "node:path";
import admin from "firebase-admin";
import {
  planArticleBackfill,
  summarize,
} from "./backfill-news-display-term.lib.mjs";

const HELP = `backfill-news-display-term — Voter → 팬/Fan in already-published articles

  (no flag)     DRY-RUN: print the full before/after audit, write nothing
  --published   restrict to status='published' (default: every doc)
  --apply       snapshot to outputs/ then write the rewritten text slots
  --help, -h    show this help

Env: FIREBASE_ADMIN_SDK_KEY (raw JSON or base64)
`;

function parseArgs(argv) {
  const out = { apply: false, help: false, publishedOnly: false };
  for (const arg of argv) {
    if (arg === "--help" || arg === "-h") out.help = true;
    else if (arg === "--apply") out.apply = true;
    else if (arg === "--published") out.publishedOnly = true;
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

/** Timestamped snapshot dir — the rollback source if a rewrite reads badly. */
function writeBackup(docs, stamp) {
  const dir = path.resolve("outputs", "backfill-news-display-term", stamp);
  fs.mkdirSync(dir, { recursive: true });
  for (const d of docs) {
    fs.writeFileSync(
      path.join(dir, `${d.id}.json`),
      JSON.stringify(d, null, 2),
      "utf8",
    );
  }
  return dir;
}

function printPlan(plan) {
  if (!plan.changed && plan.residue.length === 0) {
    console.log(`  ${plan.id}  ok (nothing to do)`);
    return;
  }
  console.log(`\n  ${plan.id}  ${plan.changes.length} replacement(s)`);
  for (const c of plan.changes) {
    console.log(`    [${c.lang}] ${c.slot}`);
    console.log(`      -  ${c.before}`);
    console.log(`      +  ${c.after}`);
  }
  for (const r of plan.residue) {
    console.log(`    ⚠️ RESIDUE [${r.lang}] ${r.slot} → ${r.hits.join(", ")}`);
    console.log(`       ${r.text}`);
  }
}

async function main() {
  let opts;
  try {
    opts = parseArgs(process.argv.slice(2));
  } catch (err) {
    console.error(`Argument error: ${err.message}\n${HELP}`);
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

  const svc = loadServiceAccount();
  if (!svc) {
    console.error(
      "ABORT: FIREBASE_ADMIN_SDK_KEY is not set. Export the service-account key\n" +
        "(raw JSON or base64) and re-run. Dry-run needs it too — it reads Firestore.",
    );
    process.exit(1);
  }
  admin.initializeApp({ credential: admin.credential.cert(svc) });
  const db = admin.firestore();

  const snap = await db.collection("news").get();
  const docs = snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .filter((d) => (opts.publishedOnly ? d.status === "published" : true));

  console.log(
    `\nbackfill-news-display-term — ${docs.length} doc(s)` +
      `${opts.publishedOnly ? " (published only)" : ""}` +
      `  mode=${opts.apply ? "APPLY" : "DRY-RUN"}\n`,
  );

  // Plan on clones so a dry-run cannot mutate anything we later read.
  const plans = docs.map((d) =>
    planArticleBackfill(structuredClone(d), { mutate: false }),
  );
  for (const p of plans) printPlan(p);

  const sum = summarize(plans);
  console.log(
    `\nSummary: ${sum.docsChanged}/${sum.docs} doc(s) to change · ` +
      `${sum.replacements} replacement(s) · ${sum.docsWithResidue} doc(s) with residue\n`,
  );

  if (sum.docsWithResidue > 0) {
    console.error(
      "ABORT: some documents contain a 지칭 form the rules do not enumerate (see ⚠️ above).\n" +
        "Nothing was written. Add the form to backfill-news-display-term.lib.mjs (with a\n" +
        "test) or fix that doc by hand, then re-run.",
    );
    process.exit(1);
  }

  if (!opts.apply) {
    console.log("DRY-RUN — nothing written. Re-run with --apply to write.");
    return;
  }
  if (sum.docsChanged === 0) {
    console.log("Nothing to do.");
    return;
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const touched = docs.filter((d) => plans.find((p) => p.id === d.id)?.changed);
  const backupDir = writeBackup(touched, stamp);
  console.log(`Backup written: ${backupDir}  (${touched.length} doc(s))`);

  let written = 0;
  for (const original of touched) {
    const next = structuredClone(original);
    planArticleBackfill(next, { mutate: true });
    // Only the localized text carriers — everything else stays as it is on the doc.
    await db.collection("news").doc(original.id).update({
      title: next.title,
      subhead: next.subhead,
      body: next.body,
    });
    written += 1;
    console.log(`  wrote ${original.id}`);
  }
  console.log(`\nDone. ${written} doc(s) updated. Backup: ${backupDir}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
