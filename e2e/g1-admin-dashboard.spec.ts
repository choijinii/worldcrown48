/**
 * G-1 Admin Dashboard critical-path E2E (handoff §7, §11.4, §11.6).
 *
 * Auth: global-setup hydrates storageState for the OPERATOR (TEST_UID). The
 * preview's NEXT_PUBLIC_ADMIN_UID MUST equal TEST_UID or AdminAuthGuardLight
 * redirects to "/" (CI secrets in .github/workflows/g1-e2e.yml). The
 * getAdminKpis / listAdminAlerts callables are STUBBED via page.route so the
 * suite is deterministic and never depends on live Firestore data.
 *
 * afterEach enforces "Console errors must be 0" (§11.6).
 *
 * Parked (test.skip) until a real G-1 preview + secrets exist — same pattern as
 * b1-admin-lab.spec.ts so CI stays green pre-merge.
 */
import { expect, test, type Page } from "@playwright/test";
import type { KpiSnapshot } from "@/lib/admin/dashboard/types";

let consoleErrors: string[] = [];

const NOW = Date.now();
const HOUR = 60 * 60_000;

/** A fully-populated KPI snapshot so the cards/chart render real values. */
function fakeKpis(): KpiSnapshot {
  return {
    totalVotes: { value: 2_841_920, deltaPct: 12.4, deltaAbs: 1000, dir: "up" },
    activeVoters: { value: 14_820, deltaPct: 3.1, deltaAbs: 400, dir: "up" },
    voteSpeed: { value: 287, deltaPct: 0, deltaAbs: 0, dir: "flat" },
    abuseWarnings: { value: 7, deltaPct: null, deltaAbs: 2, dir: "down" },
    roundStatus: {
      activeCount: 3,
      distribution: [
        { round: 2, count: 1 },
        { round: 3, count: 1 },
        { round: 5, count: 1 },
      ],
      nextDeadlineMs: NOW + 5 * 24 * HOUR,
    },
    chart: {
      series: Array.from({ length: 24 }, (_, i) => ({
        hourMs: NOW - (23 - i) * HOUR,
        votes: 100 + i * 12,
      })),
      total24h: 412_330,
      peakHourMs: NOW - 3 * HOUR,
      peakVotes: 17_840,
      nowRate: 17_220,
    },
    generatedAtMs: NOW,
  };
}

function fakeAlerts() {
  return {
    alerts: [
      { id: "a-high", type: "T-3", detail: "Bot pattern suspected", tournamentId: "t1", createdAtMs: NOW - 2 * 60_000, resolved: false, severity: "high" },
      { id: "a-med", type: "T-1", detail: "Lead at 61%", tournamentId: "t1", createdAtMs: NOW - 18 * 60_000, resolved: false, severity: "medium" },
      { id: "a-low", type: "T-4", detail: "Rank jump 4→2", tournamentId: "t1", createdAtMs: NOW - 55 * 60_000, resolved: false, severity: "low" },
    ],
  };
}

/** Stub both callables so the dashboard renders deterministic data. */
async function stubCallables(page: Page) {
  await page.route("**/getAdminKpis*", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ result: fakeKpis() }) }),
  );
  await page.route("**/listAdminAlerts*", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ result: fakeAlerts() }) }),
  );
}

test.use({ viewport: { width: 1600, height: 1000 } }); // ≥1440 primary

test.beforeEach(async ({ page }) => {
  consoleErrors = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });
});

test.afterEach(async () => {
  expect(consoleErrors, "Console errors must be 0").toHaveLength(0);
});

test.describe("G-1 Admin Dashboard", () => {
  test.skip(
    !process.env.PREVIEW_URL,
    "G1_PREVIEW_URL not set — G-1 E2E parked until post-merge preview + secrets",
  );

  test("operator → Dashboard renders 5 KPI cards + chart + alerts", async ({ page }) => {
    await stubCallables(page);
    await page.goto("/admin");
    await expect(page.getByTestId("kpi-grid")).toBeVisible();
    await expect(page.locator(".kpi")).toHaveCount(5);
    await expect(page.locator(".alert")).toHaveCount(3);
  });

  test("non-authenticated /admin → needs-signin card", async ({ browser }) => {
    const ctx = await browser.newContext(); // no storageState → signed out
    const page = await ctx.newPage();
    page.on("console", (m) => m.type() === "error" && consoleErrors.push(m.text()));
    await page.goto((process.env.PREVIEW_URL ?? "") + "/admin");
    await expect(page.locator('.gate-card[data-st="needs-signin"]')).toBeVisible();
    await ctx.close();
  });

  test("alert Dismiss → row becomes dismissed (UI stub)", async ({ page }) => {
    await stubCallables(page);
    await page.goto("/admin");
    const high = page.locator('.alert[data-sev="high"]').first();
    await expect(high).toBeVisible();
    await high.getByRole("button", { name: /Dismiss|무시/ }).click();
    await expect(page.locator('.alert[data-sev="dismissed"]')).toHaveCount(1);
  });

  test("sidebar → The Lab link points at /admin/lab", async ({ page }) => {
    await stubCallables(page);
    await page.goto("/admin");
    await expect(page.locator('.sb-item[href="/admin/lab"]')).toBeVisible();
  });

  test("SiteMapSheet ☰ → Domain 6 is a live link (Coming soon cleared)", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /menu|메뉴|sitemap|☰/i }).first().click();
    const adminLink = page.getByRole("link", { name: /Admin Dashboard/i });
    await expect(adminLink).toHaveAttribute("href", "/admin");
  });

  test("Dev Nav Cmd+Shift+D → Admin Dashboard link resolves to /admin", async ({ page }) => {
    await page.goto("/");
    await page.keyboard.press("Meta+Shift+KeyD");
    const link = page.getByRole("link", { name: /Admin Dashboard/i });
    await expect(link).toHaveAttribute("href", "/admin");
  });

  test("responsive: ≤480 shows the MobileNotice", async ({ page }) => {
    await stubCallables(page);
    await page.goto("/admin");
    await page.setViewportSize({ width: 375, height: 760 });
    await expect(page.locator(".mobile-notice")).toBeVisible();
    await expect(page.locator(".app-shell")).toBeHidden();
  });
});
