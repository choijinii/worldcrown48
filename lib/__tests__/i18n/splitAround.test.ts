/**
 * ARENA-1 PR 2a — 번역문 한가운데 조각 가르기 (라운드 이름을 굵게 유지하기 위한 것).
 */
import { describe, expect, it } from "vitest";
import { SPLIT_SENTINEL, splitAround } from "@/lib/i18n/splitAround";
import { resolveMessage } from "@/lib/i18n/messages";

describe("splitAround", () => {
  it("자리표시자 앞뒤로 가른다", () => {
    expect(splitAround(`앞${SPLIT_SENTINEL}뒤`)).toEqual(["앞", "뒤"]);
  });

  it("자리표시자가 끝에 있으면 뒤는 빈 문자열", () => {
    expect(splitAround(`방금 마친 라운드 ${SPLIT_SENTINEL}`)).toEqual(["방금 마친 라운드 ", ""]);
  });

  it("자리표시자가 없으면 문장 전체가 앞조각 — 문장은 살아남는다", () => {
    expect(splitAround("자리표시자 없음")).toEqual(["자리표시자 없음", ""]);
  });
});

describe("라운드 전환 문구와 함께 (3언어 어순이 달라도 성립)", () => {
  it.each([
    ["ko", "방금 마친 라운드 ", ""],
    ["en", "You completed ", ""],
    ["es", "Has completado ", ""],
  ] as const)("%s", (lang, before, after) => {
    const rendered = resolveMessage(lang, "arena.round.completed", { round: SPLIT_SENTINEL });
    expect(splitAround(rendered)).toEqual([before, after]);
  });
});
