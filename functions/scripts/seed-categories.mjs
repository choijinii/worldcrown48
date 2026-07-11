#!/usr/bin/env node
/**
 * seed-categories.mjs — write the canonical `categories` collection (TX-0).
 *
 * The 10-category payload lives in seed-categories.lib.mjs (pure, unit-tested).
 * This runnable wraps it with firebase-admin, the production guard, and the same
 * idempotent posture as seed-preview.mjs.
 *
 * Usage:
 *   node functions/scripts/seed-categories.mjs            # create missing (skip existing)
 *   node functions/scripts/seed-categories.mjs --force    # upsert (overwrite all)
 *   node functions/scripts/seed-categories.mjs --cleanup  # delete the 10 category docs
 *   node functions/scripts/seed-categories.mjs --help
 *
 * Auth: reads FIREBASE_ADMIN_SDK_KEY (raw JSON or base64) — the admin SDK
 * bypasses security rules, so this is a privileged tool. Refuses to run when
 * NODE_ENV=production. Default is create-if-absent so a re-run never clobbers an
 * operator's live edits (name/status/order); pass --force to overwrite.
 *
 * Target project MUST be explicit at deploy time (§0.5): the caller sets
 * GOOGLE_CLOUD_PROJECT / the service-account project — this script does not
 * choose a project.
 */

// Default import (firebase-admin is CJS) — see seed-preview.mjs for the node-25
// ESM-interop rationale.
import admin from "firebase-admin";
import { SEED_CATEGORIES } from "./seed-categories.lib.mjs";

const HELP = `seed-categories — write the canonical categories collection (TX-0)

  (no flag)    create missing category docs, skip existing
  --force      upsert (overwrite every category doc)
  --cleanup    delete the 10 category docs
  --help, -h   show this help
`;

function parseArgs(argv) {
  const out = { force: false, cleanup: false, help: false };
  for (const arg of argv) {
    if (arg === "--help" || arg === "-h") out.help = true;
    else if (arg === "--force") out.force = true;
    else if (arg === "--cleanup") out.cleanup = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  if (out.force && out.cleanup) {
    throw new Error("--force and --cleanup are mutually exclusive.");
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

  if (process.env.NODE_ENV === "production") {
    console.error(
      "ABORT: NODE_ENV=production — seed-categories refuses to touch a production runtime.",
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

  console.log(
    `seed-categories: ${SEED_CATEGORIES.length} categories · ${
      opts.cleanup ? "CLEANUP" : opts.force ? "FORCE upsert" : "create-if-absent"
    }`,
  );

  for (const cat of SEED_CATEGORIES) {
    const ref = db.doc(`categories/${cat.id}`);
    if (opts.cleanup) {
      await ref.delete();
      console.log(`  ✗ deleted categories/${cat.id}`);
      continue;
    }
    if (!opts.force) {
      const snap = await ref.get();
      if (snap.exists) {
        console.log(`  · skip (exists) categories/${cat.id}`);
        continue;
      }
    }
    await ref.set(cat);
    console.log(`  ✓ wrote categories/${cat.id} (${cat.status}·p${cat.phase})`);
  }

  console.log("\nDone.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
