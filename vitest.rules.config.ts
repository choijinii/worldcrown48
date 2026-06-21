/**
 * Vitest config for Firestore Rules tests (emulator-backed).
 *
 * Kept SEPARATE from vitest.integration.config so the existing
 * `npm run test:integration` (D-1 CI, no emulator) never picks these up.
 * Run via `npm run test:rules`, which wraps this in firebase emulators:exec
 * so a Firestore emulator is live on 127.0.0.1:8080.
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
    include: ["tests/rules/**/*.test.ts"],
    // Emulator round-trips are slower than pure unit tests.
    testTimeout: 15_000,
    hookTimeout: 30_000,
  },
});
