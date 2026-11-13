/**
 * Integration test config — Firebase Emulator-backed specs.
 *
 * Specs live under `tests/integration/**`. Empty for now; the scaffolding
 * exists so the D-1 CI job can call `npm run test:integration` without
 * tripping. Adding a test is just: drop a file under tests/integration.
 */
import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./"),
    },
  },
  // 유닛 설정과 같다 — tsconfig 는 jsx: "preserve" 라, 화면 부품(.tsx)을 서버 렌더로 읽는 통합 시험에서만
  // JSX 를 변환한다(LAB-FIX-3 추가분 · 생성 패널 → 종류 잠금 흐름).
  oxc: { jsx: { runtime: "automatic" } },
  test: {
    environment: "node",
    include: ["tests/integration/**/*.test.ts"],
  },
});
