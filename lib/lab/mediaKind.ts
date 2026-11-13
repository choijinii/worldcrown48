/**
 * mediaKind — 대회 종류: 영상 대회 또는 이미지 대회 (LAB-FIX-3 추가분 · 원장 D-90).
 *
 * 대회 하나에 영상 엔트리와 그림 엔트리가 섞이지 않는다("영상은 영상끼리, 이미지는 이미지끼리" — 대표).
 * 종류는 편집기에서 처음 누른 생성 버튼([동영상 생성] / [이미지 생성])이 정해 초안에 저장한다.
 * 종류 칸이 없는 옛 초안은 칸에서 추론한다: 영상이 하나라도 있으면 영상 대회, 그림만 있으면 이미지 대회,
 * 둘 다 있으면 영상 대회(섞임 — 발행 전에 반대 종류를 빼야 한다).
 */
import type { ContestantDraft } from "@/lib/lab/tournamentDoc";

export type MediaKind = "video" | "image";
export const MEDIA_KINDS: readonly MediaKind[] = ["video", "image"];

type Media = Pick<ContestantDraft, "videoId" | "imageUrl">;

const hasVideo = (c: Media | undefined) => Boolean(c?.videoId);
const hasImage = (c: Media | undefined) => Boolean(c?.imageUrl);

export function isMediaKind(v: unknown): v is MediaKind {
  return v === "video" || v === "image";
}

export function inferMediaKind(cs: readonly Media[]): { kind: MediaKind | null; mixed: boolean } {
  const anyVideo = cs.some(hasVideo);
  const anyImage = cs.some(hasImage);
  if (anyVideo) return { kind: "video", mixed: anyImage };
  if (anyImage) return { kind: "image", mixed: false };
  return { kind: null, mixed: false };
}

/** 저장값이 맞으면 그것, 없거나 모르는 값이면 칸에서 추론. */
export function resolveMediaKind(stored: unknown, cs: readonly Media[]): MediaKind | null {
  return isMediaKind(stored) ? stored : inferMediaKind(cs).kind;
}

/** 섞이면 발행 안 됨 — 영상 대회에 그림 0 · 이미지 대회에 영상 0 · 미정이면 둘이 함께 있지 않을 것. */
export function isMediaPublishable(kind: MediaKind | null, cs: readonly Media[]): boolean {
  if (kind === "video") return !cs.some(hasImage);
  if (kind === "image") return !cs.some(hasVideo);
  return !(cs.some(hasVideo) && cs.some(hasImage));
}
