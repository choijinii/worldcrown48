/**
 * 이미지 검색 AI · 주소 여러 줄의 화면 쪽 순수 층 (IMAGE-1 PR 2 · 원장 D-77 ②③).
 *
 * 서버: functions/src/autoSourceImages.ts(`core/imageSearchCore`). 이 파일은 Firestore · 콜러블을 모른다 —
 * 어느 칸을 찾을지, 몇 칸씩 부를지, 돌아온 값을 칸에 어떻게 얹을지만 정한다.
 *
 * 검색 결과는 서버에서 버려진다. 화면이 받는 것은 우리 복사본 주소 · 크기와 출처 두 개
 * (sourceUrl = 그림 주소 · sourcePage = 그 그림이 있던 페이지)뿐이고, 그것만 초안 칸에 싣는다.
 */
import type { ContestantDraft } from "@/lib/lab/tournamentDoc";
import type { MediaKind } from "@/lib/lab/mediaKind";
import { slotHasImage, type ImageFields } from "@/lib/lab/entryImages";

/** 한 번에 부르는 칸 수 — 진행 표시가 움직이고, 함수 시간(540초) 안에 넉넉히 끝난다. */
export const IMAGE_CHUNK = 6;
export const IMAGE_LINES_MAX = 48;

export interface ImageTarget {
  slot: number;
  name: string;
  affiliation?: string;
}

export type SlotImageResult =
  | {
      slot: number;
      ok: true;
      url: string;
      thumbUrl: string;
      storagePath: string;
      width: number;
      height: number;
      addedAt: number;
      sourceUrl: string;
      sourcePage: string;
    }
  | { slot: number; ok: false; reason: "not-found" | "search-error" };

export type AutoSourceImagesResponse =
  | { ok: true; results: SlotImageResult[]; code?: "limit" }
  | { ok: false; code: "no-key" };

/** 이름이 있고 그림이 없는 칸. `only` 가 있으면 그 칸들 안에서만(빈칸 버튼 = 이번에 채운 칸). */
export function imageTargets(drafts: readonly ContestantDraft[], only?: readonly number[]): ImageTarget[] {
  const allow = only ? new Set(only) : null;
  const out: ImageTarget[] = [];
  drafts.forEach((d, slot) => {
    if (allow && !allow.has(slot)) return;
    const name = (d?.name ?? "").trim();
    if (!name || slotHasImage(d)) return;
    const affiliation = (d.affiliation ?? "").trim();
    out.push(affiliation ? { slot, name, affiliation } : { slot, name });
  });
  return out;
}

/** 다른 칸이 이미 쓴 그림의 원본 주소 — 같은 그림이 두 칸에 들어가지 않게(서버 excludeUrls). */
export function usedImageUrls(drafts: readonly ContestantDraft[], exceptSlots: readonly number[]): string[] {
  const skip = new Set(exceptSlots);
  const out: string[] = [];
  drafts.forEach((d, slot) => {
    const u = d?.imageUrl ? d.imageSource?.sourceUrl : undefined;
    if (!skip.has(slot) && u) out.push(u);
  });
  return out;
}

/** [새 이미지 찾기] — 이미지 대회에서 검색으로 들어온 그림 칸에만. 손으로 넣은 칸(파일 · 주소)은 아니다(D-89). */
export function imageRefreshVisible(c: ContestantDraft, kind: MediaKind | null): boolean {
  return kind === "image" && Boolean(c.imageUrl) && c.imageSource?.origin === "search";
}

export interface ImageChunkDeps {
  call(slots: ImageTarget[], excludeUrls: string[]): Promise<AutoSourceImagesResponse>;
  onChunk?(results: SlotImageResult[]): void;
  onProgress?(done: number, total: number): void;
}

export interface ImageChunkSummary {
  found: number;
  notFound: number[];
  /** Brave 가 오류를 낸 칸(문구 16) — 못 찾은 칸(notFound · 문구 6)과 따로 센다. */
  searchErrors: number[];
  stopped: "limit" | "no-key" | "error" | null;
  /** 한도 · 키 없음 · 오류로 처리하지 못한 칸 수. */
  remaining: number;
  error?: unknown;
}

/**
 * 6칸씩 차례로 부른다. 묶음마다 바로 얹어(onChunk) 중간에 멈춰도 앞 결과가 칸에 남는다.
 * 앞 묶음이 고른 그림 주소는 뒤 묶음의 제외 목록에 더한다.
 */
