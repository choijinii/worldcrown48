/**
 * Legacy → new category migration mapping (TX-0 §4 ADR — 대표 확정 2026-07-10).
 *
 * The runnable migrator is `functions/scripts/migrate-categories.mjs`; its pure
 * planning lives in `migrate-categories.lib.mjs` so it unit-tests here. The
 * mapping table is FIXED by §4 and must not drift:
 *   FOOTBALL→FOOTBALL · KPOP→KPOP · ANIME→ANIME_WEBTOON · GAMING→GAMING ·
 *   MOVIE→HOLLYWOOD · OTHER→OTHER
 */
import { describe, it, expect } from "vitest";
import {
  CATEGORY_MIGRATION,
  mapLegacyCategory,
  planCategoryMigration,
} from "../../../functions/scripts/migrate-categories.lib.mjs";

describe("CATEGORY_MIGRATION (§4 매핑표, fixed)", () => {
  it("is exactly the 대표-confirmed legacy→new table", () => {
    expect(CATEGORY_MIGRATION).toEqual({
      FOOTBALL: "FOOTBALL",
      KPOP: "KPOP",
      ANIME: "ANIME_WEBTOON",
      GAMING: "GAMING",
      MOVIE: "HOLLYWOOD",
      OTHER: "OTHER",
    });
  });
});

describe("mapLegacyCategory", () => {
  it("absorbs ANIME→ANIME_WEBTOON and MOVIE→HOLLYWOOD (대표 확정)", () => {
    expect(mapLegacyCategory("ANIME")).toBe("ANIME_WEBTOON");
    expect(mapLegacyCategory("MOVIE")).toBe("HOLLYWOOD");
  });

  it("keeps the preserved ids unchanged (FOOTBALL·GAMING·OTHER·KPOP)", () => {
    expect(mapLegacyCategory("FOOTBALL")).toBe("FOOTBALL");
    expect(mapLegacyCategory("GAMING")).toBe("GAMING");
    expect(mapLegacyCategory("OTHER")).toBe("OTHER");
    expect(mapLegacyCategory("KPOP")).toBe("KPOP");
  });

  it("returns null for an unmapped value", () => {
    expect(mapLegacyCategory("BOGUS")).toBeNull();
  });
});

describe("planCategoryMigration", () => {
  it("plans only the real changes (from !== to)", () => {
    const plan = planCategoryMigration([
      { id: "t1", category: "ANIME" },
      { id: "t2", category: "MOVIE" },
    ]);
    expect(plan.changes).toEqual([
      { id: "t1", from: "ANIME", to: "ANIME_WEBTOON" },
      { id: "t2", from: "MOVIE", to: "HOLLYWOOD" },
    ]);
    expect(plan.unknown).toEqual([]);
  });

  it("leaves self-mapping legacy ids unchanged (no write)", () => {
    const plan = planCategoryMigration([
      { id: "t3", category: "FOOTBALL" },
      { id: "t4", category: "KPOP" },
    ]);
    expect(plan.changes).toEqual([]);
    expect(plan.unchanged).toEqual(["t3", "t4"]);
  });

  it("skips a Tournament already on a valid NEW id (post-seed, not legacy)", () => {
    const plan = planCategoryMigration([{ id: "t5", category: "HOLLYWOOD" }]);
    expect(plan.changes).toEqual([]);
    expect(plan.unchanged).toEqual(["t5"]);
    expect(plan.unknown).toEqual([]);
  });

  it("flags an unmappable category as unknown (never silently written)", () => {
    const plan = planCategoryMigration([{ id: "t6", category: "BOGUS" }]);
    expect(plan.changes).toEqual([]);
    expect(plan.unknown).toEqual([{ id: "t6", from: "BOGUS" }]);
  });
});
