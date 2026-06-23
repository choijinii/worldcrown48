/**
 * Playwright config — D-1.1 E2E.
 *
 * Targets the Vercel Preview URL passed via `PREVIEW_URL` so the same
 * spec runs locally (against `next dev`) and on GitHub Actions (against
 * the just-built Preview). Storage state is hydrated once by
 * `e2e/global-setup.ts` so individual specs start signed in.
 */
import { defineConfig, devices } from "@playwright/test";

const PREVIEW_URL = process.env.PREVIEW_URL ?? "http://localhost:3000";

// Vercel Preview Protection bypass is handled by the `_vercel_jwt` cookie
// primed in global-setup (via ?x-vercel-set-bypass-cookie=true). The cookie
// is origin-scoped and saved into storageState, so it carries across specs
// without leaking to cross-origin requests (e.g. gstatic CDN, identitytoolkit)
// — which is what an `extraHTTPHeaders` approach would do, triggering CORS
// preflights that the third-party origins don't satisfy.

export default defineConfig({
  testDir: "e2e",
  testIgnore: ["**/global-setup.ts"],
  fullyParallel: false,
  // DIAGNOSTIC (temporary — reverted before merge): retries:0 so the mobile-320
  // flake fails the run instead of being masked by a retry, and trace:on so the
  // failure uploads a DOM snapshot + trace to confirm the mechanism. See ADR-0004.
  retries: 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [["html", { open: "never" }], ["list"]],
  globalSetup: "./e2e/global-setup.ts",
  use: {
    baseURL: PREVIEW_URL,
    storageState: "tests/.auth/user.json",
    trace: "on",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
