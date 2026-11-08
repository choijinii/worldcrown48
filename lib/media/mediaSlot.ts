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

/**
 * LAB-EV-1: 검수기가 남기는 마지막 판정. 주간 재검증 크론(W7)이 갱신하고 Lab
 * 목록의 ⚠️ 배지가 이걸 읽는다. `embeddable=false`면 링크를 갈아야 한다.
 */
export interface EmbedStatus {
  embeddable: boolean;
  /** pass · warn · blocked (lib/embed/verdict의 LinkStatus와 같은 값). */
  status: string;
  reasons: string[];
  /** epoch ms. */
  checkedAt: number;
}

export interface EmbedMedia {
  videoId: string;
  /** 시작 초 (선택). */
  start?: number;
  /** 종료 초 (선택 — 루프 끝점(15초 · D-12) · clip 예약 겸용). */
  end?: number;
  /**
   * LAB-EV-1 W6 — 출처 원본 watch URL(ADR-EV-3 출처 칩·[원본 열기]).
   * videoId로 다시 만들 수 있지만, 운영자가 검수한 시점의 시작 초가 박힌 URL을
   * 그대로 남겨두면 "무엇을 보고 통과시켰는지"가 문서에 남는다.
   */
  sourceUrl?: string;
  /** LAB-EV-1 W6 — 최근 검증 결과(크론이 갱신). */
  status?: EmbedStatus;
  /**
   * ARENA-1 (원장 D-11 · D-14) — 영상 비율. 무대 재생기가 iframe 비율을 이 값으로 정한다
   * (영상과 비율이 다르면 유튜브가 검은 띠를 넣는다). 없으면 가로 — 선택 필드 추가일 뿐
   * 기존 문서는 그대로 읽힌다(마이그레이션 없음 · R1).
   */
  orientation?: EmbedOrientation;
  /**
   * ARENA-1 (원장 D-11) — 세로 영상을 정사각으로 자를 때 위에서 버리는 비율(0~100, 기본 40).
   * 포스터 object-position 과 iframe top 이 같은 값을 쓴다(D-15). 가로 영상은 쓰지 않는다.
   */
  focusY?: number;
  /**
   * YT-FIX-1 (III.E.4) — 재검사에서 내려갔거나 비공개로 확인된 영상. 썸네일 대신 이름 첫 글자를 쓴다.
   * status 와 따로 둔다 — status 는 끝난 대회에서 지워지지만 이 표시는 남아야 한다. 영상이 되살아나면
   * 재검사가 걷고, 운영자가 링크를 갈면 embed 가 통째로 새로 써져 사라진다.
   */
  gone?: boolean;
}

export type EmbedOrientation = "landscape" | "portrait";

/**
 * IMAGE-1 (원장 D-77) — 엔트리 그림. 어느 길로 들어오든 우리 Firebase Storage 복사본이다
 * (`url`·`thumbUrl` 은 토큰 없는 공개 주소). 바깥 주소는 `sourceUrl`·`sourcePage` 에 기록만 한다.
 * `search` 는 PR 2(이미지 검색) 예약값.
 */
export type EntryImageOrigin = "upload" | "url" | "search";
export const ENTRY_IMAGE_ORIGINS: readonly EntryImageOrigin[] = ["upload", "url", "search"];

export interface EntryImage {
  /** 긴 변 1600 jpg. */
  url: string;
  /** 긴 변 600 사본. */
  thumbUrl: string;
  storagePath: string;
  /** 그림 자체의 바깥 주소(④ URL · ② 검색). */
  sourceUrl?: string;
  /** 출처 페이지 — 무대에는 이 주소의 도메인 글자만 보인다(링크 없음 · D-77). */
  sourcePage?: string;
  origin: EntryImageOrigin;
  width: number;
  height: number;
  /** epoch ms — 주소 끝 `&v=` 로 캐시를 깬다. */
  addedAt: number;
  /** 16:9 무대에서 자를 때 위에서 버리는 비율 0~100(기본 40). 영상 focusY 와 따로 둔다. */
  focusY?: number;
}

export interface ContestantMedia {
  type: MediaKind;
  embed?: EmbedMedia;
  /** IMAGE-1 — 영상과 함께 있을 수 있다. 보여 줄 때는 영상이 먼저다. */
  image?: EntryImage;
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
import { buildThumbnailUrl } from "@/lib/embed/loopRange";

/** Build the facade (nocookie · lazy · mute · start) for an embed. */
export function buildEmbedFacade(embed: EmbedMedia): EmbedFacade {
  const params = ["autoplay=1", "mute=1", "playsinline=1", "rel=0"];
  if (typeof embed.start === "number" && embed.start > 0) {
    params.push(`start=${Math.floor(embed.start)}`);
  }
  return {
    videoId: embed.videoId,
    thumbnailUrl: buildThumbnailUrl(embed.videoId),
    iframeSrc: `https://www.youtube-nocookie.com/embed/${embed.videoId}?${params.join("&")}`,
  };
}

/**
 * Contestant의 **정지 썸네일 한 장** — 임베드를 띄우지 않는 자리가 쓴다
 * (매치 카드 · THE FINAL · 랭킹 아바타 · Lab 그리드).
 *
 * LAB-UX-1 PR-2에서 `imageUrl`(운영자가 직접 붙이던 라이선스 스틸) 칸이 사라졌다.
 * 실데이터 528건 중 **한 번도 입력된 적이 없었다**. 그 자리를 대신하는 것이 이
 * 함수다: 소싱·검수를 통과해 슬롯에 들어온 영상의 유튜브 썸네일.
 *
 * 임베드(호버 재생)를 **새로 만들지 않는다**(대표 결정 2026-08-23). 여기서 나오는
 * 것은 언제나 정지 이미지 URL이고, 없으면 빈 문자열 — 호출부는 기존 폴백
 * (이름 이니셜 등)을 그대로 쓴다.
 */
export function contestantThumbnail(media: ContestantMedia | undefined): string {
  const videoId = media?.embed?.videoId;
  return videoId && isValidVideoId(videoId) && !media?.embed?.gone ? buildThumbnailUrl(videoId) : "";
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
  if (media?.type === "embed" && isValidVideoId(media.embed?.videoId) && !media.embed?.gone) {
    return { render: "embed", facade: buildEmbedFacade(media.embed!) };
  }
  // image · clip · absent · invalid-embed → the licensed still (backward compat).
  return imageOrNone(imageUrl);
}
