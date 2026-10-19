/**
 * 대표 매치(대회 썸네일) — 게시된 대회의 `thumbnailPair` 를 화면 두 칸으로 푼다
 * (THUMB-1 · 원장 D-35 · 킥 §4·§5).
 *
 * 썸네일은 **파일로 합성·저장하지 않는다**(법리) — 두 엔트리의 포스터를 화면에서
 * 나란히 보일 뿐이다. 이 모듈은 "어느 엔트리를 · 어디를 보일지"만 정한다.
 *
 *   · 고른 엔트리가 살아 있으면 그대로(위치 값도 그대로)
 *   · 지워졌거나 그림이 깨졌으면(킥 §4 ㉣ — `usable: false`) 살아 있는 엔트리 중
 *     **앞 번호**로 대체하고 위치는 기본값. A·B 는 겹치지 않는다.
 *   · 필드가 없는 옛 대회 = 1번·2번 + 기본 위치. 백필하지 않는다.
 *
 * 위치 값(0~100)은 16:9 커버의 반쪽(8:9) 칸에서 원본을 **한 방향으로만** 옮긴다:
 * 가로 영상은 좌우, 세로 사진은 위아래. 기본값 = 매치 무대 규칙(D-11·D-15).
 */
import { DEFAULT_FOCUS_Y, type EmbedOrientation } from "@/lib/media/stageCrop";

/** Tournament 문서의 `thumbnailPair` — a·b 는 contestants 문서 id. */
export interface ThumbnailPair {
  a: string;
  b: string;
  aPos: number;
  bPos: number;
}

/** 대체 판단에 필요한 엔트리 한 개. `usable: false` = 그림이 깨져 못 쓰는 엔트리(㉣). */
export interface PairEntry {
  id: string;
  /** 엔트리 번호 1~48 (contestants.order). */
  order: number;
  orientation: EmbedOrientation;
  usable: boolean;
}

export interface ResolvedSide {
  entry: PairEntry;
  pos: number;
}

export interface ResolvedPair {
  a: ResolvedSide | null;
  b: ResolvedSide | null;
  /** 고른 엔트리 대신 다른 엔트리가 들어갔다(관리자 표시용). 옛 대회의 1·2번은 대체가 아니다. */
  replaced: boolean;
}

/** 가로 영상 = 가운데 50 · 세로 = 위 40 (D-11·D-15). */
export function defaultPos(orientation: EmbedOrientation): number {
  return orientation === "portrait" ? DEFAULT_FOCUS_Y : 50;
}

export function clampPos(value: unknown, orientation: EmbedOrientation): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return defaultPos(orientation);
  return Math.min(100, Math.max(0, value));
}

/** 반쪽 칸 포스터 `<img>` 의 object-position. 움직이지 않는 축은 50 에 고정한다. */
export function coverObjectPosition(orientation: EmbedOrientation, pos: number): string {
  const p = clampPos(pos, orientation);
  return orientation === "portrait" ? `50% ${p}%` : `${p}% 50%`;
}

export function resolveThumbnailPair(
  pair: ThumbnailPair | null | undefined,
  entries: readonly PairEntry[],
): ResolvedPair {
  const alive = entries.filter((e) => e.usable).sort((x, y) => x.order - y.order);
  const byId = new Map(alive.map((e) => [e.id, e]));

  const keptA = pair ? byId.get(pair.a) : undefined;
  const keptB = pair && pair.b !== pair.a ? byId.get(pair.b) : undefined;
  const firstFree = (taken: PairEntry | undefined) => alive.find((e) => e !== taken);

  const aEntry = keptA ?? firstFree(keptB);
  const bEntry = keptB ?? firstFree(aEntry);

  const side = (e: PairEntry | undefined, kept: boolean, pos: number | undefined) =>
    e ? { entry: e, pos: kept ? clampPos(pos, e.orientation) : defaultPos(e.orientation) } : null;

  return {
    a: side(aEntry, Boolean(keptA), pair?.aPos),
    b: side(bEntry, Boolean(keptB), pair?.bPos),
    replaced: Boolean(pair) && (!keptA || !keptB),
  };
}
