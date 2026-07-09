/**
 * HF-3 Guest Run E2E (handoff §5 Phase 4). Four scenarios:
 *
 *   E2E-1  completed guest run → sign in → lands on /arena/{tid}/champion, the
 *          whole run (votes + bracket_seed + roundProgress + Crown Card +
 *          daily_participation) migrated to the new uid, anon account deleted.
 *   E2E-4  mid-progress guest run → sign in → bracket + progress preserved, NO
 *          landing (continues in place, AC5).
 *   E2E-2  completed guest → a SECOND Tournament → LoginModal (one run only).
 *   E2E-3  guest who joined Tournament A → votes in B → LoginModal.
 *
 * Google OAuth can't be driven headlessly, so the two link scenarios use the
 * signed-in storageState Voter (TEST_UID) as the "new" account and an
 * admin-created ANONYMOUS account (createUser with no providers → providerData
 * empty, which is what linkSessionVote treats as anonymous) as the guest run.
 * The link is armed exactly as the app does it — sessionStorage
 * PENDING_ANON_UID_KEY + an onAuthStateChanged tick (page reload) — so
 * AuthProvider.linkPendingVote runs the real callable.
 *
 * The two gate scenarios use a FRESH anonymous browser context (no storageState)
 * so the app's ensureAnonymousUid signs the visitor in anonymously; the anon uid
 * is recovered from localStorage and seeded via admin.
 *
 * REQUIRES PREVIEW_URL + FIREBASE_ADMIN_SDK_KEY + TEST_UID +
 * NEXT_PUBLIC_FIREBASE_API_KEY (+ VERCEL_AUTOMATION_BYPASS_SECRET on a Protected
 * preview). console-error-0. Authored to the C-1/D-1 E2E pattern; verified in CI.
 */
import { expect, test, type Browser, type BrowserContext, type Page } from "@playwright/test";
import * as admin from "firebase-admin";
import { round1OrderedIds } from "@/lib/arena/matches";

const TID_A = "hf3-guest-e2e-a";
const TID_B = "hf3-guest-e2e-b";
const GOOGLE_UID = process.env.TEST_UID ?? "";
const API_KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "";
const BYPASS = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
const PREVIEW = process.env.PREVIEW_URL ?? "";
const PENDING_ANON_UID_KEY = "wc48_pending_anon_uid";
const E2E_SEED = 1;
const SEED_PAST_DATE = "2020-01-01"; // invisible to today's daily-limit query

let consoleErrors: string[] = [];

function loadServiceAccount(): admin.ServiceAccount | null {
  const raw = process.env.FIREBASE_ADMIN_SDK_KEY;
  if (!raw) return null;
  const decoded = raw.trim().startsWith("{") ? raw : Buffer.from(raw, "base64").toString("utf8");
  return JSON.parse(decoded) as admin.ServiceAccount;
}
function ensureAdmin(): typeof admin {
  if (admin.apps.length === 0) {
    const sa = loadServiceAccount();
    if (!sa) throw new Error("FIREBASE_ADMIN_SDK_KEY required for HF-3 Guest Run E2E.");
    admin.initializeApp({ credential: admin.credential.cert(sa) });
  }
  return admin;
}
function db(): admin.firestore.Firestore {
  return ensureAdmin().firestore();
}
function kstToday(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}
function matchId(tid: string, round: number, i: number): string {
  return `${tid}:r${round}:m${i}`;
}
/** The seeded round-1 contestant-id order for E2E_SEED (id = `${tid}_c${order}`). */
function seededRound1Ids(tid: string): string[] {
  const contestants = Array.from({ length: 48 }, (_, i) => ({ id: `${tid}_c${i + 1}`, order: i + 1 }));
  return round1OrderedIds(contestants, E2E_SEED);
}

