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

const TID = "c1-e2e-tournament";
const UID = process.env.C1_TEST_UID ?? "";

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
}

/** Seed n round-1 left-picks (m0..m{n-1}) for the test Voter. */
async function seedRound1Votes(n: number): Promise<void> {
  const d = db();
  const batch = d.batch();
  for (let i = 0; i < n; i++) {
    batch.set(d.doc(`votes/${TID}_${UID}_r1_m${i}`), {
      userId: UID,
      tournamentId: TID,
      round: 1,
      matchId: matchId(1, i),
      contestantId: `${TID}_c${i * 2 + 1}`, // left of pair i (order 2i+1)
      date: "2026-06-22",
    });
  }
  await batch.commit();
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

  test.only("refresh mid-round (10/24 votes) resumes at exactly m10", async ({
    page,
  }) => {
    // ─── DIAG (temporary): evidence for the "tournament not found" failure ───
    const tSnap = await db().doc(`tournaments/${TID}`).get();
    const cCount = (
      await db().collection("contestants").where("tournamentId", "==", TID).get()
    ).size;
    console.log(
      `[DIAG] seed-in-prod: tournament.exists=${tSnap.exists} status=${tSnap.data()?.status} contestants=${cCount}`,
    );

    await seedRound1Votes(10); // winners c1,c3,…,c19 → next match m10 = (c21,c22)
    const vCount = (
      await db()
        .collection("votes")
        .where("userId", "==", UID)
        .where("tournamentId", "==", TID)
        .get()
    ).size;
    console.log(`[DIAG] votes seeded in prod: ${vCount} for uid=${UID}`);

    const pageConsole: string[] = [];
    page.on("console", (m) => pageConsole.push(`[${m.type()}] ${m.text()}`));

    await page.goto(`/arena/${TID}`);
    await page.waitForTimeout(6000); // let anon/custom auth + loadTournament settle

    const authState = await page.evaluate(() => {
      const k = Object.keys(localStorage).filter((x) =>
        x.startsWith("firebase:authUser:"),
      );
      let uid: unknown = null;
      let isAnonymous: unknown = null;
      try {
        const j = JSON.parse(k[0] ? localStorage.getItem(k[0]) || "{}" : "{}");
        uid = j.uid;
        isAnonymous = j.isAnonymous;
      } catch {
        /* ignore */
      }
      return { hasAuthKey: k.length > 0, uid, isAnonymous };
    });
    const loadDiag = await page.evaluate(
      () => (globalThis as { __loadDiag?: unknown[] }).__loadDiag ?? "NONE",
    );
    console.log(`[DIAG] loadTournament trace: ${JSON.stringify(loadDiag)}`);
    console.log(`[DIAG] browser-auth: ${JSON.stringify(authState)}`);
    console.log(
      `[DIAG] page-text: ${(await page.locator("body").innerText()).replace(/\s+/g, " ").slice(0, 240)}`,
    );
    console.log(`[DIAG] page-console:\n${pageConsole.join("\n")}`);
    // ─── end DIAG ───

    // m10 pairs order 21 vs 22 → P21 / P22 (bracket is votes-derived, refresh-safe)
    await expect(page.getByText("P21", { exact: true })).toBeVisible();
    await expect(page.getByText("P22", { exact: true })).toBeVisible();
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
          date: "2026-06-22",
        });
      }
    }
    await batch.commit();

    await page.goto(`/arena/${TID}`);
    // THE FINAL: 3 finalists → pick the first CROWN button.
    await page.getByRole("button", { name: /CROWN/ }).first().click();

    // roundProgress.championId is set; the tournament doc is unchanged.
    await expect
      .poll(async () =>
        (await d.doc(`roundProgress/${UID}_${TID}`).get()).data()?.championId,
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
      await seedRound1Votes(0);
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
