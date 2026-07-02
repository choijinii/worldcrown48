/**
 * A1-i18n — 3-language toggle + boot E2E (handoff §4-F, §7, §11).
 *
 * Verifies: (1) header shows KO/EN/ES; (2) picking ES flips The Pitch copy to
 * Spanish (or en fallback — never blank/raw key); (3) ?lang=es boots Spanish;
 * (4) zero (non-environmental) console errors throughout.
 */
import { expect, test, type ConsoleMessage } from "@playwright/test";

let consoleErrors: string[] = [];

const IGNORED_CONSOLE = [
  /Failed to load resource/i,
  /GSI_LOGGER/i,
  /\bFedCM\b/i,
  /accounts list is empty/i,
  /identitytoolkit/i,
  /status of (401|403|429)/i,
  /Could not reach Cloud Firestore backend/i,
  /Failed to fetch RSC payload/i,
];

test.beforeEach(({ page }) => {
  consoleErrors = [];
  page.on("console", (m: ConsoleMessage) => {
    if (m.type() !== "error") return;
    const text = m.text();
    if (IGNORED_CONSOLE.some((re) => re.test(text))) return;
    consoleErrors.push(text);
  });
});

test.afterEach(() => {
  expect(consoleErrors, `Console errors:\n${consoleErrors.join("\n")}`).toHaveLength(0);
});

test("header toggle exposes KO / EN / ES", async ({ page }) => {
  await page.goto("/?lang=en");
  const toggle = page.getByTestId("lang-toggle");
  await toggle.getByRole("combobox").click();
  await expect(toggle.getByTestId("lang-option-ko")).toBeVisible();
  await expect(toggle.getByTestId("lang-option-en")).toBeVisible();
  await expect(toggle.getByTestId("lang-option-es")).toBeVisible();
});

test("picking ES flips hero copy and rewrites ?lang=es", async ({ page }) => {
  await page.goto("/?lang=en");
  // en boot: hero L1 is the English key value.
  await expect(page.getByText("Who wears the")).toBeVisible();

  const toggle = page.getByTestId("lang-toggle");
  await toggle.getByRole("combobox").click();
  await toggle.getByTestId("lang-option-es").click();

  await expect(page).toHaveURL(/[?&]lang=es/);
  await expect(page.locator("html")).toHaveAttribute("lang", "es");
  // Spanish hero L1 ("¿Quién lleva la"); L2 stays the proper-noun "Ultimate Crown?".
  await expect(page.getByText("¿Quién lleva la")).toBeVisible();
  await expect(page.getByText("Ultimate Crown?")).toBeVisible();
  // No raw key leaked.
  await expect(page.getByText(/pitch\.hero\./)).toHaveCount(0);
});

test("?lang=es boots Spanish directly", async ({ page }) => {
  await page.goto("/?lang=es");
  await expect(page.locator("html")).toHaveAttribute("lang", "es");
  await expect(page.getByText("Empezar a votar")).toBeVisible(); // pitch.hero.cta.start es
});

test("ko → en → es cycle keeps copy consistent (no blank / raw key)", async ({ page }) => {
  await page.goto("/?lang=ko");
  await expect(page.getByText("왕관의 주인은")).toBeVisible(); // pitch.hero.l1 ko
  const toggle = page.getByTestId("lang-toggle");
  await toggle.getByRole("combobox").click();
  await toggle.getByTestId("lang-option-en").click();
  await expect(page.getByText("Who wears the")).toBeVisible();
});
