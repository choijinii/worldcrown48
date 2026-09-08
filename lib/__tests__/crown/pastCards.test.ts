/**
 * pastRunIndices — 완주 화면의 "이전 참여" 목록에 넣을 회차들 (AC 5).
 *
 * crown_cards 는 **쿼리하지 않는다.** 규칙이 `cardId.split('_')[0] == uid` 로 소유자를
 * 판정하는데 list 연산에서는 와일드카드가 null이라 split이 터져 읽기가 거부된다
 * (2026-07-08 에뮬레이터 검증 — voteGate 의 §확인 필요 1과 같은 함정). 그래서 회차별
 * get 으로 집으며, 그 회차 목록을 여기서 만든다.
 */
import { describe, expect, it } from "vitest";
import { pastRunIndices } from "@/lib/crown/pastCards";

describe("pastRunIndices", () => {
  it("1회차만 돌았으면 이전 카드가 없다", () => {
    expect(pastRunIndices(1)).toEqual([]);
  });

  it("3회차를 보고 있으면 1·2회차가 이전 카드다", () => {
    expect(pastRunIndices(3)).toEqual([1, 2]);
  });

  it("5회차면 네 장이 쌓인다 (AC 4·5)", () => {
    expect(pastRunIndices(5)).toEqual([1, 2, 3, 4]);
  });

  it("오래된 순으로 준다 — 목록이 쌓인 순서대로 읽힌다", () => {
    expect(pastRunIndices(4)).toEqual([1, 2, 3]);
  });

  it("0·음수·정수가 아닌 값은 빈 목록 — 방어", () => {
    expect(pastRunIndices(0)).toEqual([]);
    expect(pastRunIndices(-1)).toEqual([]);
    expect(pastRunIndices(2.5)).toEqual([]);
  });

  it("get 횟수는 한도(5)를 넘지 않는다 — 쿼리를 못 쓰는 대가가 유한하다", () => {
    expect(pastRunIndices(5).length).toBeLessThanOrEqual(4);
  });
});
