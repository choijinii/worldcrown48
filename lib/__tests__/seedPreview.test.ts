/**
 * Pure-logic tests for the seed-preview CLI (Phase C, W-3).
 *
 * The runnable seeder is `functions/scripts/seed-preview.mjs` (firebase-admin,
 * needs credentials). Its arg-parsing / module-resolution / deadline / prod-gate
 * logic is extracted into `seed-preview.lib.mjs` so it unit-tests here with no
 * network — matching the repo's "pure logic in a testable module" convention.
 */
import { describe, expect, it } from "vitest";
import {
  MODULES,
  deadlineFromOption,
  isProductionBlocked,
  parseArgs,
  resolveModules,
} from "../../functions/scripts/seed-preview.lib.mjs";

describe("resolveModules", () => {
  it("'all' (or undefined) → every module", () => {
    expect(resolveModules("all")).toEqual([...MODULES]);
    expect(resolveModules(undefined)).toEqual([...MODULES]);
  });
  it("a single module → just that one", () => {
    expect(resolveModules("c3")).toEqual(["c3"]);
  });
  it("comma list → those modules", () => {
    expect(resolveModules("b1,c1")).toEqual(["b1", "c1"]);
  });
  it("an unknown module throws", () => {
    expect(() => resolveModules("xx")).toThrow(/Unknown module/);
  });
});

describe("parseArgs", () => {
  it("defaults: module=all, no cleanup, deadline=future", () => {
    expect(parseArgs([])).toEqual({
      module: "all",
      cleanup: false,
      deadline: "future",
      help: false,
    });
  });
  it("parses --module / --cleanup / --deadline", () => {
    expect(parseArgs(["--module=c3", "--cleanup", "--deadline=past"])).toEqual({
      module: "c3",
      cleanup: true,
      deadline: "past",
      help: false,
    });
  });
  it("--help sets help", () => {
    expect(parseArgs(["--help"]).help).toBe(true);
  });
  it("rejects an invalid --deadline", () => {
    expect(() => parseArgs(["--deadline=soon"])).toThrow(/deadline/);
  });
  it("rejects an unknown flag", () => {
    expect(() => parseArgs(["--force"])).toThrow(/Unknown argument/);
  });
});

describe("deadlineFromOption", () => {
  const now = new Date("2026-06-28T00:00:00Z");
  it("past → before now, future → after now", () => {
    expect(deadlineFromOption("past", now).getTime()).toBeLessThan(
      now.getTime(),
    );
    expect(deadlineFromOption("future", now).getTime()).toBeGreaterThan(
      now.getTime(),
    );
  });
});

describe("isProductionBlocked", () => {
  it("true only when NODE_ENV === production", () => {
    expect(isProductionBlocked({ NODE_ENV: "production" })).toBe(true);
    expect(isProductionBlocked({ NODE_ENV: "development" })).toBe(false);
    expect(isProductionBlocked({})).toBe(false);
  });
});
