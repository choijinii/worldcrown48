import { describe, it, expect } from "vitest";
import {
  mergeKeywords,
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

describe("mergeKeywords — ✨AI 재클릭 경로의 상한 (LAB-UX-1)", () => {
  it("합친 결과를 상한에서 자른다 — 재클릭해도 20/12가 되지 않는다", () => {
    const existing = Array.from({ length: 8 }, (_, i) => `mine${i}`);
    const incoming = Array.from({ length: KEYWORDS_MAX }, (_, i) => `ai${i}`);
    const r = mergeKeywords(existing, incoming);
    expect(r.values).toHaveLength(KEYWORDS_MAX);
    expect(r.dropped).toBe(8);
    // 잘린 결과가 다시 검사기를 통과해야 STEP 1 게이트가 열린 채로 남는다.
    expect(validateKeywords(r.values).isValid).toBe(true);
  });

  it("운영자가 먼저 넣은 것을 남기고 AI 제안의 뒤쪽을 버린다", () => {
    const existing = Array.from({ length: KEYWORDS_MAX }, (_, i) => `mine${i}`);
    const r = mergeKeywords(existing, ["ai-extra"]);
    expect(r.values).toEqual(existing);
    expect(r.dropped).toBe(1);
  });

  it("상한 안이면 아무것도 버리지 않는다", () => {
    const r = mergeKeywords(["kpop"], ["dance", "vocal"]);
    expect(r.values).toEqual(["kpop", "dance", "vocal"]);
    expect(r.dropped).toBe(0);
  });

  it("중복은 병합 단계에서 이미 사라지므로 자리를 먹지 않는다", () => {
    const r = mergeKeywords(["KPOP"], ["kpop", "dance"]);
    expect(r.values).toEqual(["KPOP", "dance"]);
    expect(r.dropped).toBe(0);
  });
});