export async function runImageChunks(
  targets: readonly ImageTarget[],
  excludeUrls: readonly string[],
  deps: ImageChunkDeps,
): Promise<ImageChunkSummary> {
  const exclude = [...excludeUrls];
  const notFound: number[] = [];
  const searchErrors: number[] = [];
  let found = 0;
  let done = 0;
  deps.onProgress?.(0, targets.length);
  for (let i = 0; i < targets.length; i += IMAGE_CHUNK) {
    const slots = targets.slice(i, i + IMAGE_CHUNK);
    let res: AutoSourceImagesResponse;
    try {
      res = await deps.call(slots, [...exclude]);
    } catch (error) {
      return { found, notFound, searchErrors, stopped: "error", remaining: targets.length - done, error };
    }
    if (!res.ok) return { found, notFound, searchErrors, stopped: "no-key", remaining: targets.length - done };
    deps.onChunk?.(res.results);
    for (const r of res.results) {
      if (r.ok) {
        found++;
        exclude.push(r.sourceUrl);
      } else if (r.reason === "search-error") searchErrors.push(r.slot);
      else notFound.push(r.slot);
    }
    done += res.results.length;
    deps.onProgress?.(done, targets.length);
    if (res.code === "limit") return { found, notFound, searchErrors, stopped: "limit", remaining: targets.length - done };
  }
  return { found, notFound, searchErrors, stopped: null, remaining: 0 };
}

/**
 * 이미지 검색 호출이 통째로 실패했을 때 어느 문구를 보일지 (대표 승인 15 · 16).
 *   network = 화면의 요청이 서버에 닿지 못했다(문구 15). Firebase 부품은 fetch 자체가 실패하면
 *             status 0 으로 보고 FunctionsError("internal", "internal")을 세부 없이 던진다 — 서버가 보낸
 *             오류에는 본문의 문구가 실리므로 이 모양과 겹치지 않는다. 브라우저가 오프라인이어도 network.
 *   server  = 서버까지 닿았으나 우리 함수 또는 Brave 가 오류(문구 16). 한도(402/429)는 오류가 아니라
 *             결과의 code "limit"(문구 14)으로 온다.
 *   permission = 운영자 권한 오류(기존 문구).
 */
export function imageSearchFailureKind(
  err: unknown,
  online: boolean = typeof navigator === "undefined" ? true : navigator.onLine !== false,
): "network" | "server" | "permission" {
  const e = (err ?? {}) as { code?: unknown; message?: unknown; details?: unknown };
  const code = String(e.code ?? "").replace(/^functions\//, "");
  if (code === "permission-denied" || code === "unauthenticated") return "permission";
  if (!online) return "network";
  if (code === "internal" && e.message === "internal" && e.details === undefined) return "network";
  return "server";
}

/** 검색 결과 한 칸 → 초안 칸 값(origin search). 출처는 두 주소뿐. */
export function fieldsFromSearch(r: Extract<SlotImageResult, { ok: true }>): ImageFields {
  return {
    imageUrl: r.url,
    imageThumbUrl: r.thumbUrl,
    imageStoragePath: r.storagePath,
    imageSource: { origin: "search", sourceUrl: r.sourceUrl, sourcePage: r.sourcePage },
    imageWidth: r.width,
    imageHeight: r.height,
    imageAddedAt: r.addedAt,
  };
}

/**
 * 찾은 칸에 그림을 얹는다. 기다리는 사이 손으로 그림을 넣은 칸은 덮지 않는다 —
 * [새 이미지 찾기]만 `replace` 로 지금 그림을 바꾼다. 그림 위치(imageFocusY)는 새 그림이라 뗀다.
 */
export function applyImageResults(
  drafts: readonly ContestantDraft[],
  results: readonly SlotImageResult[],
  opts: { replace?: boolean } = {},
): ContestantDraft[] {
  const next = [...drafts];
  for (const r of results) {
    if (!r.ok || !next[r.slot]) continue;
    if (slotHasImage(next[r.slot]) && !opts.replace) continue;
    const { imageFocusY, ...rest } = next[r.slot];
    void imageFocusY;
    next[r.slot] = { ...rest, ...fieldsFromSearch(r) };
  }
  return next;
}

export interface ImageLine {
  /** 눈에 보이는 줄 번호(1부터 · 빈 줄도 센다) — 실패 줄 문구 "{n}번째 줄"에 쓴다. */
  line: number;
  url: string;
}

/** 한 줄에 주소 하나. 빈 줄은 건너뛰고 48줄까지만 받는다. */
export function parseImageLines(text: string): ImageLine[] {
  const out: ImageLine[] = [];
  text.split(/\r?\n/).forEach((raw, i) => {
    const url = raw.trim();
    if (url && out.length < IMAGE_LINES_MAX) out.push({ line: i + 1, url });
  });
  return out;
}

/** 그림이 없는 칸부터 칸 순서대로 한 줄씩. 칸이 모자라면 남는 줄은 배정하지 않는다. */
export function assignImageLines(
  drafts: readonly ContestantDraft[],
  lines: readonly ImageLine[],
  total: number,
): (ImageLine & { slot: number })[] {
  const free: number[] = [];
  for (let i = 0; i < total; i++) if (!slotHasImage(drafts[i])) free.push(i);
  return lines.slice(0, free.length).map((l, k) => ({ ...l, slot: free[k] }));
}
