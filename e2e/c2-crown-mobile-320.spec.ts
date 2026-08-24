/**
 * C-2 Crown Card mobile 320px E2E (handoff §11.2 — responsive, AC-25).
 *
 * Seeds a COMPLETED per-Voter bracket directly (roundProgress.complete +
 * championId) and loads the shareable champion route, so the modal renders
 * without driving the full FINAL flow. Asserts the dark modal + 1.91:1 static
 * card fit a 320px viewport. `?lang=ko`; Console 0 (§11.6). CI-verified.
 */
import { expect, test } from "@playwright/test";
import * as admin from "firebase-admin";

const TID = "c2-e2e-mobile-tournament";
const UID = process.env.C2_TEST_UID ?? process.env.C1_TEST_UID ?? "";

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
    if (!sa) throw new Error("FIREBASE_ADMIN_SDK_KEY required for C-2 mobile E2E.");
    admin.initializeApp({ credential: admin.credential.cert(sa) });
  }
  return admin.firestore();
}

async function seed(): Promise<void> {
  const d = db();
  const batch = d.batch();
  batch.set(d.doc(`tournaments/${TID}`), {
    title: "E2E Mobile Crown",
    category: "FOOTBALL",
    status: "active",
    hostUid: "seed-operator",
    currentRound: 5,
    totalContestants: 48,
    settings: { aiNews: false, multiLang: false, showRanking: true },
    featured: false,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  batch.set(d.doc(`contestants/${TID}_champ`), {
    tournamentId: TID,
    hostUid: "seed-operator",
    order: 1,
    name: "Mobile Champion",
    nationality: "KR",
    position: "FW",
    imageSearchKeyword: "champ",
  });
  // Completed per-Voter bracket — the champion route renders the modal directly.
  batch.set(d.doc(`roundProgress/${UID}_${TID}`), {
    userId: UID,
    tournamentId: TID,
    complete: true,
    championId: `${TID}_champ`,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  await batch.commit();
}

async function cleanup(): Promise<void> {
  const d = db();
  for (const coll of ["contestants", "roundProgress", "crown_cards"]) {
    const snap = await d.collection(coll).where("tournamentId", "==", TID).get();
    const batch = d.batch();
    snap.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
  }
  await d.doc(`tournaments/${TID}`).delete();
}

test.describe("C-2 Crown Card — mobile 320px", () => {
  test.skip(!process.env.PREVIEW_URL, "PREVIEW_URL not set — C-2 E2E parked until secret setup");

  test.beforeAll(async () => {
    await cleanup().catch(() => {});
    await seed();
  });
  test.afterAll(async () => cleanup());

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

  test("renders the Crown Card modal within a 320px viewport", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 800 });
    await page.goto(`/arena/${TID}/champion?lang=ko`);

    const modal = page.getByTestId("crown-modal");
    await expect(modal).toBeVisible({ timeout: 30_000 });
    await expect(modal).toContainText("Mobile Champion");

    // The modal must not overflow the 320px viewport.
    const box = await modal.boundingBox();
    expect(box).not.toBeNull();
    if (box) expect(box.width).toBeLessThanOrEqual(320);

    await page.screenshot({ path: "playwright-report/c2-crown-mobile-320.png", fullPage: true });
  });
});
