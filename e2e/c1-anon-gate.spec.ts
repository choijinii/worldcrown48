/**
 * C-1 daily-participation gate E2E — a signed-in Voter who has already JOINED
 * 5 Tournaments today is blocked when opening a 6th NEW one (HF-1).
 *
 * The old scenario (5 votes in ONE tournament → 6th gated) is obsolete: under
 * the Daily Participation Limit, votes inside an already-joined Tournament are
 * unlimited (the 48-bracket's 46-vote path is the natural cap). Only JOINING a
 * NEW Tournament costs quota, so the gate is exercised with a signed-in Voter
 * whose daily_participation doc already lists 5 Tournaments (handoff §3-9).
 *
 * Uses the default authed storageState (global-setup signs in TEST_UID). We
 * seed daily_participation/`${TEST_UID}_${kstToday}` = 5 ids + a 6th tournament,
 * then the first vote on the 6th trips decideVoteGate → daily_limit → LoginModal.
 *
 * REQUIRES onVote/advanceRound deployed + FIREBASE_ADMIN_SDK_KEY + TEST_UID.
 * console-error-0; test.skip when the preview/secrets are absent.
 */
import { expect, test } from "@playwright/test";
import * as admin from "firebase-admin";

const TID = "hf1-participation-e2e-tournament";
// Five Tournaments already joined today (quota full) — none is TID.
const JOINED_IDS = ["joined-1", "joined-2", "joined-3", "joined-4", "joined-5"];

let consoleErrors: string[] = [];

/** KST day (YYYY-MM-DD) — must match the server's kstDate() doc-id scheme. */
function kstToday(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

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
    if (!sa) throw new Error("FIREBASE_ADMIN_SDK_KEY required for the HF-1 gate E2E.");
    admin.initializeApp({ credential: admin.credential.cert(sa) });
  }
  return admin.firestore();
}

async function seed(uid: string): Promise<void> {
  const d = db();
  const batch = d.batch();
  batch.set(d.doc(`tournaments/${TID}`), {
    title: "Participation Gate Strikers",
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
  // The Voter has already joined 5 Tournaments today → quota full.
  batch.set(d.doc(`daily_participation/${uid}_${kstToday()}`), {
    tournamentIds: JOINED_IDS,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  await batch.commit();
}

async function cleanup(uid: string): Promise<void> {
  const d = db();
  // Reset votes + roundProgress + daily_participation before/after (test isolation).
  for (const coll of ["votes", "contestants", "roundProgress"]) {
    const snap = await d.collection(coll).where("tournamentId", "==", TID).get();
    const batch = d.batch();
    snap.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
  }
  await d.doc(`daily_participation/${uid}_${kstToday()}`).delete().catch(() => {});
  await d.doc(`tournaments/${TID}`).delete();
}

test.describe("C-1 daily-participation gate — 6th NEW Tournament blocked", () => {
  const uid = process.env.TEST_UID;
  test.skip(
    !process.env.PREVIEW_URL || !uid,
    "PREVIEW_URL / TEST_UID not set — HF-1 gate E2E parked until secret setup",
  );

  test.beforeAll(async () => {
    await cleanup(uid!).catch(() => {});
    await seed(uid!);
  });
  test.afterAll(async () => cleanup(uid!));

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

  test("signed-in Voter at 5/5 joins → 6th NEW Tournament opens the daily-limit LoginModal", async ({
    page,
  }) => {
    // Force ko so the daily-limit modal renders the Korean copy asserted below.
    // (App i18n default is EN; headless Chromium reports en-US — ADR-0002 trap a.)
    await page.goto(`/arena/${TID}?lang=ko`);

    // The match renders → the (authed) Voter loaded the 6th Tournament.
    await expect(page.getByTestId("vote-left")).toContainText("P1");

    // First vote on this NEW Tournament is a 6th join → gated before onVote.
    await page.getByTestId("vote-left").click();

    // LoginModal (daily_limit) appears with the HF-1 §6 copy.
    await expect(
      page.getByText(/오늘 참가할 수 있는 Tournament를 모두 사용했어요/),
    ).toBeVisible();
  });
});
