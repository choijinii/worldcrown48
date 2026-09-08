/**
 * 완주 화면의 "이전 참여의 Crown Card" 목록 (AC 5 — 지난 판의 카드는 전부 보존된다).
 *
 * ⚠️ `crown_cards` 를 **쿼리하지 마라.** 규칙이 문서 id 접두사(`cardId.split('_')[0] == uid`)로
 * 소유자를 판정하는데, list 연산에서는 와일드카드가 null이 되어 `split` 이 터지고 읽기가
 * 거부된다 (2026-07-08 에뮬레이터 검증 — `voteGate` 주석에 남은 §확인 필요 1과 같은 함정).
 * 회차마다 `get` 하며, 일일 판 한도가 5라 최대 4번이다.
 */
export interface PastCard {
  runIndex: number;
  championContestantId: string;
}

/** 지금 보고 있는 회차 이전의 회차들 — 오래된 순. */
export function pastRunIndices(displayRunIndex: number): number[] {
  if (!Number.isInteger(displayRunIndex) || displayRunIndex < 2) return [];
  return Array.from({ length: displayRunIndex - 1 }, (_, i) => i + 1);
}
