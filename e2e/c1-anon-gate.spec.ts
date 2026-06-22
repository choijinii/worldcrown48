/**
 * C-1 anon-gate E2E — guest votes 1–5, then the 6th opens the LoginModal.
 *
 * No stored auth (`storageState` empty): on /arena the app issues an ANONYMOUS
 * Firebase uid (ensureAnonymousUid via CookieConsentProvider), so onVote works
 * and the daily-5 limit applies to that anon uid. The 6th attempt trips
 * decideVoteGate → daily_limit → LoginModal renders.
 *
 * REQUIRES onVote/advanceRound deployed to the preview's Firebase project
 * (votes must really persist for the daily count). Seeds its own tournament via
 * firebase-admin; console-error-0; test.skip(!PREVIEW_URL).
 */
import { expect, test } from "@playwright/test";
import * as admin from "firebase-admin";

const TID = "c1-anon-e2e-tournament";

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
    if (!sa) throw new Error("FIREBASE_ADMIN_SDK_KEY required for C-1 anon-gate E2E.");
    admin.initializeApp({ credential: admin.credential.cert(sa) });
  }
  return admin.firestore();
}

async function seedTournament(): Promise<void> {
  const d = db();
  const batch = d.batch();
  batch.set(d.doc(`tournaments/${TID}`), {
    title: "Anon Gate Strikers",
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

async function cleanup(): Promise<void> {
  const d = db();
  for (const coll of ["votes", "contestants"]) {
    const snap = await d.collection(coll).where("tournamentId", "==", TID).get();
    const batch = d.batch();
    snap.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
  }
  await d.doc(`tournaments/${TID}`).delete();
}

test.describe("C-1 anon-gate — guest 5 votes → 6th LoginModal", () => {
  test.skip(
    !process.env.PREVIEW_URL,
    "PREVIEW_URL not set — C-1 anon-gate parked until secret setup",
  );

  // Anonymous: no hydrated auth state.
  test.use({ storageState: { cookies: [], origins: [] } });

  test.beforeAll(async () => {
    await cleanup().catch(() => {});
    await seedTournament();
  });
  test.afterAll(async () => cleanup());

  test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    page.on("console", (m) => m.type() === "error" && consoleErrors.push(m.text()));
  });
  test.afterEach(async () => {
    expect(consoleErrors, "Console errors must be 0").toHaveLength(0);
  });

  test("anonymous Voter: 5 votes process, 6th opens the daily-limit LoginModal", async ({
    page,
  }) => {
    await page.goto(`/arena/${TID}`);

    // The match rendering proves the anonymous uid was issued + tournament loaded.
    await expect(page.getByText("P1", { exact: true })).toBeVisible();

    // Votes 1–5 (left-pick): m0..m4 lefts are P1,P3,P5,P7,P9. Each click → onVote
    // → next match, advancing the per-Voter bracket.
    const leftNames = ["P1", "P3", "P5", "P7", "P9"];
    for (const name of leftNames) {
      await expect(page.getByText(name, { exact: true })).toBeVisible();
      await page.getByTestId("vote-left").click();
    }

    // 6th match is m5 = (P11, P12); the 6th vote attempt must be gated.
    await expect(page.getByText("P11", { exact: true })).toBeVisible();
    await page.getByTestId("vote-left").click();

    // LoginModal (daily_limit) appears — "오늘의 투표를 모두 사용했어요 (5/5)".
    await expect(page.getByText(/오늘의 투표를 모두 사용했어요/)).toBeVisible();
  });
});
