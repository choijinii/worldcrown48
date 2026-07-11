import { describe, it, expect } from "vitest";
import { isValidCategory } from "@/lib/lab/categories";

/**
 * TX-0: categories are DATA, not a code enum. The Lab-facing `isValidCategory`
 * delegates to the shared data-driven guard — it validates against the list of
 * ids loaded from the `categories` collection, never a hard-coded tuple.
 */
describe("isValidCategory (data-driven)", () => {
  const validIds = ["KPOP", "CREATOR", "FOOTBALL"];

  it("accepts an id present in the supplied list", () => {
    expect(isValidCategory("KPOP", validIds)).toBe(true);
  });

  it("rejects unknown, single-sport, empty, and non-string values", () => {
    expect(isValidCategory("WORLD CUP 2026", validIds)).toBe(false);
    expect(isValidCategory("", validIds)).toBe(false);
    expect(isValidCategory("kpop", validIds)).toBe(false); // ids are case-sensitive
    expect(isValidCategory(undefined, validIds)).toBe(false);
  });

  it("rejects everything against an empty list (0-category fetch failure)", () => {
    expect(isValidCategory("KPOP", [])).toBe(false);
  });
});
