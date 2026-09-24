/**
 * crownScore — Crown Score v1.0 순수 계산 (정본 `marketing/00_strategy/CROWN_SCORE_v1.0.md`).
 *
 * 정본 §4 계산 예시가 이 파일의 기준점이다: 1,000판 대회에서 순위점수 5,150 · 1등 300번 ·
 * 뽑힘 3,750 · 나온 대결 4,450 → **549점**. 이 숫자가 흔들리면 정본과 코드가 갈라진 것이다.
 */
import { describe, expect, it } from "vitest";
import { crownScoreOf, shareRateOf } from "../../ranking/crownScore";

describe("crownScoreOf", () => {
  it("정본 §4 계산 예시 — 549점", () => {
    expect(
      crownScoreOf({
        runsTotal: 1000,
        placementPoints: 5150,
        wins: 300,
        picks: 3750,
        appearances: 4450,
      }),
    ).toBe(549);
  });

  it("runsTotal 0 — 아직 완주한 판이 없으면 0점 (NaN 아님)", () => {
    expect(
      crownScoreOf({
        runsTotal: 0,
        placementPoints: 0,
        wins: 0,
        picks: 0,
        appearances: 0,
      }),
    ).toBe(0);
  });

  it("appearances 0 — 한 번도 대결에 나오지 않았으면 점유율 0 (정본 §D)", () => {
    // 판은 돌았지만 이 Contestant은 추출되지 않아 한 번도 나오지 않은 경우.
    expect(
      shareRateOf({
        runsTotal: 10,
        placementPoints: 0,
        wins: 0,
        picks: 0,
        appearances: 0,
      }),
    ).toBe(0);
  });

  it("모든 판에서 1등 + 모든 대결에서 뽑힘 → 1000점 (정본 §4 상한)", () => {
    expect(
      crownScoreOf({
        runsTotal: 10,
        placementPoints: 100,
        wins: 10,
        picks: 50,
        appearances: 50,
      }),
    ).toBe(1000);
  });
});
