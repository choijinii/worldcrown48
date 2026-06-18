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
  test: {
    environment: "node",
    include: ["tests/integration/**/*.test.ts"],
  },
});
