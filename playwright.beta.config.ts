/**
 * Playwright — 1차 베타 통과 판 (BETA-PASS-1 · 지시서 §11 E2E).
 *
 * 명단 확인은 함수(betaPass)와 로그인이 있어야 해서 에뮬레이터 판처럼 `firebase emulators:exec` 안에서 돈다
 * (scripts/e2e-emulator.sh 를 PW_CONFIG=playwright.beta.config.ts 로). 앱은 NEXT_PUBLIC_USE_EMULATORS=1 빌드.
 * 같은 빌드를 둘 띄운다: 커튼 켜짐(3300 · LAUNCH_AT 먼 미래) · 런칭 시각 지남(3301).
 * BETA_PASS_SECRET 은 시험용 가짜 값 — 함수 에뮬레이터의 비밀(functions/.secret.local)과 같다.
 */
import { defineConfig, devices } from "@playwright/test";

export const BETA_PORTS = { on: 3300, past: 3301 } as const;
export const E2E_BETA_SECRET = "e2e-beta-pass-secret";

function server(port: number, env: Record<string, string>) {
  return {
    command: `npx next start -p ${port}`,
    url: `http://localhost:${port}/launch`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: { ...env, BETA_PASS_SECRET: E2E_BETA_SECRET },
  };
}

export default defineConfig({
  testDir: "e2e",
  testMatch: "beta-pass-1.spec.ts",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  timeout: 120_000,
  expect: { timeout: 20_000 },
  reporter: [["html", { open: "never", outputFolder: "playwright-report-beta" }], ["list"]],
  outputDir: "test-results-beta",
  use: {
    trace: "on-first-retry",
    viewport: { width: 1440, height: 900 },
  },
  webServer: [
    server(BETA_PORTS.on, { LAUNCH_CURTAIN: "on", LAUNCH_AT: "2099-01-01T00:00:00Z" }),
    server(BETA_PORTS.past, { LAUNCH_CURTAIN: "on", LAUNCH_AT: "2026-01-01T00:00:00Z" }),
  ],
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } } }],
});
