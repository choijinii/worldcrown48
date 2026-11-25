/**
 * publicEntry — 차트 한 줄을 공개 캐시 모양으로 (T5 PR 2).
 *
 * 공개 `ranking_cache/{tid}` 는 로그인 없이 누구나 읽는다(D-30). 규칙은 필드를 가릴 수 없어서,
 * 화면에 안 그리더라도 문서에 실린 선택 수(`voteCount`)와 비율(`rate`)은 브라우저 개발 도구로
 * 그대로 보였다 → 문서에서 아예 뺀다. 둘은 이상 징후(T-1~T-4) 판정의 재료라 서버 전용 기준선
 * (`ranking_accum/{tid}/history/{seq}`)에만 남는다.
 *
 * IMPORT-FREE(타입만): functions 로 복사된다(copy-ranking).
 */
import type { CrownRankingEntry } from "./rankingTypes";

/** 공개 차트 한 줄 — Crown Score · 세 비율 · 이름 · 아바타 재료. 선택 수 · 비율 없음. */
export type PublicRankingEntry = Omit<CrownRankingEntry, "voteCount" | "rate">;

export function toPublicEntry(e: CrownRankingEntry): PublicRankingEntry {
  // 나머지 칸은 손대지 않는다 — 옛 캐시와 같은 키 · 같은 값(빠진 두 칸만 다르다).
  const { voteCount: _voteCount, rate: _rate, ...rest } = e;
  return rest;
}
