import { describe, it, expect } from "vitest";
import { CATEGORIES } from "@/lib/types/tournament";
import { isValidCategory } from "@/lib/lab/categories";

describe("categories", () => {
  it("exposes exactly the six official categories in order", () => {
    expect(CATEGORIES).toEqual([
      "FOOTBALL",
      "KPOP",
      "ANIME",
      "GAMING",
      "MOVIE",
      "OTHER",
    ]);
  });

  it("accepts a known category", () => {
    expect(isValidCategory("KPOP")).toBe(true);
  });

  it("rejects unknown, single-sport, empty, and wrong-case values", () => {
    expect(isValidCategory("WORLD CUP 2026")).toBe(false);
    expect(isValidCategory("")).toBe(false);
    expect(isValidCategory("football")).toBe(false); // enum is case-sensitive
    expect(isValidCategory(undefined)).toBe(false);
  });
});
