/**
 * D-1.1 critical-path E2E.
 *
 * Four flows — one per fix that landed in this PR (handoff §11.2):
 *   1. P1 persistence  — session survives a tab close.
 *   2. P2 logout toast — "로그아웃 됐어요." surfaces for 5 s.
 *   3. P2 modal portal — DeleteAccountModal renders at the same screen
 *      position regardless of entry path.
 *   4. P0 GDPR delete  — Firebase Auth + Firestore actually empty after
 *      the request; audit_log carries a uidHash, never the plaintext uid.
 *
 * The afterEach guard enforces "Console errors must be 0" — a regression
 * tripwire for hydration mismatches and silent Firebase warnings.
 */
import { expect, test } from "@playwright/test";
import * as admin from "firebase-admin";
import * as crypto from "node:crypto";

let consoleErrors: string[] = [];

function loadServiceAccount(): admin.ServiceAccount | null {
  const raw = process.env.FIREBASE_ADMIN_SDK_KEY;
  if (!raw) return null;
  const decoded = raw.trim().startsWith("{")
    ? raw
    : Buffer.from(raw, "base64").toString("utf8");
  return JSON.parse(decoded) as admin.ServiceAccount;
}

function ensureAdmin(): typeof admin {
  if (admin.apps.length === 0) {
    const sa = loadServiceAccount();
    if (!sa) {
      throw new Error(
        "FIREBASE_ADMIN_SDK_KEY required for D-1.1 E2E (Firestore + Auth assertions).",
      );
    }
    admin.initializeApp({ credential: admin.credential.cert(sa) });
  }
  return admin;
}

test.beforeEach(async ({ page }) => {
  consoleErrors = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });
});

test.afterEach(async () => {
  expect(consoleErrors, "Console errors must be 0").toHaveLength(0);
});

test.describe("D-1.1 Fix — 4 critical flows", () => {
  test("1. P1 persistence — 새 탭에서도 아바타 유지 (1초 깜빡임 없음)", async ({
    browser,
  }) => {
    const ctx = await browser.newContext({
      storageState: "tests/.auth/user.json",
    });
    const page = await ctx.newPage();
    await page.goto("/");

    await expect(page.getByTestId("user-avatar")).toBeVisible({ timeout: 5000 });
    await page.waitForTimeout(2000);
    await expect(page.getByTestId("user-avatar")).toBeVisible();
    await expect(
      page.getByRole("button", { name: /sign in/i }),
    ).not.toBeVisible();

    await ctx.close();
  });

  test('2. P2 로그아웃 토스트 — "로그아웃 됐어요." 5초 노출', async ({ page }) => {
    await page.goto("/");

    await page.getByTestId("user-avatar").click();
    await page.getByRole("menuitem", { name: /로그아웃|sign out/i }).click();

    await expect(page.getByText(/로그아웃 됐어요|signed out/i)).toBeVisible({
      timeout: 2000,
    });
    await page.waitForTimeout(4000);
    await expect(page.getByText(/로그아웃 됐어요|signed out/i)).toBeVisible();
    await page.waitForTimeout(2000);
    await expect(
      page.getByText(/로그아웃 됐어요|signed out/i),
    ).not.toBeVisible();
  });

  test("3. P2 DeleteAccountModal — 두 진입 경로 위치 동일", async ({
    page,
  }) => {
    await page.goto("/account");

    await page
      .getByRole("button", { name: /내 데이터 삭제 요청|delete my data/i })
      .click();
    const modalA = page.getByRole("dialog");
    await expect(modalA).toBeVisible();
    const boxA = await modalA.boundingBox();
    expect(boxA).not.toBeNull();
    await page.getByRole("button", { name: /취소|cancel/i }).click();
    await expect(modalA).not.toBeVisible();

    await page.getByTestId("user-avatar").click();
    await page
      .getByRole("menuitem", { name: /내 데이터 삭제 요청|delete my data/i })
      .click();
    const modalB = page.getByRole("dialog");
    await expect(modalB).toBeVisible();
    const boxB = await modalB.boundingBox();
    expect(boxB).not.toBeNull();

    expect(Math.abs(boxA!.x - boxB!.x)).toBeLessThan(2);
    expect(Math.abs(boxA!.y - boxB!.y)).toBeLessThan(2);
    expect(Math.abs(boxA!.width - boxB!.width)).toBeLessThan(2);
    expect(Math.abs(boxA!.height - boxB!.height)).toBeLessThan(2);
  });

  test("4. P0 GDPR 삭제 — 데이터 실제 삭제 + audit uidHash", async ({
    page,
  }) => {
    const testUid = process.env.TEST_UID;
    if (!testUid) throw new Error("TEST_UID required for GDPR scenario.");
    const sdk = ensureAdmin();

    await page.goto("/account");
    await page
      .getByRole("button", { name: /내 데이터 삭제 요청|delete my data/i })
      .click();
    await page.getByPlaceholder("DELETE").fill("DELETE");
    await page
      .getByRole("button", { name: /데이터 삭제 요청|delete my data/i })
      .click();

    await expect(page).toHaveURL(/\/$/, { timeout: 15000 });
    await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible({
      timeout: 5000,
    });
    await expect(
      page.getByText(/요청이 접수됐어요|request received/i),
    ).toBeVisible();

    await expect(sdk.auth().getUser(testUid)).rejects.toThrow(/no user record/i);

    const db = sdk.firestore();
    expect((await db.collection("users").doc(testUid).get()).exists).toBe(
      false,
    );
    expect(
      (await db.collection("votes").where("userId", "==", testUid).get()).size,
    ).toBe(0);
    expect(
      (await db.collection("cookieConsents").doc(testUid).get()).exists,
    ).toBe(false);
    expect((await db.collection("userPrefs").doc(testUid).get()).exists).toBe(
      false,
    );

    const uidHash = crypto.createHash("sha256").update(testUid).digest("hex");
    expect(uidHash).toHaveLength(64);
    const audit = await db
      .collection("auditLog")
      .where("uidHash", "==", uidHash)
      .get();
    expect(audit.size).toBeGreaterThanOrEqual(1);
    expect(audit.docs[0].data().uid).toBeUndefined();
  });
});
