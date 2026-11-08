/** 에뮬레이터 판이 서는지 — 관리자로 편집기를 열고 콘솔 오류 0 (IMAGE-1 PR 1 · Task 11). */
import { expect, test } from "@playwright/test";
import { collectConsoleErrors, expectNoConsoleErrors, resetEmulators, seedCategories, signInAsAdmin } from "./helpers";

test.beforeEach(async () => {
  await resetEmulators();
  await seedCategories();
});

test("관리자로 /admin/lab 편집기가 열린다 · 콘솔 오류 0", async ({ page }) => {
  const errors = collectConsoleErrors(page);
  await page.goto("/admin/lab?lang=ko");
  await signInAsAdmin(page);
  await expect(page.getByLabel("Tournament 제목")).toBeVisible();
  await expectNoConsoleErrors(errors);
});
