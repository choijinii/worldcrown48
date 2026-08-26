/**
 * LAB-UX-1 ③ — 붙여넣은 링크의 추출 결과를 슬롯에 얹는 규칙.
 *
 * 이 층이 지키는 약속은 셋이다: 확신한 것만 채운다 · 못 알아본 칸은 사람에게
 * 넘긴다 · **운영자가 쓴 값은 절대 덮지 않는다.** 마지막 하나가 특히 중요하다 —
 * 이 도구는 복구용인데, 복구 도구가 사람이 쓴 것을 지우면 도구가 아니라 사고다.
 */
import { describe, expect, it } from "vitest";
import { applyExtractions, blankSlotIndexes } from "@/lib/lab/pasteExtract";
import type { ExtractedContestant } from "@/lib/lab/pasteExtract";
import type { ContestantDraft } from "@/lib/lab/tournamentDoc";
import type { SlotAssignment } from "@/lib/embed/parseBatch";

const TOTAL = 4;
const A = "aaaaaaaaaaa";
const B = "bbbbbbbbbbb";

function emptyDraft(): ContestantDraft {
  return { name: "", nationality: "", affiliation: "", imageSearchKeyword: "" };
}

function draft(over: Partial<ContestantDraft> = {}): ContestantDraft {
  return { ...emptyDraft(), ...over };
}

function assign(slot: number, videoId: string): SlotAssignment {
  return { slot, index: slot, videoId, startSec: null };
}

function found(videoId: string, over: Partial<ExtractedContestant> = {}): ExtractedContestant {
  return {
    videoId,
    name: "카리나",
    affiliation: "aespa",
    nationality: "KR",
    confident: true,
    ...over,
  };
}

describe("blankSlotIndexes", () => {
  it("이름이 빈 칸만 센다 — 화면 순서 그대로", () => {
    const grid = [draft({ name: "지수" }), draft(), draft({ name: "  " }), draft()];
    expect(blankSlotIndexes(grid, TOTAL)).toEqual([1, 2, 3]);
  });

  it("영상만 있고 이름이 없는 칸도 빈칸이다 — 그 칸이야말로 채우려는 자리다", () => {
    const grid = [draft({ videoId: A })];
    expect(blankSlotIndexes(grid, 1)).toEqual([0]);
  });
});

describe("applyExtractions", () => {
  it("확신한 칸은 이름·소속·국가를 채우고 '제안' 배지를 단다", () => {
    const r = applyExtractions([], [assign(1, A)], [found(A)], TOTAL, emptyDraft);
    expect(r.drafts[0]).toMatchObject({
      name: "카리나",
      affiliation: "aespa",
      nationality: "KR",
    });
    expect(r.states[0]).toEqual({ status: "suggested" });
    expect(r.tally).toEqual({ named: 1, manual: 0 });
  });

  it("★확신 못 한 칸은 이름을 비운 채 '수동 필요'로 남긴다 — 지어내지 않는다", () => {
    const r = applyExtractions(
      [],
      [assign(1, A)],
      [found(A, { name: "", confident: false })],
      TOTAL,
      emptyDraft,
    );
    expect(r.drafts[0].name).toBe("");
    expect(r.states[0]).toEqual({ status: "manual" });
    expect(r.tally).toEqual({ named: 0, manual: 1 });
  });

  it("추출 결과가 아예 없는 칸도 '수동 필요'다", () => {
    const r = applyExtractions([], [assign(1, A)], [], TOTAL, emptyDraft);
    expect(r.states[0]).toEqual({ status: "manual" });
    expect(r.tally.manual).toBe(1);
  });

  it("★운영자가 적어 둔 이름을 덮지 않는다", () => {
    const grid = [draft({ name: "허윤진", affiliation: "LE SSERAFIM" })];
    const r = applyExtractions(grid, [assign(1, A)], [found(A)], TOTAL, emptyDraft);
    expect(r.drafts[0].name).toBe("허윤진");
    expect(r.drafts[0].affiliation).toBe("LE SSERAFIM");
    // 비어 있던 국가만 채워진다.
    expect(r.drafts[0].nationality).toBe("KR");
  });

  it("배정되지 않은 칸은 손대지 않는다", () => {
    const grid = [draft(), draft({ name: "지수" })];
    const r = applyExtractions(grid, [assign(1, A)], [found(A)], TOTAL, emptyDraft);
    expect(r.drafts[1].name).toBe("지수");
    expect(r.states[1]).toBeUndefined();
  });

  it("여러 칸을 한 번에 — 확신한 것과 못 한 것이 섞여도 각자 제 배지를 받는다", () => {
    const r = applyExtractions(
      [],
      [assign(1, A), assign(2, B)],
      [found(A), found(B, { name: "", confident: false })],
      TOTAL,
      emptyDraft,
    );
    expect(r.states[0]?.status).toBe("suggested");
    expect(r.states[1]?.status).toBe("manual");
    expect(r.tally).toEqual({ named: 1, manual: 1 });
  });

  it("입력 배열을 바꾸지 않는다", () => {
    const grid = [draft()];
    applyExtractions(grid, [assign(1, A)], [found(A)], TOTAL, emptyDraft);
    expect(grid[0].name).toBe("");
  });
});
