/**
 * Playwright — 에뮬레이터 판 (IMAGE-1 PR 1 · 지시서 §11.3).
 *
 * scripts/e2e-emulator.sh 가 `firebase emulators:exec` 안에서 부른다(에뮬레이터 주소 환경 변수가
 * 그때 채워진다). 앱은 NEXT_PUBLIC_USE_EMULATORS=1 로 빌드된 `next start`. 바깥 사이트를 부르지 않는다.
 */
import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;

export default defineConfig({
  testDir: "e2e/emulator",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  timeout: 120_000,
  expect: { timeout: 20_000 },
  reporter: [["html", { open: "never", outputFolder: "playwright-report-emulator" }], ["list"]],
  outputDir: "test-results-emulator",
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "on",
    video: "on",
    viewport: { width: 1440, height: 900 },
  },
  webServer: {
    command: `npx next start -p ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } } }],
});
