#!/usr/bin/env node
/**
 * migrate-categories.mjs — migrate existing Tournaments to the new taxonomy
 * (TX-0 §4 · §6 Acceptance #4).
 *
 * DRY-RUN by default: reads every `tournaments` doc, plans the legacy→new
 * category rewrite (planCategoryMigration, §4 매핑표), and PRINTS the plan
 * without writing. Pass --apply to execute exactly that plan — "dry-run 로그 =
 * 실제 결과" (§6 #4): the printed changes are the writes.
 *
 * Usage:
 *   node functions/scripts/migrate-categories.mjs            # dry-run (no writes)
 *   node functions/scripts/migrate-categories.mjs --apply    # execute the plan
 *   node functions/scripts/migrate-categories.mjs --help
 *
 * Auth: FIREBASE_ADMIN_SDK_KEY (raw JSON or base64). Admin SDK bypasses rules.
 *
 * ⚠️ Production: this script HARD-REFUSES to write when NODE_ENV=production
 * (§3 item 6 "Production 실행은 대표 확인 후"). The production migration is a
 * deliberate 대표 action in a controlled environment — never automated here.
 * Unknown categories are NEVER written; they are surfaced for a human to decide.
 */
import admin from "firebase-admin";
import { planCategoryMigration } from "./migrate-categories.lib.mjs";

const HELP = `migrate-categories — legacy→new category migration (TX-0 §4)

  (no flag)   DRY-RUN: print the plan, write nothing
  --apply     execute the printed plan
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
      "ABORT: NODE_ENV=production — migrate-categories refuses to --apply against production.\n" +
        "The production migration is a deliberate 대표 action (§3 item 6). Run the dry-run first.",
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
    category: d.get("category"),
  }));
  const plan = planCategoryMigration(tournaments);

  console.log(
    `migrate-categories: ${tournaments.length} tournaments · ${
      opts.apply ? "APPLY" : "DRY-RUN"
    }`,
  );
  console.log(`\n  changes   (${plan.changes.length}):`);
  for (const c of plan.changes) {
    console.log(`    ${c.id}: ${c.from} → ${c.to}`);
  }
  console.log(`  unchanged : ${plan.unchanged.length}`);
  if (plan.unknown.length) {
    console.log(`\n  ⚠ UNKNOWN (${plan.unknown.length}) — NOT written, needs a human:`);
    for (const u of plan.unknown) console.log(`    ${u.id}: ${u.from}`);
  }

  if (!opts.apply) {
    console.log("\nDRY-RUN — no writes. Re-run with --apply to execute the plan above.");
    return;
  }

  if (plan.changes.length === 0) {
    console.log("\nNothing to write (already migrated). Done.");
    return;
  }

  // Firestore batches cap at 500 ops; chunk to be safe.
  for (let i = 0; i < plan.changes.length; i += 400) {
    const batch = db.batch();
    for (const c of plan.changes.slice(i, i + 400)) {
      batch.update(db.doc(`tournaments/${c.id}`), { category: c.to });
    }
    await batch.commit();
  }
  console.log(`\n✓ applied ${plan.changes.length} category rewrites. Done.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
