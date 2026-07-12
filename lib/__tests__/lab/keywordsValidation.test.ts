import { describe, it, expect } from "vitest";
import {
  validateKeywords,
  KEYWORDS_MAX,
  KEYWORD_MAX_LEN,
} from "@/lib/lab/keywordsValidation";

describe("validateKeywords", () => {
  it("trims each keyword and drops empties", () => {
    const r = validateKeywords(["  kpop ", "", "   ", "dance"]);
    expect(r.values).toEqual(["kpop", "dance"]);
    expect(r.count).toBe(2);
    expect(r.isValid).toBe(true);
  });

  it("dedupes case-insensitively, keeping the first occurrence", () => {
    const r = validateKeywords(["KPOP", "kpop", "Dance", "dance"]);
    expect(r.values).toEqual(["KPOP", "Dance"]);
    expect(r.count).toBe(2);
  });

  it("is invalid (isEmpty) when no keyword survives normalization", () => {
    const r = validateKeywords(["", "  "]);
    expect(r.isEmpty).toBe(true);
    expect(r.isValid).toBe(false);
    expect(r.count).toBe(0);
  });

  it(`flags hasTooMany when more than ${KEYWORDS_MAX} distinct keywords`, () => {
    const many = Array.from({ length: KEYWORDS_MAX + 1 }, (_, i) => `k${i}`);
    const r = validateKeywords(many);
    expect(r.hasTooMany).toBe(true);
    expect(r.isValid).toBe(false);
  });

  it(`accepts exactly ${KEYWORDS_MAX} keywords`, () => {
    const max = Array.from({ length: KEYWORDS_MAX }, (_, i) => `k${i}`);
    const r = validateKeywords(max);
    expect(r.hasTooMany).toBe(false);
    expect(r.isValid).toBe(true);
  });

  it(`flags hasTooLong when a keyword exceeds ${KEYWORD_MAX_LEN} chars`, () => {
    const r = validateKeywords(["ok", "x".repeat(KEYWORD_MAX_LEN + 1)]);
    expect(r.hasTooLong).toBe(true);
    expect(r.isValid).toBe(false);
  });

  it(`accepts a keyword of exactly ${KEYWORD_MAX_LEN} chars`, () => {
    const r = validateKeywords(["x".repeat(KEYWORD_MAX_LEN)]);
    expect(r.hasTooLong).toBe(false);
    expect(r.isValid).toBe(true);
  });
});
