/**
 * lib/ranking/crownScore — Crown Score v1.0 순수 계산.
 *
 * 정본: `marketing/00_strategy/CROWN_SCORE_v1.0.md` (2026-09-23 대표 확정).
 * 코드·문서·기사가 정본과 다르면 정본이 이긴다.
 *
 *   순위점수율 = (받은 순위 점수 합계 ÷ 대회 전체 판수) ÷ 10
 *   우승율     = 1등 횟수 ÷ 대회 전체 판수
 *   점유율     = 대결에서 뽑힌 횟수 ÷ 대결에 나온 횟수
 *   Crown Score = (순위점수율×0.4 + 우승율×0.3 + 점유율×0.3) × 1000  → 0~1000 정수
 *
 * IMPORT-FREE BY DESIGN — `lib/ranking/rankingTypes` 와 같은 이유로 SDK를 참조하지
 * 않는다. `functions/scripts/copy-ranking.mjs` 가 크론 빌드 트리로 복사한다.
 */

/** 한 Contestant의 대회 단위 누적 + 그 대회의 전체 판수. */
export interface CrownScoreInput {
  /** 대회 전체 완주 판수(게스트 판 제외). 0이면 비율을 낼 수 없다. */
  runsTotal: number;
  /** 받은 순위 점수 합계 (1등 10 · 2등 5 · 3등 2). */
  placementPoints: number;
  /** 1등 횟수. */
  wins: number;
  /** 대결에서 뽑힌 횟수. */
  picks: number;
  /** 대결에 나온 횟수. */
  appearances: number;
}

/** 판 1회 최고점 = 1등의 10점. 순위점수율의 분모. */
const MAX_RUN_POINTS = 10;

const WEIGHT_PLACEMENT = 0.4;
const WEIGHT_WIN = 0.3;
const WEIGHT_SHARE = 0.3;

const SCORE_SCALE = 1000;

/** 순위점수율 — 판마다 얼마나 높이 올라가는가 (0~1). */
export function placementRateOf(input: CrownScoreInput): number {
  // 0으로 나누면 NaN이 캐시에 실려 화면이 "NaN점"을 그린다. 판이 없으면 비율도 없다.
  if (input.runsTotal <= 0) return 0;
  return input.placementPoints / input.runsTotal / MAX_RUN_POINTS;
}

/** 우승율 — 얼마나 자주 끝까지 이기는가 (0~1). */
export function winRateOf(input: CrownScoreInput): number {
  if (input.runsTotal <= 0) return 0;
  return input.wins / input.runsTotal;
}

/** 점유율 — 대결마다 얼마나 선택받는가 (0~1). 정본 §D: appearances 0이면 0. */
export function shareRateOf(input: CrownScoreInput): number {
  if (input.appearances <= 0) return 0;
  return input.picks / input.appearances;
}

/**
 * Crown Score — 0~1000 정수.
 *
 * 세 비율은 **반올림하지 않고** 섞는다. 정본 §4는 마지막에 한 번만 반올림한다
 * ("소수점 첫째 자리에서 반올림") — 중간에 반올림하면 대회마다 1점씩 어긋난다.
 */
export function crownScoreOf(input: CrownScoreInput): number {
  const mixed =
    placementRateOf(input) * WEIGHT_PLACEMENT +
    winRateOf(input) * WEIGHT_WIN +
    shareRateOf(input) * WEIGHT_SHARE;
  return Math.round(mixed * SCORE_SCALE);
}
