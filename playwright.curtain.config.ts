/**
 * Playwright — 런칭 전 커튼 판 (CURTAIN-1 · 지시서 §11 E2E).
 *
 * 다른 E2E 는 Vercel 미리보기 주소에서 돈다(playwright.config.ts). 커튼은 환경 변수로 켜고 끄므로
 * 이 판만 같은 빌드를 `next start` 로 세 번 띄운다: 켜짐(3200) · 꺼짐(3201) · 켜짐+런칭 시각 지남(3202).
 * 로그인 저장 상태는 쓰지 않는다 — 시크릿 창(쿠키 없음)이 기본이다.
 */
import { defineConfig, devices } from "@playwright/test";

export const CURTAIN_PORTS = { on: 3200, off: 3201, past: 3202 } as const;

function server(port: number, env: Record<string, string>) {
  return {
    command: `npx next start -p ${port}`,
    url: `http://localhost:${port}/launch`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env,
  };
}

export default defineConfig({
  testDir: "e2e",
  testMatch: "curtain-1.spec.ts",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: [["html", { open: "never", outputFolder: "playwright-report-curtain" }], ["list"]],
  outputDir: "test-results-curtain",
  use: {
    trace: "on-first-retry",
    viewport: { width: 1440, height: 900 },
  },
  webServer: [
    server(CURTAIN_PORTS.on, { LAUNCH_CURTAIN: "on", LAUNCH_AT: "2099-01-01T00:00:00Z" }),
    server(CURTAIN_PORTS.off, { LAUNCH_CURTAIN: "off" }),
    server(CURTAIN_PORTS.past, { LAUNCH_CURTAIN: "on", LAUNCH_AT: "2026-01-01T00:00:00Z" }),
  ],
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } } }],
});
