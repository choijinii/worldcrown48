/**
 * stageCrop — 무대 영상 자료 (ARENA-1 PR 1 · YT-FIX-1 · 원장 D-76).
 *
 * 정사각 크롭은 폐기했다(D-76) — 플레이어는 16:9 상자에 자르지 않고 넣고, 세로 영상의 포스터는
 * 같은 상자 안에 양옆 검은 띠로 놓는다. 여기는 포스터 주소와 재생 구간만 다룬다.
 */
import { isValidVideoId } from "@/lib/embed/youtubeUrl";
import { LOOP_SECONDS } from "@/lib/embed/constants";
import type { ContestantMedia, EmbedOrientation } from "@/lib/media/mediaSlot";

export type { EmbedOrientation };

/** 세로 영상의 기본 잘림 기준 — 위 40 : 아래 60 (D-11). */
export const DEFAULT_FOCUS_Y = 40;

/** 무대 루프 길이 = 검수기·functions 와 같은 한 값 (D-12: 15초). */
export const STAGE_LOOP_SECONDS = LOOP_SECONDS;

function clampFocus(focusY: number | undefined): number {
  const v = typeof focusY === "number" && Number.isFinite(focusY) ? focusY : DEFAULT_FOCUS_Y;
  return Math.min(100, Math.max(0, v));
}

/**
 * 포스터 원본 — **영상과 같은 비율의 그림**이어야 위 크롭이 성립한다.
 *
 * 유튜브 기본 썸네일 `hqdefault` 는 480×360(4:3)이라, 세로 숏츠는 양옆에 흐린 띠가,
 * 가로 영상은 위아래에 검은 띠가 그림 안에 박혀 있다(2026-09-19 실측). cover 로 자르면
 * 그 띠가 칸에 그대로 보인다. 그래서 비율이 맞는 원본을 먼저 쓰고, 없으면 hqdefault 로
 * 물러난다(두 번째 주소).
 *   세로 → oar2.jpg (원본 비율, 숏츠 1080×1920)
 *   가로 → hq720.jpg (1280×720)
 */
export function posterSources(videoId: string, orientation: EmbedOrientation): string[] {
  const base = `https://i.ytimg.com/vi/${videoId}`;
  const primary = orientation === "portrait" ? "oar2.jpg" : "hq720.jpg";
  return [`${base}/${primary}`, `${base}/hqdefault.jpg`];
}

export interface StageMedia {
  videoId: string;
  orientation: EmbedOrientation;
  focusY: number;
  startSec: number;
  endSec: number;
}

/**
 * Contestant 의 영상 자료를 무대가 쓰는 모양으로. 영상이 없거나 id 가 틀리면 null —
 * 무대는 정지 포스터(없으면 이니셜) 그대로 둔다 (D-12 "영상이 없으면 정지 포스터 그대로").
 *
 * 옛 문서(orientation·focusY·end 없음)는 가로 · 40 · start+15초로 읽는다.
 */
export function resolveStageMedia(media: ContestantMedia | undefined): StageMedia | null {
  const embed = media?.embed;
  if (!embed || !isValidVideoId(embed.videoId) || embed.gone) return null;
  const startSec = typeof embed.start === "number" && embed.start > 0 ? Math.floor(embed.start) : 0;
  const endSec =
    typeof embed.end === "number" && embed.end > startSec
      ? Math.floor(embed.end)
      : startSec + STAGE_LOOP_SECONDS;
  return {
    videoId: embed.videoId,
    orientation: embed.orientation === "portrait" ? "portrait" : "landscape",
    focusY: clampFocus(embed.focusY),
    startSec,
    endSec,
  };
}
