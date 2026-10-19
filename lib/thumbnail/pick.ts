/**
 * 편집기에서 대표 매치 고르기 (THUMB-1 · 킥 §3·§4-1).
 *
 * 그리드 칸(0~47)을 누르면 A → 다른 칸 → B → 세 번째부터 A 부터 교체.
 * 게시 전에는 자동 대체가 없다 — 고른 칸을 못 쓰게 되면 그 쪽이 비고 다시 골라야
 * 게시된다. 위치 값 null = 기본값(방향은 엔트리의 영상이 정한다, `pair.ts`).
 */
import type { EmbedOrientation } from "@/lib/media/stageCrop";
import { defaultPos } from "@/lib/thumbnail/pair";

export type PairSide = "a" | "b";

export interface PairPick {
  a: number | null;
  b: number | null;
  aPos: number | null;
  bPos: number | null;
  /** 다음에 누른 칸이 들어갈 쪽. */
  next: PairSide;
}

export const EMPTY_PICK: PairPick = { a: null, b: null, aPos: null, bPos: null, next: "a" };

export function pickSlot(p: PairPick, slot: number): PairPick {
  if (p.a === slot || p.b === slot) return p;
  // 빈 쪽이 있으면 그 쪽부터 채운다(A 먼저).
  const side: PairSide = p.a === null ? "a" : p.b === null ? "b" : p.next;
  return side === "a"
    ? { ...p, a: slot, aPos: null, next: "b" }
    : { ...p, b: slot, bPos: null, next: "a" };
}

export function setPickPos(p: PairPick, side: PairSide, pos: number): PairPick {
  const v = Number.isFinite(pos) ? Math.min(100, Math.max(0, pos)) : null;
  return side === "a" ? { ...p, aPos: v } : { ...p, bPos: v };
}

export function isPickComplete(p: PairPick): boolean {
  return p.a !== null && p.b !== null;
}

/** 못 쓰게 된 칸(`usable(slot) === false`)을 비운다. 바뀐 게 없으면 같은 객체. */
export function prunePick(p: PairPick, usable: (slot: number) => boolean): PairPick {
  const dropA = p.a !== null && !usable(p.a);
  const dropB = p.b !== null && !usable(p.b);
  if (!dropA && !dropB) return p;
  const next = { ...p };
  if (dropA) Object.assign(next, { a: null, aPos: null });
  if (dropB) Object.assign(next, { b: null, bPos: null });
  return next;
}

/** 게시할 때 실을 값 — 다 고르지 않았으면 null. 안 움직인 위치는 그 칸 영상 방향의 기본값. */
export function publishPair(
  p: PairPick,
  orientationOf: (slot: number) => EmbedOrientation,
): { a: number; b: number; aPos: number; bPos: number } | null {
  if (p.a === null || p.b === null) return null;
  return {
    a: p.a,
    b: p.b,
    aPos: p.aPos ?? defaultPos(orientationOf(p.a)),
    bPos: p.bPos ?? defaultPos(orientationOf(p.b)),
  };
}
