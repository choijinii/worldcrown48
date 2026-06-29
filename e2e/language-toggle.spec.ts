/**
 * Phase A — Language Toggle E2E (ADR-0007, handoff §6/§7).
 *
 * Verifies the global 🌐 dropdown in the header: picking a locale rewrites
 * `?lang=`, syncs `<html lang>`, and updates the trigger glyph. Determinism
 * rule [[feedback-i18n-test-determinism]]: every nav hard-codes `?lang=`.
 *
 * No Firestore/auth needed — the toggle sits in the header on every page,
 * signed in or not. Targets the policy page (stable, always has the Navbar).
 */
import { expect, test } from "@playwright/test";

const PAGE = "/policies/privacy";

test("ko → en: dropdown pick rewrites URL + html lang + trigger", async ({
  page,
}) => {
  await page.goto(`${PAGE}?lang=ko`);

  const toggle = page.getByTestId("lang-toggle");
  const trigger = toggle.getByRole("combobox");
  await expect(trigger).toContainText("KO");

  await trigger.click();
  await expect(toggle.getByRole("listbox")).toBeVisible();
  await toggle.getByTestId("lang-option-en").click();

  await expect(page).toHaveURL(/[?&]lang=en/);
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(trigger).toContainText("EN");
});

test("en → ko: keyboard open + arrow + enter", async ({ page }) => {
  await page.goto(`${PAGE}?lang=en`);

  const toggle = page.getByTestId("lang-toggle");
  const trigger = toggle.getByRole("combobox");
  await expect(trigger).toContainText("EN");

  await trigger.focus();
  await trigger.press("Enter"); // open listbox
  await expect(toggle.getByRole("listbox")).toBeVisible();
  await page.keyboard.press("ArrowUp"); // en (idx 1) → ko (idx 0)
  await page.keyboard.press("Enter"); // select ko

  await expect(page).toHaveURL(/[?&]lang=ko/);
  await expect(page.locator("html")).toHaveAttribute("lang", "ko");
  await expect(trigger).toContainText("KO");
});
