/**
 * C-2 Crown Card critical-path E2E (handoff §11.2 — AC-1..10, 20, 25).
 *
 * Covers the CLIENT flow only (the modal opening depends on advanceRound, which
 * is already deployed; onChampionConfirmed writing crown_cards is covered by the
 * rules tests + cores and verified post-deploy). Flow: seed the Voter to THE
 * FINAL → pick the Champion → Crown Card modal auto-opens → open the share menu →
 * toggle format → download → toast. `?lang=ko` forces deterministic copy
 * ([[feedback-i18n-test-determinism]]); afterEach enforces Console 0 (§11.6).
 *
 * Authored to the C-1 E2E pattern; verified in CI (needs preview + secrets),
 * not locally.
 */
import { expect, test } from "@playwright/test";
import * as admin from "firebase-admin";

const TID = "c2-e2e-tournament";
const UID = process.env.C2_TEST_UID ?? process.env.C1_TEST_UID ?? "";
const SEED_PAST_DATE = "2020-01-01"; // never counts toward daily-5 ([[feedback-seed-date-anti-pattern]])

let consoleErrors: string[] = [];

function loadServiceAccount(): admin.ServiceAccount | null {
  const raw = process.env.FIREBASE_ADMIN_SDK_KEY;
  if (!raw) return null;
  const decoded = raw.trim().startsWith("{") ? raw : Buffer.from(raw, "base64").toString("utf8");
  return JSON.parse(decoded) as admin.ServiceAccount;
}
function db(): admin.firestore.Firestore {
  if (admin.apps.length === 0) {
    const sa = loadServiceAccount();
    if (!sa) throw new Error("FIREBASE_ADMIN_SDK_KEY required for C-2 E2E.");
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
    title: "E2E Crown Strikers",
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

/** Seed rounds 1-4 complete (24+12+6+3 = 45 left-picks) → Voter is at THE FINAL. */
async function seedToFinal(): Promise<void> {
  const d = db();
  const batch = d.batch();
  for (const [round, count] of [[1, 24], [2, 12], [3, 6], [4, 3]] as const) {
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
}

/** Reset this Voter's bracket (votes + roundProgress) ([[feedback-test-isolation-per-voter]]). */
async function resetVoterProgress(): Promise<void> {
  const d = db();
  const snap = await d.collection("votes").where("userId", "==", UID).where("tournamentId", "==", TID).get();
  const batch = d.batch();
  snap.forEach((doc) => batch.delete(doc.ref));
  await batch.commit();
  await d.doc(`roundProgress/${UID}_${TID}`).delete().catch(() => {});
}

async function cleanup(): Promise<void> {
  const d = db();
  for (const coll of ["votes", "contestants", "roundProgress", "crown_cards"]) {
    const snap = await d.collection(coll).where("tournamentId", "==", TID).get();
    const batch = d.batch();
    snap.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
  }
  await d.doc(`tournaments/${TID}`).delete();
}

test.describe("C-2 Crown Card — Voter share flow", () => {
  test.skip(!process.env.PREVIEW_URL, "PREVIEW_URL not set — C-2 E2E parked until secret setup");

  test.beforeAll(async () => {
    await cleanup().catch(() => {});
    await seedTournament();
  });
  test.afterAll(async () => cleanup());

  test.beforeEach(async ({ page }) => {
    await resetVoterProgress();
    await seedToFinal();
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

  test("final pick → Crown Card modal auto-opens → format toggle → download → toast", async ({ page }) => {
    await page.goto(`/arena/${TID}?lang=ko`);

    // THE FINAL: pick the first Champion (CROWN button).
    await page.getByRole("button", { name: /CROWN/ }).first().click();

    // advanceRound (Eventarc) writes championId; the client modal then auto-opens.
    await expect
      .poll(async () => (await db().doc(`roundProgress/${UID}_${TID}`).get()).data()?.championId, { timeout: 30_000 })
      .toBeTruthy();

    const modal = page.getByTestId("crown-modal");
    await expect(modal).toBeVisible({ timeout: 30_000 });
    await expect(modal).toContainText("Your Crown is"); // AC-2 ready head

    // Open the share menu (Instagram) → format chips appear (AC-3).
    await page.getByRole("button", { name: "Open share menu" }).click();
    const chips = page.getByRole("group", { name: "Share format" });
    await expect(chips).toBeVisible();

    // Toggle to Feed (4:5) → dimension label updates (AC-4).
    await chips.getByRole("button", { name: /Feed/ }).click();
    await expect(page.getByText("1080 × 1350 px · PNG")).toBeVisible();

    // Download → "PNG 저장 완료 · feed" toast (AC-5, AC-20 ko).
    const download = page.waitForEvent("download").catch(() => null);
    await page.getByRole("button", { name: "Download" }).click();
    await expect(page.getByText(/PNG 저장 완료/)).toBeVisible();
    await download;
  });
});
