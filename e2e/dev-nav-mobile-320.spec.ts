/**
 * Phase B — Dev Nav mobile 320px E2E (handoff §6/§7, edge case §8 #5).
 *
 * At the narrowest supported width the ⚙️ FAB must stay reachable in the
 * bottom-right and the sheet must open without overflowing the viewport.
 */
import { expect, test } from "@playwright/test";

test.use({ viewport: { width: 320, height: 640 } });

test("320px: FAB anchored bottom-right, sheet opens within viewport", async ({
  page,
}) => {
  await page.goto("/policies/privacy?lang=en");
  await page.evaluate(() => localStorage.setItem("wc48_dev_nav", "1"));
  await page.reload();

  const fab = page.getByTestId("dev-nav-fab");
  await expect(fab).toBeVisible();

  const box = await fab.boundingBox();
  expect(box).not.toBeNull();
  if (box) {
    // Bottom-right: right edge near the 320px viewport, low on screen.
    expect(box.x + box.width).toBeGreaterThan(240);
    expect(box.x + box.width).toBeLessThanOrEqual(320);
    expect(box.y).toBeGreaterThan(320);
  }

  await fab.click();
  const sheet = page.getByTestId("dev-nav-sheet");
  await expect(sheet).toBeVisible();
  const sheetBox = await sheet.boundingBox();
  if (sheetBox) {
    expect(sheetBox.x).toBeGreaterThanOrEqual(0);
    expect(sheetBox.x + sheetBox.width).toBeLessThanOrEqual(320);
  }
});
