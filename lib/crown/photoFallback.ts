/**
 * 크라운 카드 사진 주소 차례 (IMAGE-1 PR 3 · 원장 D-77 결정 ②) — 순수.
 * 영상 대회는 유튜브 썸네일 두 주소(비율이 맞는 원본 → hqdefault), 그림 대회는 그 그림 하나. 다 실패하면 이니셜.
 */
import type { CrownData } from "./formats";

/** 유튜브 회색 자리 그림(없는 썸네일)의 폭 — 이 이하는 실패로 본다(lib/thumbnail/poster 와 같은 기준). */
export const PLACEHOLDER_MAX_WIDTH = 120;

export function photoCandidates(data: Pick<CrownData, "photoUrl" | "photoFallbackUrl">): string[] {
  return [data.photoUrl, data.photoFallbackUrl].filter((u): u is string => Boolean(u));
}

export function isUsablePhoto(naturalWidth: number): boolean {
  return naturalWidth > PLACEHOLDER_MAX_WIDTH;
}
