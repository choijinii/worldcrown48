/**
 * Phase B — Dev Nav E2E (ADR-0008, handoff §6/§7).
 *
 * Activation is localStorage `wc48_dev_nav` (Cmd/Ctrl+Shift+D writes it); E2E
 * triggers it directly via localStorage + reload — the recommended path in
 * ADR-0008 (keyboard combos are flaky across OS in headless Chromium).
 *
 * No Firestore/auth needed — Dev Nav is a global overlay. Determinism rule:
 * nav with `?lang=en` [[feedback-i18n-test-determinism]].
 */
import { expect, test } from "@playwright/test";

async function enableDevNav(page: import("@playwright/test").Page) {
  await page.goto("/policies/privacy?lang=en");
  await page.evaluate(() => localStorage.setItem("wc48_dev_nav", "1"));
  await page.reload();
}

test("hidden by default (no localStorage flag)", async ({ page }) => {
  await page.goto("/policies/privacy?lang=en");
  await expect(page.getByTestId("dev-nav-fab")).toHaveCount(0);
});

test("activated: ⚙️ FAB appears, opens sheet with 7 domains", async ({
  page,
}) => {
  await enableDevNav(page);

  const fab = page.getByTestId("dev-nav-fab");
  await expect(fab).toBeVisible();

  await fab.click();
  const sheet = page.getByTestId("dev-nav-sheet");
  await expect(sheet).toBeVisible();

  // 7 domain rows; Locker Room is the disabled one.
  await expect(sheet.locator('[data-testid^="dev-nav-link-"]')).toHaveCount(7);
  await expect(page.getByTestId("dev-nav-link-launch-pad")).toHaveAttribute(
    "href",
    "/",
  );
  const locker = page.getByTestId("dev-nav-link-locker-room");
  await expect(locker).toHaveAttribute("aria-disabled", "true");
});

test("sheet closes after navigating to a domain", async ({ page }) => {
  await enableDevNav(page);
  await page.getByTestId("dev-nav-fab").click();
  await expect(page.getByTestId("dev-nav-sheet")).toBeVisible();

  await page.getByTestId("dev-nav-link-account").click();
  await expect(page).toHaveURL(/\/account/);
  // FAB persists across routes; the sheet is closed (aria-hidden).
  await expect(page.getByTestId("dev-nav-sheet")).toHaveAttribute(
    "aria-hidden",
    "true",
  );
});
