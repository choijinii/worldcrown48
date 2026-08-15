/**
 * mediaSlot — pure Contestant media swap decision (ND-1 §3 #12, AC 10).
 *
 * The Contestant grid历来 renders `imageUrl`. This adds an OPTIONAL `media` grail
 * (image | embed | clip) with 100% backward compat: no `media` → image. The
 * decision is pure so MediaSlot stays a thin renderer.
 *
 *   image → the licensed still (Level 1/2 사진, 48칸 그리드용)
 *   embed → 파사드 패턴(정지 썸네일 → hover 시 공식 iframe lazy-load, mute·start),
 *           준거 docs/demos/WC48_embed_demo_v1.html
 *   clip  → 스키마 예약만. 저장은 되나 렌더 경로 없음 — decideMediaRender는 clip을
 *           절대 'embed'로 내보내지 않고 image(있으면)/none으로 fallback한다.
 *           (클립 파이프라인은 저작권 상담 답변 후 별도 모듈.)
 */

export type MediaKind = "image" | "embed" | "clip";

export interface EmbedMedia {
  videoId: string;
  /** 시작 초 (선택). */
  start?: number;
  /** 종료 초 (선택 — clip 예약용, embed 파사드는 미사용). */
  end?: number;
}

export interface ContestantMedia {
  type: MediaKind;
  embed?: EmbedMedia;
}

export interface EmbedFacade {
  videoId: string;
  /** 정지 썸네일 (hover 전 표시). */
  thumbnailUrl: string;
  /** hover/클릭 시 mount할 공식 iframe src (mute·autoplay·start). */
  iframeSrc: string;
}

export type MediaRenderDecision =
  | { render: "image"; imageUrl: string }
  | { render: "embed"; facade: EmbedFacade }
  | { render: "none" };

/**
 * LAB-EV-1: id 판정·추출은 `lib/embed/youtubeUrl` 하나만 쓴다. 검수기(48개 일괄
 * 검증)와 카드 렌더가 서로 다른 정규식을 들고 있으면 "검수기는 통과라는데 카드가
 * 안 나온다"가 생긴다. 여기서는 기존 이름(계약)만 유지한 채 위임한다.
 */
export {
  isValidVideoId,
  extractVideoIdFromUrl as extractVideoId,
} from "@/lib/embed/youtubeUrl";
import { isValidVideoId } from "@/lib/embed/youtubeUrl";

/** Build the facade (nocookie · lazy · mute · start) for an embed. */
export function buildEmbedFacade(embed: EmbedMedia): EmbedFacade {
  const params = ["autoplay=1", "mute=1", "playsinline=1", "rel=0"];
  if (typeof embed.start === "number" && embed.start > 0) {
    params.push(`start=${Math.floor(embed.start)}`);
  }
  return {
    videoId: embed.videoId,
    thumbnailUrl: `https://i.ytimg.com/vi/${embed.videoId}/hqdefault.jpg`,
    iframeSrc: `https://www.youtube-nocookie.com/embed/${embed.videoId}?${params.join("&")}`,
  };
}

function imageOrNone(imageUrl: string): MediaRenderDecision {
  return imageUrl ? { render: "image", imageUrl } : { render: "none" };
}

/**
 * Decide what MediaSlot renders. `clip` NEVER renders (schema-only) — it falls
 * back to the still image, same as an image/absent media. Only a valid embed
 * video id yields the 'embed' facade path.
 */
export function decideMediaRender(
  media: ContestantMedia | undefined,
  imageUrl: string,
): MediaRenderDecision {
  if (media?.type === "embed" && isValidVideoId(media.embed?.videoId)) {
    return { render: "embed", facade: buildEmbedFacade(media.embed!) };
  }
  // image · clip · absent · invalid-embed → the licensed still (backward compat).
  return imageOrNone(imageUrl);
}
