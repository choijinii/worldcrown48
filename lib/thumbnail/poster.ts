/**
 * 포스터 불러오기의 다음 단계 (THUMB-1 · 킥 §4 ㉣).
 *
 * 포스터 주소는 `posterSources()` 의 두 개(비율 맞는 원본 → hqdefault)다. 유튜브는
 * 없는 해상도·지워진 영상에 404 대신 120×90 회색 그림을 줄 때가 있다(ARENA-1
 * StageSide 실측) — 그래서 "불러왔다"도 폭을 봐야 한다. 마지막 주소까지 실패하면
 * "그림 깨짐": 대표 매치에서는 지워진 엔트리처럼 대체한다(`resolveThumbnailPair`).
 */

/** 유튜브 회색 자리 그림의 폭. 이보다 좁으면 진짜 그림이 아니다. */
export const YT_PLACEHOLDER_WIDTH = 120;

export type PosterOutcome = "error" | { loadedWidth: number };
export type PosterStep = "ok" | "next" | "broken";

export function posterStep(index: number, total: number, outcome: PosterOutcome): PosterStep {
  const failed = outcome === "error" || outcome.loadedWidth <= YT_PLACEHOLDER_WIDTH;
  if (!failed) return "ok";
  return index < total - 1 ? "next" : "broken";
}
