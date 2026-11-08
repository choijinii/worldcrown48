/** IMAGE-1 — 대표 매치: 그림 엔트리도 고를 수 있고 편집기 미리보기가 600 사본으로 그린다. 영상 칸이 먼저. */
import { describe, expect, it } from "vitest";
import { sideData } from "@/components/admin/lab/PairPanel";
import { pairSlotUsable } from "@/lib/thumbnail/pick";
import type { ContestantDraft } from "@/lib/lab/tournamentDoc";

const base: ContestantDraft = { name: "A", nationality: "", affiliation: "", imageSearchKeyword: "" };
const img = { ...base, imageUrl: "full", imageThumbUrl: "thumb" };
const vid = { ...base, videoId: "dQw4w9WgXcQ" };

describe("pairSlotUsable", () => {
  it("영상 칸 · 그림 칸 둘 다 쓸 수 있다 · 빈 칸은 못 쓴다", () => {
    expect(pairSlotUsable(vid)).toBe(true);
    expect(pairSlotUsable(img)).toBe(true);
    expect(pairSlotUsable(base)).toBe(false);
    expect(pairSlotUsable(undefined)).toBe(false);
  });
});

describe("sideData", () => {
  it("그림 칸 → imageUrl = 600 사본 · videoId 빈 글자", () => {
    expect(sideData([img], 0, 30)).toEqual({ videoId: "", orientation: "landscape", pos: 30, imageUrl: "thumb" });
  });
  it("영상 + 그림 → 영상", () => {
    expect(sideData([{ ...img, videoId: "dQw4w9WgXcQ" }], 0, 30)).toEqual({ videoId: "dQw4w9WgXcQ", orientation: "landscape", pos: 30 });
  });
  it("빈 칸 → null", () => {
    expect(sideData([base], 0, 30)).toBeNull();
  });
});
