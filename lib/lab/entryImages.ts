/**
 * ① 파일 48장 · ④ 칸마다의 순수 부분 (IMAGE-1 PR 1 · 원장 D-77).
 *
 * 파일 이름 자연 정렬 순서로 **빈 칸부터** 채운다. 칸 이름이 비어 있으면 파일 이름에서 숫자·확장자를
 * 뗀 것을 이름 후보로 쓴다(`13_뉴진스.jpg` → 뉴진스). 브라우저 줄이기 크기는 서버와 같은 규칙
 * (긴 변 1600 · 사본 600 · 키우지 않음). 대표가 고른 파일은 믿는다 — 세로 하한은 없다(지시서 5절).
 */
import { isValidVideoId } from "@/lib/embed/youtubeUrl";
import { buildThumbnailUrl } from "@/lib/embed/loopRange";
import type { ContestantDraft } from "@/lib/lab/tournamentDoc";

export const ENTRY_IMAGE_CLIENT = {
  LONG_EDGE: 1600,
  THUMB_EDGE: 600,
  MAX_BYTES: 10 * 1024 * 1024,
  SLOTS: 48,
  JPEG_QUALITY: 0.85,
} as const;

const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" });

export function naturalSortFiles<T extends { name: string }>(files: readonly T[]): T[] {
  return [...files].sort((a, b) => collator.compare(a.name, b.name));
}

/** "13_뉴진스.jpg" → "뉴진스" · "001.png" → "" (앞뒤 숫자 · 구분자 · 확장자를 뗀다). */
export function nameCandidate(fileName: string): string {
  const stem = fileName.replace(/\.[A-Za-z0-9]{2,5}$/, "");
  return stem
    .replace(/^[\s\d_\-.()[\]]+/, "")
    .replace(/[\s_\-.]+$/, "")
    .trim();
}

/** 빈 칸 번호를 앞에서부터 count 개까지(48칸 기준). 넘치는 파일은 버린다. */
export function assignToEmptySlots(slotsFilled: readonly boolean[], count: number): number[] {
  const out: number[] = [];
  for (let i = 0; i < ENTRY_IMAGE_CLIENT.SLOTS && out.length < count; i++) {
    if (!slotsFilled[i]) out.push(i);
  }
  return out;
}

export function fitLongEdge(w: number, h: number, max: number): { w: number; h: number } {
  const long = Math.max(w, h);
  if (long <= max) return { w, h };
  const k = max / long;
  return { w: Math.round(w * k), h: Math.round(h * k) };
}

/** 칸 카드 미리보기: 영상 썸네일 > 그림 600 사본 > 없음. "그림" 배지는 그림만 있을 때. */
export function slotPreview(c: ContestantDraft): { url: string; imageOnly: boolean } {
  if (isValidVideoId(c.videoId ?? "")) return { url: buildThumbnailUrl(c.videoId!), imageOnly: false };
  const url = c.imageThumbUrl || c.imageUrl || "";
  return { url, imageOnly: Boolean(url) };
}

/** 칸이 "찼다" = 그림이 이미 있다(① 은 그림 없는 칸부터 채운다). */
export function slotHasImage(c: ContestantDraft | undefined): boolean {
  return Boolean(c?.imageUrl);
}

export type ImageFields = Pick<
  ContestantDraft,
  | "imageUrl"
  | "imageThumbUrl"
  | "imageStoragePath"
  | "imageSource"
  | "imageWidth"
  | "imageHeight"
  | "imageAddedAt"
>;

/** 서버가 돌려준 ④ URL 결과 → 초안 칸 값. */
export function fieldsFromImport(r: {
  url: string;
  thumbUrl: string;
  storagePath: string;
  width: number;
  height: number;
  addedAt: number;
  sourceUrl: string;
  sourcePage: string;
}): ImageFields {
  return {
    imageUrl: r.url,
    imageThumbUrl: r.thumbUrl,
    imageStoragePath: r.storagePath,
    imageSource: { origin: "url", sourceUrl: r.sourceUrl, sourcePage: r.sourcePage },
    imageWidth: r.width,
    imageHeight: r.height,
    imageAddedAt: r.addedAt,
  };
}

/** 칸에서 그림 칸 전부를 뗀다. */
export function clearImageFields(d: ContestantDraft): ContestantDraft {
  const { imageUrl, imageThumbUrl, imageStoragePath, imageSource, imageWidth, imageHeight, imageAddedAt, imageFocusY, ...rest } = d;
  void [imageUrl, imageThumbUrl, imageStoragePath, imageSource, imageWidth, imageHeight, imageAddedAt, imageFocusY];
  return rest;
}
