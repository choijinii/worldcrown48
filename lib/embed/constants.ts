/**
 * lib/embed — 임베드 루프 공용 상수 (LAB-EV-1 §4).
 *
 * 이 디렉터리 전체는 import-free 순수 로직이다: 클라이언트(검수기·LoopPlayer)와
 * Cloud Functions(검증·추천·크론)가 같은 규칙을 쓰도록 functions 빌드 때
 * `functions/src/_embed/`로 복사된다(scripts/copy-embed.mjs — copy-news와 같은
 * 패턴). 그러니 여기서는 절대 `@/` 경로나 브라우저 API를 import하지 않는다.
 */

/** ADR-EV-1: 루프 길이는 10초 무음 고정. 3초는 기각됐다 — 다시 꺼내지 않는다. */
export const LOOP_SECONDS = 10;

/**
 * ADR-EV-4: 한 화면에서 동시에 살아 있을 수 있는 플레이어 상한. 검수기는 활성
 * 슬롯 1개만 라이브지만, 이후 Arena VS 무대·Pitch 쇼케이스가 같은 상한을 쓴다.
 */
export const MAX_CONCURRENT_PLAYERS = 6;

/**
 * ADR-EV-6: 검수기·슬롯·검증 배치의 규모 N. **48 하드코딩 금지** — 여기가 단일
 * 소스이고, 32·16강이 로드맵에서 확정되면 숫자만 추가한다(결승 3인 구조와의
 * 정합은 브래킷 엔진 쪽 결정 — 검수기는 목록만 따른다).
 *
 * 주의: 이건 "검수기가 한 번에 다루는 슬롯 수"다. Contestant 풀 자체는 여전히
 * 48 고정(TOTAL_CONTESTANTS · 대진 흐름 #10)이며, N=12면 슬롯 01~12만 채운다.
 */
export const BRACKET_SIZES = [48, 24, 12] as const;

export type BracketSize = (typeof BRACKET_SIZES)[number];

export const DEFAULT_BRACKET_SIZE: BracketSize = BRACKET_SIZES[0];

/** videos.list 가 한 번에 받아주는 id 개수 — 배치 크기의 천장(§6 쿼터 절약). */
export const MAX_VIDEOS_PER_CALL = 50;

/** 킬링파트를 못 찾았을 때의 기본 시작점(W2 ③층). */
export const HEURISTIC_START_SEC = 60;

export function isBracketSize(value: unknown): value is BracketSize {
  return BRACKET_SIZES.includes(value as BracketSize);
}

/** 신뢰할 수 없는 입력(쿼리스트링·저장된 문서)을 규모로 정규화한다. */
export function normalizeBracketSize(value: unknown): BracketSize {
  const n = typeof value === "string" ? Number(value) : value;
  return isBracketSize(n) ? n : DEFAULT_BRACKET_SIZE;
}
