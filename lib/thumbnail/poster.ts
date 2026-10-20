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

/**
 * hqdefault(4:3 · 480×360) 폴백의 검은 띠를 칸 밖으로 미는 확대 배율 (코티오 승인 ⑥ · 2026-10-19).
 *
 * hqdefault 는 영상을 4:3 틀에 넣어 띠까지 그림에 박아 둔다. 반쪽 칸(8:9)에 cover 로 채운 뒤
 * **가운데 기준**으로 이만큼 키운다 — 새 그림을 만들거나 저장하지 않는다(CSS 확대뿐).
 *   가로 영상: 내용 = 가운데 3/4 높이 → 4/3 배
 *   세로 영상: 내용 = 가운데 27/64 폭(= 칸 높이의 9/16) → 칸 폭 8/9 ÷ 9/16 = 128/81 배
 * 첫 주소(hq720 · oar2)는 띠가 없어 1. 마지막 주소가 hqdefault 다(`posterSources`).
 */
export function posterZoom(index: number, total: number, orientation: "landscape" | "portrait"): number {
  if (index < total - 1) return 1;
  return orientation === "portrait" ? 128 / 81 : 4 / 3;
}
