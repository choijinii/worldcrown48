/** LAB-FIX-4 §3-4 — "그 외" 대회의 같은 이름 검사 = 이름 + 덧붙이는 정보가 둘 다 같을 때만 겹침. 개인 · 팀은 그대로. */
import { describe, expect, it } from "vitest";
import { deriveReviewFlags } from "@/lib/lab/reviewFlags";

const slot = (name: string, affiliation: string) => ({ name, affiliation, imageSearchKeyword: "" });
const dup = (flags: ReturnType<typeof deriveReviewFlags>, i: number) =>
  (flags[i] ?? []).some((f) => f.kind === "duplicate-suspect");

describe("같은 이름 검사 — 그 외", () => {
  it("제목이 같고 가수가 다른 노래는 겹침이 아니다", () => {
    const f = deriveReviewFlags([slot("봄날", "BTS"), slot("봄날", "이무진")], { nameWithExtra: true });
    expect(dup(f, 0)).toBe(false);
    expect(dup(f, 1)).toBe(false);
  });
  it("이름도 덧붙임도 같으면 겹침 · 덧붙임이 둘 다 비어도 겹침", () => {
    expect(dup(deriveReviewFlags([slot("봄날", "BTS"), slot("봄날", "bts")], { nameWithExtra: true }), 0)).toBe(true);
    expect(dup(deriveReviewFlags([slot("신라면", ""), slot("신라면", "")], { nameWithExtra: true }), 1)).toBe(true);
  });
  it("한쪽만 덧붙임이 있으면 그 외에서는 겹침이 아니다(개인 · 팀은 지금처럼 겹침)", () => {
    const slots = [slot("봄날", "BTS"), slot("봄날", "")];
    expect(dup(deriveReviewFlags(slots, { nameWithExtra: true }), 0)).toBe(false);
    expect(dup(deriveReviewFlags(slots), 0)).toBe(true);
  });
});
