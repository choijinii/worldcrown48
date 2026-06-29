/**
 * A-1 The Pitch — E2E (handoff §7.2 → AC-1/2/4/5/6/11/15).
 *
 * Per repo convention there is no RTL/jsdom layer; the DOM-level Hard
 * Constraints (no Vote Count / Vote Rate / LIVE / Round labels / CategoryFilter)
 * are verified HERE, plus the route swap and a 3-breakpoint responsive smoke.
 * Every test asserts zero console errors (handoff §11.6).
 *
 * i18n note: the headline strings are bilingual-static (대표 2026-06-29), so
 * they read identically under ?lang=ko and ?lang=en — the lang query is pinned
 * for determinism only ([[feedback-i18n-test-determinism]]).
 */
import { expect, test, type ConsoleMessage } from "@playwright/test";

let consoleErrors: string[] = [];

test.beforeEach(({ page }) => {
  consoleErrors = [];
  page.on("console", (m: ConsoleMessage) => {
    if (m.type() === "error") consoleErrors.push(m.text());
  });
});

test.afterEach(() => {
  expect(consoleErrors, `Console errors:\n${consoleErrors.join("\n")}`).toHaveLength(0);
});

test.describe("A-1 The Pitch", () => {
  test("AC-1: / renders the 5 modules", async ({ page }) => {
    await page.goto("/?lang=ko");
    await expect(page.locator('[aria-label="Primary navigation"]')).toBeVisible();
    await expect(page.getByText("Who wears the")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Trending Tournaments" })).toBeVisible();
    await expect(page.locator('[aria-label="Create Tournament"]')).toBeVisible();
    await expect(page.getByRole("heading", { name: "Around the Pitch" })).toBeVisible();
  });

  test("AC-2: /launch renders the A-0 archive", async ({ page }) => {
    await page.goto("/launch?lang=ko");
    await expect(page.locator("main.lp")).toBeVisible();
  });

  test("AC-4: TournamentCard has no Vote Count / Vote Rate / LIVE", async ({ page }) => {
    await page.goto("/?lang=en");
    await expect(page.getByText(/\d+\s*votes/i)).toHaveCount(0);
    await expect(page.getByText(/\d+%/)).toHaveCount(0);
    await expect(page.getByText(/^LIVE$/i)).toHaveCount(0);
  });

  test("AC-5+AC-6: no CategoryFilter chips, no Round labels", async ({ page }) => {
    await page.goto("/?lang=ko");
    await expect(page.getByRole("button", { name: /^(Football|K-Pop|Anime|Gaming|Movie)$/i })).toHaveCount(0);
    await expect(page.getByText(/ROUND OF (48|24|12|6)/i)).toHaveCount(0);
    await expect(page.getByText(/QUARTERFINAL|SEMIFINAL/i)).toHaveCount(0);
    await expect(page.getByText(/\bFIFA\b/)).toHaveCount(0);
  });

  test("AC-10: AI-Report shows the ✦ footer, never the ● byline", async ({ page }) => {
    await page.goto("/?lang=en");
    // ✦ AI-Report footer is allowed; the ● AI-Report card byline is forbidden.
    await expect(page.getByText("● AI-Report")).toHaveCount(0);
  });

  test("AC-11: 3-breakpoint responsive — feed grid renders at each width", async ({ page }) => {
    for (const width of [320, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/?lang=ko");
      await expect(page.getByRole("heading", { name: "Trending Tournaments" })).toBeVisible();
      await expect(page.locator(".pitch .feed-wrap")).toBeVisible();
    }
  });

  test("Phase F: ☰ opens SiteMapSheet (7 domains, 2 disabled), ESC closes", async ({ page }) => {
    await page.goto("/?lang=ko");
    // One unified dark Navbar — no separate floating Pitch GNB component.
    await expect(page.locator(".pitch .gnb")).toHaveCount(0);

    await page.getByRole("button", { name: "Open site map" }).click();
    const sheet = page.getByRole("dialog", { name: "Site map" });
    await expect(sheet).toBeVisible();

    // 7 domains, with Locker Room + Admin Dashboard disabled.
    await expect(sheet.locator(".wc-sitemap-item")).toHaveCount(7);
    await expect(sheet.locator('.wc-sitemap-item[aria-disabled="true"]')).toHaveCount(2);
    await expect(sheet.getByText("The Pitch")).toBeVisible();
    await expect(sheet.getByText("Admin Dashboard")).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(sheet).toHaveCount(0);
  });
});
