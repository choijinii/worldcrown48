/**
 * C-1 The Arena critical-path E2E (handoff §11 / 대표 scenarios).
 *
 * Auth: global-setup hydrates storageState for the Voter (C1_TEST_UID). A test
 * ACTIVE tournament + 48 ordered contestants (P1..P48, order 1..48) is seeded
 * via firebase-admin in beforeAll and torn down in afterAll. Votes are seeded
 * with admin to reach a given progress point (the per-Voter bracket is
 * votes-derived, so seeding votes == seeding progress).
 *
 * afterEach enforces "Console errors must be 0" (§11.6).
 *
 * Coverage note: rules write-denials live in tests/rules/arena-rules.test.ts
 * (emulator); advanceRound idempotency is unit-tested (advanceRoundCore) + a
 * merge-set by construction — here we assert the END STATE is correct and
 * stable. Authored to the D-1/B-1 E2E pattern; verified in CI (needs preview +
 * secrets), not locally.
 *
 * onVote + advanceRound are deployed to prod (asia-northeast3) so the voting
 * tests run end-to-end; Firestore uses long-polling auto-detect so the browser
 * reaches the backend reliably under CI.
 */
import { expect, test } from "@playwright/test";
import * as admin from "firebase-admin";
import { round1OrderedIds } from "@/lib/arena/matches";

const TID = "c1-e2e-tournament";
const UID = process.env.C1_TEST_UID ?? "";

// HF-2: the bracket is a pure fn of (contestants, votes, seed). We pre-inject a
// FIXED seed so the seeded votes and the resumed-match assertion are
// deterministic (§8 Edge #3 — a spec that assumed order pairing must pin the
// seed and compute expected from it, not hardcode c1..c48 adjacency).
const E2E_SEED = 1;

/** The seeded round-1 contestant-id order for E2E_SEED (P{order} id = `${TID}_c${order}`). */
function seededRound1Ids(): string[] {
  const contestants = Array.from({ length: 48 }, (_, i) => ({
    id: `${TID}_c${i + 1}`,
    order: i + 1,
  }));
  return round1OrderedIds(contestants, E2E_SEED);
}

/** P-number (name) of the contestant at a given seeded round-1 slot. */
function seededPlayerNameAt(slot: number): string {
  const id = seededRound1Ids()[slot]; // `${TID}_c${order}`
  return `P${id.slice(`${TID}_c`.length)}`;
}

// Seeded votes set up bracket progress (the bracket is votes-derived) — they
// must NOT count toward today's daily-5 limit, or the UI vote under test gets
// gated (daily_limit) instead of firing onVote. Use a CONFIRMED PAST date, not
// the authoring day: a hardcoded "today" silently broke the FINAL test on the
// day it ran (45 seeded votes == today → final pick gated → championId never
// written → 30s timeout). The daily-limit query matches on date == todayKST,
// so any fixed past date is invisible to it. (ADR-0002 trap b.)
const SEED_PAST_DATE = "2020-01-01";

let consoleErrors: string[] = [];

function loadServiceAccount(): admin.ServiceAccount | null {
  const raw = process.env.FIREBASE_ADMIN_SDK_KEY;
  if (!raw) return null;
  const decoded = raw.trim().startsWith("{")
    ? raw
    : Buffer.from(raw, "base64").toString("utf8");
  return JSON.parse(decoded) as admin.ServiceAccount;
}
function db(): admin.firestore.Firestore {
  if (admin.apps.length === 0) {
    const sa = loadServiceAccount();
    if (!sa) throw new Error("FIREBASE_ADMIN_SDK_KEY required for C-1 E2E.");
    admin.initializeApp({ credential: admin.credential.cert(sa) });
  }
  return admin.firestore();
}
function matchId(round: number, i: number): string {
  return `${TID}:r${round}:m${i}`;
}