async function seedTournament(tid: string): Promise<void> {
  const d = db();
  const batch = d.batch();
  batch.set(d.doc(`tournaments/${tid}`), {
    title: `Guest Run ${tid}`,
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
    batch.set(d.doc(`contestants/${tid}_c${i}`), {
      tournamentId: tid,
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
}

/** Seed a guest run for `uid` up to a progress point (votes are bracket-derived). */
async function seedGuestRun(
  uid: string,
  tid: string,
  opts: { rounds: Array<[number, number]>; complete?: boolean; championId?: string; toRound?: number },
): Promise<void> {
  const d = db();
  const batch = d.batch();
  const ids = seededRound1Ids(tid);
  for (const [round, count] of opts.rounds) {
    for (let i = 0; i < count; i++) {
      batch.set(d.doc(`votes/${tid}_${uid}_r${round}_m${i}`), {
        userId: uid,
        tournamentId: tid,
        round,
        matchId: matchId(tid, round, i),
        contestantId: round === 1 ? ids[i * 2] : `${tid}_c${i + 1}`,
        date: SEED_PAST_DATE,
      });
    }
  }
  batch.set(d.doc(`bracket_seeds/${uid}_${tid}`), {
    seed: E2E_SEED,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  batch.set(
    d.doc(`roundProgress/${uid}_${tid}`),
    opts.complete
      ? { userId: uid, tournamentId: tid, complete: true, championId: opts.championId ?? `${tid}_c1`, updatedAt: admin.firestore.FieldValue.serverTimestamp() }
      : { userId: uid, tournamentId: tid, fromRound: 1, toRound: opts.toRound ?? 2, updatedAt: admin.firestore.FieldValue.serverTimestamp() },
  );
  batch.set(d.doc(`daily_participation/${uid}_${kstToday()}`), {
    tournamentIds: [tid],
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  await batch.commit();
}

async function deleteVoterState(uid: string, tid: string): Promise<void> {
  const d = db();
  const snap = await d.collection("votes").where("userId", "==", uid).where("tournamentId", "==", tid).get();
  const batch = d.batch();
  snap.forEach((doc) => batch.delete(doc.ref));
  await batch.commit();
  await d.doc(`roundProgress/${uid}_${tid}`).delete().catch(() => {});
  await d.doc(`bracket_seeds/${uid}_${tid}`).delete().catch(() => {});
  await d.doc(`crown_cards/${uid}_${tid}`).delete().catch(() => {});
  await d.doc(`daily_participation/${uid}_${kstToday()}`).delete().catch(() => {});
}

async function cleanupTournament(tid: string): Promise<void> {
  const d = db();
  for (const coll of ["votes", "contestants", "roundProgress", "crown_cards"]) {
    const snap = await d.collection(coll).where("tournamentId", "==", tid).get();
    const batch = d.batch();
    snap.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
  }
  await d.doc(`tournaments/${tid}`).delete().catch(() => {});
}

/** Create a phantom anonymous account (no providers) to stand in for a guest. */
async function createAnonAccount(): Promise<string> {
  const rec = await ensureAdmin().auth().createUser({});
  return rec.uid;
}
async function deleteUserQuietly(uid: string): Promise<void> {
  await ensureAdmin().auth().deleteUser(uid).catch(() => {});
}

/** Arm + fire the app's real link path for the already-signed-in Voter. */
async function triggerLink(page: Page, anonUid: string): Promise<void> {
  await page.goto("/");
  await page.evaluate(
    ({ key, uid }) => sessionStorage.setItem(key, uid),
    { key: PENDING_ANON_UID_KEY, uid: anonUid },
  );
  await page.reload();
}

/** A fresh anonymous browser context (bypasses Vercel Preview Protection). */
async function anonContext(browser: Browser): Promise<BrowserContext> {
  const context = await browser.newContext({ storageState: { cookies: [], origins: [] } });
  if (BYPASS) {
    const p = await context.newPage();
    await p.goto(`${PREVIEW}?x-vercel-protection-bypass=${encodeURIComponent(BYPASS)}&x-vercel-set-bypass-cookie=true`);
    await p.close();
  }
  return context;
}
/** Recover the app's anonymous uid from the persisted Firebase auth blob. */
async function anonUidFrom(page: Page): Promise<string> {
  const key = `firebase:authUser:${API_KEY}:[DEFAULT]`;
  let uid = "";
  await expect
    .poll(
      async () => {
        uid = await page.evaluate((k) => {
          const raw = localStorage.getItem(k);
          return raw ? (JSON.parse(raw).uid as string) : "";
        }, key);
        return uid;
      },
      { timeout: 10_000 },
    )
    .toBeTruthy();
  return uid;
}

test.describe("HF-3 Guest Run", () => {
  test.skip(
    !process.env.PREVIEW_URL || !GOOGLE_UID || !API_KEY,
    "PREVIEW_URL / TEST_UID / NEXT_PUBLIC_FIREBASE_API_KEY not set — HF-3 E2E parked until secrets",
  );

  test.beforeAll(async () => {
    await cleanupTournament(TID_A).catch(() => {});
    await cleanupTournament(TID_B).catch(() => {});
    await seedTournament(TID_A);
    await seedTournament(TID_B);
  });
  test.afterAll(async () => {
    await cleanupTournament(TID_A);
    await cleanupTournament(TID_B);
    await deleteVoterState(GOOGLE_UID, TID_A);
    await deleteVoterState(GOOGLE_UID, TID_B);
  });

  test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    page.on("console", (m) => {
      if (m.type() !== "error") return;
      const t = m.text();
      if (t.includes("Could not reach Cloud Firestore backend")) return;
      consoleErrors.push(t);
    });
  });
  test.afterEach(async () => {
    expect(consoleErrors, "Console errors must be 0").toHaveLength(0);
  });

  test("E2E-1: completed guest run → link → Champion landing + full migration", async ({ page }) => {
    const d = db();
    await deleteVoterState(GOOGLE_UID, TID_A); // start clean → googleExists=false
    const anonUid = await createAnonAccount();
    try {
      await seedGuestRun(anonUid, TID_A, {
        rounds: [[1, 24], [2, 12], [3, 6], [4, 3], [5, 1]],
        complete: true,
        championId: `${TID_A}_c1`,
      });

      await triggerLink(page, anonUid);

      // W6: lands on the shareable Crown Card page.
      await expect(page).toHaveURL(new RegExp(`/arena/${TID_A}/champion`), { timeout: 15_000 });

      // roundProgress re-fired under the Google uid (Option A 2-stage).
      await expect
        .poll(async () => (await d.doc(`roundProgress/${GOOGLE_UID}_${TID_A}`).get()).data()?.complete, { timeout: 20_000 })
        .toBe(true);
      const rp = (await d.doc(`roundProgress/${GOOGLE_UID}_${TID_A}`).get()).data();
      expect(rp?.championId).toBe(`${TID_A}_c1`);

      // bracket seed carried (no reshuffle), daily participation merged, anon gone.
      expect((await d.doc(`bracket_seeds/${GOOGLE_UID}_${TID_A}`).get()).exists).toBe(true);
      const part = (await d.doc(`daily_participation/${GOOGLE_UID}_${kstToday()}`).get()).data();
      expect(part?.tournamentIds).toContain(TID_A);
      await expect(ensureAdmin().auth().getUser(anonUid)).rejects.toThrow(/no user record/i);

      // Crown Card regenerated for the new uid (async trigger).
      await expect
        .poll(async () => (await d.doc(`crown_cards/${GOOGLE_UID}_${TID_A}`).get()).exists, { timeout: 30_000 })
        .toBe(true);
    } finally {
      await deleteUserQuietly(anonUid);
    }
  });

  test("E2E-4: mid-progress guest run → link → bracket preserved, no landing (AC5)", async ({ page }) => {
    const d = db();
    await deleteVoterState(GOOGLE_UID, TID_A);
    const anonUid = await createAnonAccount();
    try {
      await seedGuestRun(anonUid, TID_A, { rounds: [[1, 24]], toRound: 2 }); // completed round 1 only

      await triggerLink(page, anonUid);

      // Progress copied to the new uid…
      await expect
        .poll(async () => (await d.doc(`roundProgress/${GOOGLE_UID}_${TID_A}`).get()).data()?.toRound, { timeout: 20_000 })
        .toBe(2);
      expect((await d.doc(`roundProgress/${GOOGLE_UID}_${TID_A}`).get()).data()?.complete).not.toBe(true);
      expect((await d.doc(`bracket_seeds/${GOOGLE_UID}_${TID_A}`).get()).exists).toBe(true);

      // …and it did NOT navigate to the Champion page (mid-progress stays put).
      await page.waitForTimeout(1500);
      expect(page.url()).not.toContain("/champion");
    } finally {
      await deleteUserQuietly(anonUid);
    }
  });

  test("E2E-5: guest re-completes a Tournament the account ALREADY finished → conflict (votes deleted, existing card + banner)", async ({ page }) => {
    // HF-3.1 case 2. The account already finished A (champion c2 — the OLD card).
    // The guest completes A again with a DIFFERENT champion (c1). The link must:
    // keep the existing card (Google wins), DELETE the guest votes (no double
    // vote → no Vote Rate skew), and raise the "already finished" banner.
    const d = db();
    await deleteVoterState(GOOGLE_UID, TID_A);
    const anonUid = await createAnonAccount();
    try {
      await seedGuestRun(GOOGLE_UID, TID_A, {
        rounds: [[1, 24], [2, 12], [3, 6], [4, 3], [5, 1]],
        complete: true,
        championId: `${TID_A}_c2`, // the EXISTING champion
      });
      await seedGuestRun(anonUid, TID_A, {
        rounds: [[1, 24], [2, 12], [3, 6], [4, 3], [5, 1]],
        complete: true,
        championId: `${TID_A}_c1`, // the guest's (to-be-discarded) champion
      });

      await triggerLink(page, anonUid);

      // Lands on the EXISTING card (a `complete` `existing` entry, W2 fallback).
      await expect(page).toHaveURL(new RegExp(`/arena/${TID_A}/champion`), { timeout: 15_000 });

      // The existing roundProgress wins — the champion stays c2, NOT overwritten
      // by the guest's c1 (Google data wins, §8 Edge #1).
      const rp = (await d.doc(`roundProgress/${GOOGLE_UID}_${TID_A}`).get()).data();
      expect(rp?.championId).toBe(`${TID_A}_c2`);

      // The guest votes were DELETED (not re-parented) — nothing left under the
      // anon uid, and the Google uid keeps only its own original run.
      await expect
        .poll(async () => (await d.collection("votes").where("userId", "==", anonUid).get()).size, { timeout: 20_000 })
        .toBe(0);

      // The "already finished" banner is shown (ko or en).
      await expect(
        page.getByText(/already finished this Tournament|이미 이 계정으로 완주/),
      ).toBeVisible({ timeout: 10_000 });

      // Anon account tidied up.
      await expect(ensureAdmin().auth().getUser(anonUid)).rejects.toThrow(/no user record/i);
    } finally {
      await deleteUserQuietly(anonUid);
    }
  });

  test("E2E-3: a guest who joined Tournament A is gated in Tournament B (LoginModal)", async ({ browser }) => {
    const context = await anonContext(browser);
    const page = await context.newPage();
    try {
      // Join A with one real vote (sets the Guest Run marker + creates the seed).
      await page.goto(`/arena/${TID_A}?lang=ko`);
      await expect(page.getByTestId("vote-left")).toBeVisible({ timeout: 15_000 });
      await page.getByTestId("vote-left").click();
      await expect(page.getByTestId("vote-left")).not.toBeVisible({ timeout: 15_000 }); // advanced

      // Attempt B → the one-Tournament rule opens the LoginModal (reason: vote).
      await page.goto(`/arena/${TID_B}?lang=ko`);
      await expect(page.getByTestId("vote-left")).toBeVisible({ timeout: 15_000 });
      await page.getByTestId("vote-left").click();
      await expect(page.getByText(/계속하려면 로그인이 필요해요/)).toBeVisible();
    } finally {
      const anonUid = await anonUidFrom(page).catch(() => "");
      await context.close();
      if (anonUid) {
        await deleteVoterState(anonUid, TID_A);
        await deleteUserQuietly(anonUid);
      }
    }
  });

  test("E2E-2: a guest who COMPLETED a run is gated in a second Tournament (LoginModal)", async ({ browser }) => {
    const context = await anonContext(browser);
    const page = await context.newPage();
    let anonUid = "";
    try {
      // Establish the anon session, then seed a COMPLETED run on A for that uid.
      await page.goto(`/arena/${TID_A}?lang=ko`);
      anonUid = await anonUidFrom(page);
      await seedGuestRun(anonUid, TID_A, {
        rounds: [[1, 24], [2, 12], [3, 6], [4, 3], [5, 1]],
        complete: true,
        championId: `${TID_A}_c1`,
      });

      // A different Tournament → gated. (The marker is A; B ≠ A, and the run is
      // complete — either branch of decideVoteGate returns login_required.)
      await page.goto(`/arena/${TID_B}?lang=ko`);
      await expect(page.getByTestId("vote-left")).toBeVisible({ timeout: 15_000 });
      await page.getByTestId("vote-left").click();
      await expect(page.getByText(/계속하려면 로그인이 필요해요/)).toBeVisible();
    } finally {
      await context.close();
      if (anonUid) {
        await deleteVoterState(anonUid, TID_A);
        await deleteUserQuietly(anonUid);
      }
    }
  });
});
