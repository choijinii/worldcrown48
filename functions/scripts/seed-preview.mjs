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
  // admin — G-1 Admin Dashboard: a few active Tournaments at different rounds,
  // ~40 votes across 24h (some in the last hour/minute so vote_speed and
  // active_voters are non-zero), and 4 admin_alerts spanning the severities.
  // Prevents the "0/0/0/0/0 → is it broken?" first-load confusion (trap #8).
  admin: {
    seed: (db) => seedAdmin(db),
    cleanup: (db) => deleteAdmin(db),
  },
};

// ── G-1 admin seed ──────────────────────────────────────────────────────
const ADMIN_TIDS = ["admin-preview-1", "admin-preview-2", "admin-preview-3"];
// status active + a currentRound each so round_status shows a distribution.
const ADMIN_TOURNAMENTS = [
  { id: ADMIN_TIDS[0], title: "Admin Preview — Strikers", category: "FOOTBALL", round: 2 },
  { id: ADMIN_TIDS[1], title: "Admin Preview — K-Pop Visual", category: "KPOP", round: 3 },
  { id: ADMIN_TIDS[2], title: "Admin Preview — Anime Icons", category: "ANIME", round: 5 },
];
const ADMIN_ALERT_IDS = [
  "admin-preview-alert-high",
  "admin-preview-alert-medium",
  "admin-preview-alert-low",
  "admin-preview-alert-dismissed",
];

async function seedAdmin(db) {
  const now = Date.now();
  const future = admin.firestore.Timestamp.fromMillis(now + 14 * 24 * 60 * 60 * 1000);

  for (const t of ADMIN_TOURNAMENTS) {
    await ensureDoc(db.doc(`tournaments/${t.id}`), {
      title: t.title,
      category: t.category,
      status: "active",
      hostUid: "seed-operator",
      currentRound: t.round,
      totalContestants: 48,
      tournamentDeadline: future,
      settings: { aiNews: false, multiLang: false, showRanking: true },
      featured: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  }

  // ~40 votes: spread across 24h, with a cluster in the last hour and a few in
  // the last minute. Distinct userIds u1..u15 (≈6 active within the last hour).
  const existingVotes = await db
    .collection("votes")
    .where("tournamentId", "==", ADMIN_TIDS[0])
    .limit(1)
    .get();
  if (existingVotes.empty) {
    const batch = db.batch();
    const ageMsList = [
      // last 60s (vote_speed) — 3
      10_000, 30_000, 55_000,
      // last hour (active_voters) — 7 (distinct u1..u6 + a repeat)
      5 * 60_000, 12 * 60_000, 20 * 60_000, 33 * 60_000, 41 * 60_000, 52 * 60_000, 18 * 60_000,
      // spread across the rest of 24h — 30
      ...Array.from({ length: 30 }, (_, i) => (i + 2) * 45 * 60_000),
    ];
    ageMsList.forEach((ageMs, i) => {
      const uid = `admin-voter-${(i % 15) + 1}`;
      const tid = ADMIN_TIDS[i % ADMIN_TIDS.length];
      batch.set(db.collection("votes").doc(`admin-preview-vote-${i}`), {
        userId: uid,
        tournamentId: tid,
        round: 1,
        matchId: `${tid}:r1:m${i}`,
        contestantId: `c${(i % 48) + 1}`,
        date: "seed",
        createdAt: admin.firestore.Timestamp.fromMillis(now - ageMs),
      });
    });
    await batch.commit();
    console.log(`  ✓ wrote ${ageMsList.length} votes for admin preview`);
  } else {
    console.log("  · skip (exists) admin preview votes");
  }

  // 4 admin_alerts — severity override so the AlertList shows all four tints.
  const alerts = [
    { id: ADMIN_ALERT_IDS[0], type: "T-3", severity: "high", detail: "#1 Strikers +210% in 24h — bot pattern suspected", resolved: false, ageMs: 2 * 60_000 },
    { id: ADMIN_ALERT_IDS[1], type: "T-1", severity: "medium", detail: "#1 K-Pop Visual lead at 61% (≥60% threshold)", resolved: false, ageMs: 18 * 60_000 },
    { id: ADMIN_ALERT_IDS[2], type: "T-4", severity: "low", detail: "Anime Icons rank 4→2 jump in the last hour", resolved: false, ageMs: 55 * 60_000 },
    { id: ADMIN_ALERT_IDS[3], type: "T-2", severity: "low", detail: "Resolved earlier — kept for the dismissed tint", resolved: true, ageMs: 3 * 60 * 60_000 },
  ];
  for (const a of alerts) {
    await ensureDoc(db.doc(`admin_alerts/${a.id}`), {
      type: a.type,
      severity: a.severity,
      tournamentId: ADMIN_TIDS[0],
      detail: a.detail,
      resolved: a.resolved,
      createdAt: admin.firestore.Timestamp.fromMillis(now - a.ageMs),
    });
  }
}

async function deleteAdmin(db) {
  for (const id of ADMIN_TIDS) {
    await db.doc(`tournaments/${id}`).delete().catch(() => {});
  }
  const votes = await db
    .collection("votes")
    .where("tournamentId", "in", ADMIN_TIDS)
    .get();
  const batch = db.batch();
  votes.forEach((d) => batch.delete(d.ref));
  if (votes.size) await batch.commit();
  for (const id of ADMIN_ALERT_IDS) {
    await db.doc(`admin_alerts/${id}`).delete().catch(() => {});
  }
  console.log(`  ✗ deleted admin preview (${ADMIN_TIDS.length} tournaments, ${votes.size} votes, ${ADMIN_ALERT_IDS.length} alerts)`);
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