async function seedTournament(): Promise<void> {
  const d = db();
  const batch = d.batch();
  batch.set(d.doc(`tournaments/${TID}`), {
    title: "E2E Strikers",
    category: "FOOTBALL",
    status: "active",
    hostUid: "seed-operator",
    currentRound: 1,
    totalContestants: 48,
    settings: { aiNews: false, multiLang: false, showRanking: true },
    featured: false,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  for (let i = 1; i <= 48; i++) {
    batch.set(d.doc(`contestants/${TID}_c${i}`), {
      tournamentId: TID,
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
  await seedBracketSeed();
}

/** Pin the Voter's bracket seed so the seeded bracket is deterministic (HF-2). */
async function seedBracketSeed(): Promise<void> {
  const d = db();
  await d.doc(`bracket_seeds/${UID}_${TID}`).set({
    seed: E2E_SEED,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
}

/** Seed n round-1 left-picks (m0..m{n-1}) — left = the SEEDED slot 2i (HF-2). */
async function seedRound1Votes(n: number): Promise<void> {
  const d = db();
  const ids = seededRound1Ids();
  const batch = d.batch();
  for (let i = 0; i < n; i++) {
    batch.set(d.doc(`votes/${TID}_${UID}_r1_m${i}`), {
      userId: UID,
      tournamentId: TID,
      round: 1,
      matchId: matchId(1, i),
      contestantId: ids[i * 2], // left of seeded pair i
      date: SEED_PAST_DATE,
    });
  }
  await batch.commit();
}

/**
 * Clear THIS Voter's votes + roundProgress for the tournament so the per-Voter
 * bracket resets to m0. Needed because the FINAL test leaves the Voter with a
 * COMPLETED bracket (46 votes + championId); without this reset a later test
 * loads the champion screen instead of a match. (ADR-0004.)
 */
async function resetVoterProgress(): Promise<void> {
  const d = db();
  const snap = await d
    .collection("votes")
    .where("userId", "==", UID)
    .where("tournamentId", "==", TID)
    .get();
  const batch = d.batch();
  snap.forEach((doc) => batch.delete(doc.ref));
  await batch.commit();
  await d.doc(`roundProgress/${UID}_${TID}`).delete().catch(() => {});
  // HF-2 (§8 Edge #3): the bracket seed is part of per-Voter state — clear it
  // too, else a leftover seed carries the old bracket into the next test.
  await d.doc(`bracket_seeds/${UID}_${TID}`).delete().catch(() => {});
}

async function cleanup(): Promise<void> {
  const d = db();
  for (const coll of ["votes", "contestants", "roundProgress"]) {
    const snap = await d
      .collection(coll)
      .where("tournamentId", "==", TID)
      .get();
    const batch = d.batch();
    snap.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
  }
  await d.doc(`tournaments/${TID}`).delete();
  await d.doc(`roundProgress/${UID}_${TID}`).delete().catch(() => {});
  await d.doc(`bracket_seeds/${UID}_${TID}`).delete().catch(() => {});
}

test.describe("C-1 The Arena — Voter critical path", () => {
  // Park until a real preview is wired (B1/C1 secrets land post-merge on main).
  test.skip(
    !process.env.PREVIEW_URL,
    "PREVIEW_URL not set — C-1 E2E parked until secret setup",
  );

  test.beforeAll(async () => {
    await cleanup().catch(() => {});
    await seedTournament();
  });
  test.afterAll(async () => cleanup());

  test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    page.on("console", (m) => {
      if (m.type() !== "error") return;
      const t = m.text();
      // Ignore Firestore's transient connection-retry warning — it's
      // recoverable; the actual render assertions gate real connectivity.
      if (t.includes("Could not reach Cloud Firestore backend")) return;
      consoleErrors.push(t);
    });
  });
  test.afterEach(async () => {
    expect(consoleErrors, "Console errors must be 0").toHaveLength(0);
  });

  test("refresh mid-round (10/24 votes) resumes at exactly m10", async ({
    page,
  }) => {
    await seedRound1Votes(10); // 10 votes in round 1 → resume at match m10
    await page.goto(`/arena/${TID}`);
    // m10 = the SEEDED slots 20 & 21 (HF-2 — pairing is seed-shuffled, not
    // c21/c22). Compute the expected P-names from E2E_SEED. Assert via the side
    // buttons (the name appears in both the name div and the vote label →
    // getByText is ambiguous under strict mode).
    await expect(page.getByTestId("vote-left")).toContainText(seededPlayerNameAt(20));
    await expect(page.getByTestId("vote-right")).toContainText(seededPlayerNameAt(21));
  });

  test("THE FINAL pick writes only roundProgress.championId; tournament doc untouched", async ({
    page,
  }) => {
    // Seed rounds 1–4 complete (24+12+6+3 = 45 left-pick votes) via admin, then
    // make the final pick through the UI.
    const d = db();
    const before = (await d.doc(`tournaments/${TID}`).get()).data();
    const batch = d.batch();
    const rounds: Array<[number, number]> = [
      [1, 24],
      [2, 12],
      [3, 6],
      [4, 3],
    ];
    for (const [round, count] of rounds) {
      for (let i = 0; i < count; i++) {
        batch.set(d.doc(`votes/${TID}_${UID}_r${round}_m${i}`), {
          userId: UID,
          tournamentId: TID,
          round,
          matchId: matchId(round, i),
          contestantId: `${TID}_c${round === 1 ? i * 2 + 1 : i + 1}`,
          date: SEED_PAST_DATE,
        });
      }
    }
    await batch.commit();

    await page.goto(`/arena/${TID}`);
    // THE FINAL: 3 finalists → pick the first CROWN button.
    await page.getByRole("button", { name: /CROWN/ }).first().click();

    // roundProgress.championId is set; the tournament doc is unchanged.
    // advanceRound is an async Firestore trigger (Eventarc) — give it time.
    await expect
      .poll(
        async () =>
          (await d.doc(`roundProgress/${UID}_${TID}`).get()).data()?.championId,
        { timeout: 30_000 },
      )
      .toBeTruthy();
    const after = (await d.doc(`tournaments/${TID}`).get()).data();
    expect(after?.currentRound).toBe(before?.currentRound); // never mutated
    expect(after?.status).toBe(before?.status);
  });

  for (const width of [320, 375, 414]) {
    test(`mobile ${width}px renders the match (capture for wireframe compare)`, async ({
      page,
    }) => {
      // Reset this Voter to a fresh bracket (m0). The FINAL test above left them
      // with a COMPLETED tournament; loading it renders the champion screen
      // (no MatchView → no ".vs-foot"), which is exactly the flake this test
      // hit — deterministically caught here once retries were disabled. (ADR-0004.)
      await resetVoterProgress();
      await page.setViewportSize({ width, height: 800 });
      await page.goto(`/arena/${TID}`);
      await expect(page.getByText("No Vote Rate %")).toBeVisible(); // canonical .vs-foot
      await page.screenshot({
        path: `playwright-report/c1-arena-${width}.png`,
        fullPage: true,
      });
    });
  }
});
