#!/usr/bin/env node
/**
 * seed-preview.mjs — unified preview seeder (Phase C, W-3).
 *
 * One entry point to inject the canonical preview data for every module so a
 * designer can spot-check built domains. Replaces the per-module inline seeds
 * that previously lived only inside E2E specs (there were never standalone
 * seed-c*.mjs files — see [[project-dev-visual-aid-stack-conflict]]).
 *
 * Usage:
 *   node functions/scripts/seed-preview.mjs --module=all
 *   node functions/scripts/seed-preview.mjs --module=c3 --deadline=past
 *   node functions/scripts/seed-preview.mjs --module=all --cleanup
 *   node functions/scripts/seed-preview.mjs --help
 *
 * Auth: reads FIREBASE_ADMIN_SDK_KEY (raw JSON or base64), same as the E2E
 * specs. The admin SDK bypasses security rules, so this is a privileged tool.
 *
 * Safeguards:
 *   - Refuses to run when NODE_ENV === 'production' (handoff §8 #7).
 *   - Idempotent: existing docs are skipped, not overwritten (unless --cleanup).
 */

// Default import (not `* as admin`): firebase-admin is CJS, and under Node's
// ESM interop a namespace import leaves `.apps`/`.initializeApp`/`.firestore`
// on `.default` (undefined at top level) — broke under node 25 (firebase-admin
// engines = 20||22||24). The default import resolves to module.exports on every
// supported node, so .apps/.credential/.firestore are always present.
import admin from "firebase-admin";
import {
  deadlineFromOption,
  isProductionBlocked,
  parseArgs,
  resolveModules,
} from "./seed-preview.lib.mjs";

// Shared preview ids. The Dev Nav Arena link points at DEV_TID
// (lib/dev/devNav.ts SAMPLE_TOURNAMENT_ID), so seeding makes that link resolve.
const DEV_TID = "dev-preview";
const DEV_LAB_TID = "dev-preview-lab";
const DEV_VOTER_UID = "dev-preview-voter";

const HELP = `seed-preview — unified preview seeder (W-3)

  --module=all|b1|c1|c2|c3|d1|e1   modules to seed (default: all; comma list ok)
  --deadline=past|future           Tournament Deadline for arena modules (default: future)
  --cleanup                        remove seeded docs instead of creating them
  --help, -h                       show this help

Examples:
  node functions/scripts/seed-preview.mjs --module=all
  node functions/scripts/seed-preview.mjs --module=c3 --deadline=past
  node functions/scripts/seed-preview.mjs --module=all --cleanup
`;

function loadServiceAccount() {
  const raw = process.env.FIREBASE_ADMIN_SDK_KEY;
  if (!raw) return null;
  const decoded = raw.trim().startsWith("{")
    ? raw
    : Buffer.from(raw, "base64").toString("utf8");
  return JSON.parse(decoded);
}

/** Create `ref` only if absent (idempotent). Returns true when it wrote. */
async function ensureDoc(ref, data) {
  const snap = await ref.get();
  if (snap.exists) {
    console.log(`  · skip (exists) ${ref.path}`);
    return false;
  }
  await ref.set(data);
  console.log(`  ✓ wrote ${ref.path}`);
  return true;
}

