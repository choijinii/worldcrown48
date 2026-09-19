/**
 * stageCrop — 정사각 창문 크롭 (ARENA-1 PR 1 · 원장 D-11 · D-14 · D-15).
 *
 * 무대 칸은 정사각인데 영상은 16:9(가로) 또는 9:16(세로)다.
 *
 *   · 영상 <iframe> — 그림이 아니라 웹페이지를 담는 창이라 object-fit 이 듣지 않는다.
 *     iframe 을 **영상과 같은 비율**로 만든 뒤 정사각 창문(overflow:hidden)으로 자른다.
 *     비율이 다르면 유튜브가 스스로 검은 띠를 넣고, 창문으로 잘라도 띠가 따라온다 (D-11).
 *   · 정지 포스터 <img> — object-fit: cover + object-position.
 *   · 두 방식의 잘리는 자리가 같아야 포스터 → 영상 전환 때 인물이 튀지 않는다 (D-15 ①):
 *     가로는 둘 다 가운데, 세로는 둘 다 위에서 focusY% (기본 40 → 위 40 : 아래 60).
 *
 * 수치는 디자인 파일(Arena_Match_Stage_v1A_9boards_2026-09-19) crop() 그대로.
 * 48강 그리드(D-14, 런칭 후)도 만들 때 이 모듈을 그대로 쓴다.
 */
import { isValidVideoId } from "@/lib/embed/youtubeUrl";
import { LOOP_SECONDS } from "@/lib/embed/constants";
import type { ContestantMedia, EmbedOrientation } from "@/lib/media/mediaSlot";

export type { EmbedOrientation };

/** 세로 영상의 기본 잘림 기준 — 위 40 : 아래 60 (D-11). */
export const DEFAULT_FOCUS_Y = 40;

/** 무대 루프 길이 = 검수기·functions 와 같은 한 값 (D-12: 15초). */
export const STAGE_LOOP_SECONDS = LOOP_SECONDS;

/** 16:9 ↔ 9:16 을 정사각에 채울 때 긴 변 = 짧은 변 × 16/9 = 177.78%. 넘치는 양은 77.78%. */
const LONG_SIDE = 177.78;
const OVERFLOW = LONG_SIDE - 100;

const pct = (n: number): string => `${n.toFixed(2)}%`;

function clampFocus(focusY: number | undefined): number {
  const v = typeof focusY === "number" && Number.isFinite(focusY) ? focusY : DEFAULT_FOCUS_Y;
  return Math.min(100, Math.max(0, v));
}

export interface CropBox {
  width: string;
  height: string;
  left: string;
  top: string;
}

/** iframe 상자 — 정사각 창문 안에서의 크기·위치. */
export function videoCrop(orientation: EmbedOrientation, focusY?: number): CropBox {
  if (orientation === "portrait") {
    return {
      width: "100%",
      height: `${LONG_SIDE}%`,
      left: "0%",
      top: pct(-(OVERFLOW * clampFocus(focusY)) / 100),
    };
  }
  return { width: `${LONG_SIDE}%`, height: "100%", left: pct(-OVERFLOW / 2), top: "0%" };
}

/** 포스터 <img> — 같은 자리를 브라우저가 자르게 한다. */
export function posterCrop(
  orientation: EmbedOrientation,
  focusY?: number,
): { objectFit: "cover"; objectPosition: string } {
  const y = orientation === "portrait" ? clampFocus(focusY) : 50;
  return { objectFit: "cover", objectPosition: `center ${y}%` };
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
  if (!embed || !isValidVideoId(embed.videoId)) return null;
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
