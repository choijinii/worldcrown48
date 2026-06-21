/**
 * Vitest config for Cloud Functions unit tests.
 *
 * Functions are a separate deploy package (own tsconfig, rootDir=src), so they
 * get their own node-env vitest. Tests live next to source under src/**.test.ts
 * and exercise the extracted pure cores (aiFillCore, parseContestants) — the
 * Anthropic call is injected, so no network and no firebase mocking.
 */
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
