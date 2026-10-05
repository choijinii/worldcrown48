import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./"),
    },
  },
  // tsconfig 는 Next 를 위해 jsx: "preserve" 다. 유닛 테스트가 부품(.tsx)을 서버 렌더로
  // 읽을 수 있게 테스트에서만 JSX 를 변환한다 (COOKIE-1 동의 바 문구 스냅샷).
  oxc: { jsx: { runtime: "automatic" } },
  test: {
    environment: "node",
    include: ["lib/__tests__/**/*.test.ts"],
  },
});
