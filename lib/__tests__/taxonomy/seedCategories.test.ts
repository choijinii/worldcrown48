/**
 * Seed-data contract for the `categories` collection (TX-0 §3 item 2 · §4).
 *
 * The runnable seeder is `functions/scripts/seed-categories.mjs` (firebase-admin,
 * needs credentials). Its canonical 10-category payload lives in the pure
 * `seed-categories.lib.mjs` so it unit-tests here with no network — matching the
 * repo's "pure data/logic in a testable module" convention (seed-preview.lib.mjs).
 *
 * These tests are the single guard that the seed matches the 대표-confirmed
 * launch plan: 1차 KPOP·CREATOR(live) → 2차 KDRAMA·ESPORTS → 3차 ANIME_WEBTOON·
 * GLOBAL_POP·HOLLYWOOD, and FOOTBALL·GAMING·OTHER = hidden 보존 (§4 매핑표).
 */
import { describe, it, expect } from "vitest";
import { validateCategoryDoc } from "@/lib/taxonomy/category";
import { SEED_CATEGORIES } from "../../../functions/scripts/seed-categories.lib.mjs";

describe("SEED_CATEGORIES", () => {
  it("registers exactly the 10 launch-plan categories", () => {
    expect(SEED_CATEGORIES.map((c) => c.id).sort()).toEqual(
      [
        "ANIME_WEBTOON",
        "CREATOR",
        "ESPORTS",
        "FOOTBALL",
        "GAMING",
        "GLOBAL_POP",
        "HOLLYWOOD",
        "KDRAMA",
        "KPOP",
        "OTHER",
      ].sort(),
    );
  });

  it("every seed doc is a well-formed CategoryDoc (schema)", () => {
    for (const c of SEED_CATEGORIES) {
      expect(() => validateCategoryDoc(c)).not.toThrow();
    }
  });

  it("assigns status + phase per the 대표-confirmed launch plan (§3 item 2)", () => {
    const by = Object.fromEntries(SEED_CATEGORIES.map((c) => [c.id, c]));
    // 1차 (live · phase 1)
    expect([by.KPOP.status, by.KPOP.phase]).toEqual(["live", 1]);
    expect([by.CREATOR.status, by.CREATOR.phase]).toEqual(["live", 1]);
    // 2차 (scheduled · phase 2)
    expect([by.KDRAMA.status, by.KDRAMA.phase]).toEqual(["scheduled", 2]);
    expect([by.ESPORTS.status, by.ESPORTS.phase]).toEqual(["scheduled", 2]);
    // 3차 (scheduled · phase 3)
    expect([by.ANIME_WEBTOON.status, by.ANIME_WEBTOON.phase]).toEqual(["scheduled", 3]);
    expect([by.GLOBAL_POP.status, by.GLOBAL_POP.phase]).toEqual(["scheduled", 3]);
    expect([by.HOLLYWOOD.status, by.HOLLYWOOD.phase]).toEqual(["scheduled", 3]);
    // hidden 보존 (§4: FOOTBALL·GAMING·OTHER)
    expect(by.FOOTBALL.status).toBe("hidden");
    expect(by.GAMING.status).toBe("hidden");
    expect(by.OTHER.status).toBe("hidden");
  });

  it("has unique, strictly increasing display order across all 10", () => {
    const orders = SEED_CATEGORIES.map((c) => c.order);
    expect(new Set(orders).size).toBe(orders.length); // unique
    const sorted = [...orders].sort((a, b) => a - b);
    expect(orders).toEqual(sorted); // already in ascending order
  });

  it("carries all three locale names for every category (i18n §10)", () => {
    for (const c of SEED_CATEGORIES) {
      expect(c.name.ko).toBeTruthy();
      expect(c.name.en).toBeTruthy();
      expect(c.name.es).toBeTruthy();
    }
  });
});
