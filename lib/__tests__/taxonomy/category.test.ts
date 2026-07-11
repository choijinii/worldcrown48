/**
 * Category Taxonomy — schema + data-driven validation (TX-0, LANGUAGE.md §13).
 *
 * The category set is Firestore DATA (a `categories` collection), not a code
 * enum — so validity is checked against a supplied list, never a hard-coded
 * tuple. These are the pure helpers every consumer (Lab publish, client
 * dropdown, seed, migration) shares. No Firebase here — node-env unit tests.
 */
import { describe, it, expect } from "vitest";
import {
  validateCategoryDoc,
  isValidCategoryId,
  selectCategories,
  categoryIds,
  type CategoryDoc,
} from "@/lib/taxonomy/category";

/** A well-formed live category doc (shape from §3 item 1). */
function make(overrides: Partial<CategoryDoc> = {}): CategoryDoc {
  return {
    id: "KPOP",
    name: { ko: "K-POP", en: "K-POP", es: "K-POP" },
    status: "live",
    phase: 1,
    order: 1,
    ...overrides,
  };
}

describe("validateCategoryDoc", () => {
  it("accepts a well-formed category doc and returns it typed", () => {
    const raw = make();
    expect(validateCategoryDoc(raw)).toEqual(raw);
  });

  it("rejects a non-object", () => {
    expect(() => validateCategoryDoc(null)).toThrow();
    expect(() => validateCategoryDoc("KPOP")).toThrow();
  });

  it("rejects an id that is not UPPER_SNAKE", () => {
    expect(() => validateCategoryDoc(make({ id: "kpop" }))).toThrow(/id/i);
    expect(() => validateCategoryDoc(make({ id: "K-POP" }))).toThrow(/id/i);
    expect(() => validateCategoryDoc(make({ id: "" }))).toThrow(/id/i);
  });

  it("requires all three locale names (ko/en/es), each non-empty", () => {
    expect(() =>
      validateCategoryDoc(make({ name: { ko: "K-POP", en: "K-POP" } as never })),
    ).toThrow(/name/i);
    expect(() =>
      validateCategoryDoc(make({ name: { ko: "K-POP", en: "", es: "K-POP" } })),
    ).toThrow(/name/i);
  });

  it("rejects a status outside hidden|scheduled|live", () => {
    expect(() => validateCategoryDoc(make({ status: "active" as never }))).toThrow(
      /status/i,
    );
  });

  it("rejects non-integer phase or order", () => {
    expect(() => validateCategoryDoc(make({ phase: 1.5 }))).toThrow(/phase/i);
    expect(() => validateCategoryDoc(make({ order: -1 }))).toThrow(/order/i);
  });
});

describe("isValidCategoryId (data-driven guard)", () => {
  const ids = ["KPOP", "CREATOR", "FOOTBALL"];

  it("accepts an id present in the supplied list", () => {
    expect(isValidCategoryId("KPOP", ids)).toBe(true);
  });

  it("rejects an id absent from the list, and non-strings", () => {
    expect(isValidCategoryId("WORLD CUP 2026", ids)).toBe(false);
    expect(isValidCategoryId("", ids)).toBe(false);
    expect(isValidCategoryId(undefined, ids)).toBe(false);
    expect(isValidCategoryId(123, ids)).toBe(false);
  });

  it("rejects everything against an empty list (0-category fetch failure)", () => {
    expect(isValidCategoryId("KPOP", [])).toBe(false);
  });
});

describe("selectCategories (filter by status + sort by order)", () => {
  const cats: CategoryDoc[] = [
    make({ id: "OTHER", status: "hidden", order: 10 }),
    make({ id: "CREATOR", status: "live", order: 2 }),
    make({ id: "KPOP", status: "live", order: 1 }),
    make({ id: "KDRAMA", status: "scheduled", order: 3 }),
  ];

  it("keeps only the requested statuses, sorted ascending by order", () => {
    const live = selectCategories(cats, ["live"]);
    expect(live.map((c) => c.id)).toEqual(["KPOP", "CREATOR"]);
  });

  it("can select multiple statuses (operator view: everything)", () => {
    const all = selectCategories(cats, ["live", "scheduled", "hidden"]);
    expect(all.map((c) => c.id)).toEqual(["KPOP", "CREATOR", "KDRAMA", "OTHER"]);
  });

  it("does not mutate the input array", () => {
    const before = cats.map((c) => c.id);
    selectCategories(cats, ["live"]);
    expect(cats.map((c) => c.id)).toEqual(before);
  });
});

describe("categoryIds", () => {
  it("extracts the id list (for the data-driven validation list)", () => {
    expect(categoryIds([make({ id: "KPOP" }), make({ id: "CREATOR" })])).toEqual([
      "KPOP",
      "CREATOR",
    ]);
  });
});
