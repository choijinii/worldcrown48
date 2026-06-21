/**
 * B-1 The Lab critical-path E2E (handoff §11.2 / §11.4).
 *
 * Flow under test: operator gate → Tournament 생성 → featured 토글 → 삭제.
 *
 * Auth: global-setup hydrates storageState for the OPERATOR account — the
 * preview's NEXT_PUBLIC_ADMIN_UID MUST equal that user's uid or AdminAuthGuard
 * redirects to "/" (see CI secrets in .github/workflows/b1-e2e.yml).
 *
 * The aiFillContestants callable is STUBBED via page.route so the suite never
 * spends a real Claude token and never flakes on model latency (trap #10 ethos
 * extends to CI). Firestore writes are REAL against the preview project; the
 * afterEach cleanup + firebase-admin teardown keep it idempotent.
 *
 * afterEach enforces "Console errors must be 0" (§11.6).
 *
 * NOTE: authored to the D-1 E2E pattern; verified in CI (needs preview +
 * secrets), not on the local box.
 */
import { expect, test, type Page } from "@playwright/test";
import * as admin from "firebase-admin";

let consoleErrors: string[] = [];
const createdTournamentIds: string[] = [];

function loadServiceAccount(): admin.ServiceAccount | null {
  const raw = process.env.FIREBASE_ADMIN_SDK_KEY;
  if (!raw) return null;
  const decoded = raw.trim().startsWith("{")
    ? raw
    : Buffer.from(raw, "base64").toString("utf8");
  return JSON.parse(decoded) as admin.ServiceAccount;
}

function ensureAdmin(): typeof admin | null {
  if (admin.apps.length > 0) return admin;
  const sa = loadServiceAccount();
  if (!sa) return null;
  admin.initializeApp({ credential: admin.credential.cert(sa) });
  return admin;
}

/** 48 fake suggestions matching the aiFillContestants return contract. */
function fakeContestants() {
  return Array.from({ length: 48 }, (_, i) => ({
    name: `E2E Player ${i + 1}`,
    nationality: "KR",
    position: "FW",
    imageSearchKeyword: `e2e player ${i + 1}`,
  }));
}

/** Stub the Firebase callable so no real Claude call happens. */
async function stubAiFill(page: Page) {
  await page.route("**/aiFillContestants*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      // onCall v2 wire format: the SDK reads the top-level `result`.
      body: JSON.stringify({ result: { contestants: fakeContestants() } }),
    });
  });
}

test.use({ viewport: { width: 1600, height: 1000 } }); // ≥1440 (DesktopOnly)

test.beforeEach(async ({ page }) => {
  consoleErrors = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });
});

test.afterEach(async () => {
  expect(consoleErrors, "Console errors must be 0").toHaveLength(0);
});

test.afterAll(async () => {
  const a = ensureAdmin();
  if (!a) return;
  const db = a.firestore();
  for (const id of createdTournamentIds) {
    const cs = await db
      .collection("contestants")
      .where("tournamentId", "==", id)
      .get();
    const batch = db.batch();
    cs.forEach((d) => batch.delete(d.ref));
    batch.delete(db.collection("tournaments").doc(id));
    await batch.commit();
  }
});

test.describe("B-1 The Lab — operator critical path", () => {
  test("operator reaches the console (gate allows admin)", async ({ page }) => {
    await page.goto("/admin/lab");
    await expect(
      page.getByRole("heading", { name: "Tournament 만들기" }),
    ).toBeVisible();
  });

  test("create → featured → delete", async ({ page }) => {
    await stubAiFill(page);
    await page.goto("/admin/lab");

    // Step 1 — title + category enables AI Fill.
    await page.getByLabel("Tournament 제목").fill("E2E Tournament");
    await page.getByLabel("카테고리").selectOption("FOOTBALL");
    const fill = page.getByRole("button", { name: /48명 추천/ });
    await expect(fill).toBeEnabled();
    await fill.click();

    // Step 2 — 48 nodes filled from the stub → Publish enabled.
    await expect(page.getByTestId("contestant-grid")).toBeVisible();
    const publish = page.getByRole("button", { name: /토너먼트 생성 \(48\/48\)/ });
    await expect(publish).toBeEnabled();
    await publish.click();

    // The new Tournament shows in the list.
    const row = page
      .locator('[data-testid^="tournament-row-"]')
      .filter({ hasText: "E2E Tournament" });
    await expect(row).toBeVisible();

    // Record the id for cleanup.
    const testId = await row.getAttribute("data-testid");
    if (testId) createdTournamentIds.push(testId.replace("tournament-row-", ""));

    // featured toggle → star fills.
    await row.getByRole("button", { name: /Feature/ }).click();
    await expect(row.getByRole("button", { name: /★ Featured/ })).toBeVisible();

    // delete → confirm → row gone.
    await row.getByRole("button", { name: "E2E Tournament 삭제" }).click();
    await row.getByRole("button", { name: "삭제 확인" }).click();
    await expect(row).toHaveCount(0);
  });
});