/** The shared active Arena tournament + 48 contestants (c1/c2/c3 reuse it). */
async function ensureArenaTournament(db, deadline) {
  await ensureDoc(db.doc(`tournaments/${DEV_TID}`), {
    title: "Dev Preview — Strikers",
    category: "FOOTBALL",
    status: "active",
    hostUid: "seed-operator",
    currentRound: 1,
    totalContestants: 48,
    tournamentDeadline: admin.firestore.Timestamp.fromDate(deadline),
    settings: { aiNews: false, multiLang: false, showRanking: true },
    featured: false,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  const existing = await db
    .collection("contestants")
    .where("tournamentId", "==", DEV_TID)
    .limit(1)
    .get();
  if (!existing.empty) {
    console.log(`  · skip (exists) contestants for ${DEV_TID}`);
    return;
  }
  const batch = db.batch();
  for (let i = 1; i <= 48; i++) {
    batch.set(db.doc(`contestants/${DEV_TID}_c${i}`), {
      tournamentId: DEV_TID,
      hostUid: "seed-operator",
      order: i,
      name: `P${i}`,
      nationality: "KR",
      position: "FW",
      imageUrl: "",
      imageSearchKeyword: `p${i}`,
    });
  }
  await batch.commit();
  console.log(`  ✓ wrote 48 contestants for ${DEV_TID}`);
}

async function deleteArenaTournament(db) {
  for (const coll of ["contestants", "votes", "ranking_cache", "roundProgress"]) {
    const snap = await db
      .collection(coll)
      .where("tournamentId", "==", DEV_TID)
      .get();
    const batch = db.batch();
    snap.forEach((doc) => batch.delete(doc.ref));
    if (snap.size) {
      await batch.commit();
      console.log(`  ✗ deleted ${snap.size} ${coll} for ${DEV_TID}`);
    }
  }
  await db.doc(`tournaments/${DEV_TID}`).delete();
  await db.doc(`ranking_cache/${DEV_TID}`).delete().catch(() => {});
  console.log(`  ✗ deleted tournaments/${DEV_TID}`);
}

/**
 * A-1 · The Pitch trending feed: 6 Tournaments spanning all 6 categories —
 * 4 `active` (surface in the feed, handoff §5 query) + 2 `draft` (hidden;
 * they live in the Host's Lab). The Pitch card reads only the Tournament doc,
 * so no contestants are needed. createdAt is serverTimestamp() (NOT hardcoded)
 * so the orderBy createdAt desc query is exercised against the composite index
 * (handoff §9 trap 2).
 *
 * NONE is `featured`. `featured` is a GLOBAL singleton consumed by A-0's
 * FeaturedTournament hero (`where featured==true limit 1`) across every
 * deployment. A preview seed claiming it crashed the un-migrated A-0 code on
 * pinned/production deployments (legacy closesAt → toDate on undefined). The
 * global hero is set deliberately by 대표 on a real, playable tournament — not
 * here. A-1's FEATURED pill component is intact for when one exists.
 */
const A1_TIDS = [1, 2, 3, 4, 5, 6].map((n) => `a1-preview-${n}`);
const A1_TOURNAMENTS = [
  { id: A1_TIDS[0], title: "Strikers of the Century", category: "FOOTBALL", status: "active", featured: false },
  { id: A1_TIDS[1], title: "K-Pop Visuals of the Decade", category: "KPOP", status: "active", featured: false },
  { id: A1_TIDS[2], title: "Greatest Anime Protagonists", category: "ANIME", status: "active", featured: false },
  { id: A1_TIDS[3], title: "Legendary Game Bosses", category: "GAMING", status: "active", featured: false },
  { id: A1_TIDS[4], title: "Cinema Icons of 2025", category: "MOVIE", status: "draft", featured: false },
  { id: A1_TIDS[5], title: "Icons of the Year", category: "OTHER", status: "draft", featured: false },
];

async function seedPitchFeed(db, deadline) {
  for (const t of A1_TOURNAMENTS) {
    await ensureDoc(db.doc(`tournaments/${t.id}`), {
      title: t.title,
      category: t.category,
      status: t.status,
      hostUid: "seed-operator",
      currentRound: 1,
      totalContestants: 48,
      tournamentDeadline:
        t.status === "active"
          ? admin.firestore.Timestamp.fromDate(deadline)
          : null,
      settings: { aiNews: false, multiLang: false, showRanking: true },
      featured: t.featured,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  }
}

async function deletePitchFeed(db) {
  for (const id of A1_TIDS) {
    await db.doc(`tournaments/${id}`).delete();
    console.log(`  ✗ deleted tournaments/${id}`);
  }
}

const SEEDERS = {
  // a1 — The Pitch trending feed (4 active + 2 draft, all 6 categories).
  a1: {
    seed: (db, ctx) => seedPitchFeed(db, ctx.deadline),
    cleanup: (db) => deletePitchFeed(db),
  },
  // c1 / c2 share the active Arena tournament (crown is produced by playing it).
  c1: {
    seed: (db, ctx) => ensureArenaTournament(db, ctx.deadline),
    cleanup: (db) => deleteArenaTournament(db),
  },
  c2: {
    seed: (db, ctx) => ensureArenaTournament(db, ctx.deadline),
    cleanup: async () => {
      /* shares the arena tournament; c1.cleanup removes it */
    },
  },
  c3: {
    seed: async (db, ctx) => {
      await ensureArenaTournament(db, ctx.deadline);
      await ensureDoc(db.doc(`ranking_cache/${DEV_TID}`), {
        tournamentId: DEV_TID,
        rankings: [
          { rank: 1, contestantId: "c1", name: "L. Messi", imageUrl: null, rate: 60 },
          { rank: 2, contestantId: "c2", name: "C. Ronaldo", imageUrl: null, rate: 25 },
          { rank: 3, contestantId: "c3", name: "Neymar Jr", imageUrl: null, rate: 10 },
          { rank: 4, contestantId: "c4", name: "K. Mbappe", imageUrl: null, rate: 5 },
        ],
        generationSequence: 1,
        generatedAt: admin.firestore.FieldValue.serverTimestamp(),
        previousGeneratedAt: null,
      });
    },
    cleanup: async (db) => {
      await db.doc(`ranking_cache/${DEV_TID}`).delete().catch(() => {});
      console.log(`  ✗ deleted ranking_cache/${DEV_TID}`);
    },
  },
  // b1 — operator console list: a draft tournament.
  b1: {
    seed: (db) =>
      ensureDoc(db.doc(`tournaments/${DEV_LAB_TID}`), {
        title: "Dev Preview — Lab Draft",
        category: "K-POP",
        status: "draft",
        hostUid: "seed-operator",
        currentRound: 0,
        totalContestants: 0,
        settings: { aiNews: false, multiLang: false, showRanking: true },
        featured: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      }),
    cleanup: async (db) => {
      await db.doc(`tournaments/${DEV_LAB_TID}`).delete();
      console.log(`  ✗ deleted tournaments/${DEV_LAB_TID}`);
    },
  },
  // d1 — Account surface: a sample signed-in voter profile.
  d1: {
    seed: (db) =>
      ensureDoc(db.doc(`users/${DEV_VOTER_UID}`), {
        role: "voter",
        displayName: "Dev Preview Voter",
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      }),
    cleanup: async (db) => {
      await db.doc(`users/${DEV_VOTER_UID}`).delete();
      console.log(`  ✗ deleted users/${DEV_VOTER_UID}`);
    },
  },
  // e1 — Policy Hub renders static content; nothing to seed.
  e1: {
    seed: async () => {
      console.log("  · e1 (Policy Hub) renders static content — nothing to seed");
    },
    cleanup: async () => {},
  },
};

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

  if (isProductionBlocked(process.env)) {
    console.error(
      "ABORT: NODE_ENV=production — seed-preview refuses to touch a production runtime.",
    );
    process.exit(1);
  }

  const modules = resolveModules(opts.module);
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
  const deadline = deadlineFromOption(opts.deadline, new Date());

  console.log(
    `seed-preview: modules=[${modules.join(", ")}] ${opts.cleanup ? "CLEANUP" : `seed (deadline=${opts.deadline})`}`,
  );

  for (const m of modules) {
    const seeder = SEEDERS[m];
    console.log(`\n[${m}]`);
    if (opts.cleanup) {
      await seeder.cleanup(db, { deadline });
    } else {
      await seeder.seed(db, { deadline });
    }
  }

  console.log("\nDone.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
