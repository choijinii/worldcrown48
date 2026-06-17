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
const BYPASS_SECRET = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
const extraHTTPHeaders = BYPASS_SECRET
  ? {
      "x-vercel-protection-bypass": BYPASS_SECRET,
      "x-vercel-set-bypass-cookie": "true",
    }
  : undefined;

export default defineConfig({
  testDir: "e2e",
  testIgnore: ["**/global-setup.ts"],
  fullyParallel: false,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [["html", { open: "never" }], ["list"]],
  globalSetup: "./e2e/global-setup.ts",
  use: {
    baseURL: PREVIEW_URL,
    storageState: "tests/.auth/user.json",
    trace: "on-first-retry",
    video: "retain-on-failure",
    extraHTTPHeaders,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
