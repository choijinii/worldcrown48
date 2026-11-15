/**
 * entryImageCore — 엔트리 그림 서버 코어 (IMAGE-1 PR 1 · 원장 D-77).
 *
 * 원칙: 어느 길로 들어오든 그림은 우리 Firebase Storage 복사본이다. 이 모듈은 Firestore·Storage 를
 * 모른다 — 내려받기 · 줄이기 · 입력 검사 · 복사 계획만. 콜러블(importEntryImage ·
 * finalizeEntryImages)이 인증·저장을 배선한다.
 *
 * 줄이기는 `canvas`(node-canvas 3 · 크라운 카드가 이미 쓴다)로 한다 — 새 의존성 0.
 */
import { isIP } from "node:net";
import { createCanvas, loadImage } from "canvas";

export const ENTRY_IMAGE = {
  LONG_EDGE: 1600,
  THUMB_EDGE: 600,
  MAX_BYTES: 10 * 1024 * 1024,
  MIN_HEIGHT: 400,
  FETCH_TIMEOUT_MS: 10_000,
} as const;

export const SLOT_COUNT = 48;
const JPEG_QUALITY = 0.85;

/** 화면이 3언어 문구로 바꾸는 실패 이유 4개(6절 ⓑ). */
export type ImportFailure = "fetch-failed" | "not-image" | "too-large" | "too-small";

export class ImportError extends Error {
  constructor(readonly code: ImportFailure, detail?: string) {
    super(detail ? `${code}: ${detail}` : code);
    this.name = "ImportError";
  }
}

/** 긴 변을 max 로 맞추고 비율을 지킨다. 이미 작으면 키우지 않는다. */
export function fitLongEdge(w: number, h: number, max: number): { w: number; h: number } {
  const long = Math.max(w, h);
  if (long <= max) return { w, h };
  const k = max / long;
  return { w: Math.round(w * k), h: Math.round(h * k) };
}

/**
 * 서버가 대신 부르는 주소이므로 내부망을 부르지 않게 막는다(관리자 전용 함수지만 한 겹 더).
 * 메타데이터 서버는 에뮬레이터에서도 늘 막는다. DNS 로 내부 주소를 가리키는 도메인은 여기서
 * 못 잡는다 — 관리자 게이트가 그 몫을 맡는다.
 */
/** IPv4 를 품은 IPv6(::ffff:a.b.c.d · ::ffff:7f00:1) → 안의 IPv4. 아니면 null. */
function mappedIPv4(h: string): string | null {
  const m = /^::ffff:(.+)$/.exec(h);
  if (!m) return null;
  if (isIP(m[1]) === 4) return m[1];
  const hex = /^([0-9a-f]{1,4}):([0-9a-f]{1,4})$/.exec(m[1]);
  if (!hex) return null;
  const hi = parseInt(hex[1], 16);
  const lo = parseInt(hex[2], 16);
  return `${hi >> 8}.${hi & 255}.${lo >> 8}.${lo & 255}`;
}

export function isBlockedHost(hostname: string, allowLoopback: boolean): boolean {
  let h = hostname.toLowerCase().replace(/^\[|\]$/g, "").replace(/\.$/, "");
  h = mappedIPv4(h) ?? h;
  if (h === "metadata.google.internal" || h.startsWith("169.254.")) return true;
  const loopback = h === "localhost" || h === "::1" || h.startsWith("127.");
  if (loopback) return !allowLoopback;
  if (h === "::") return true;
  if (isIP(h) === 4) {
    const [a, b] = h.split(".").map(Number);
    if (a === 0) return true;
    if (a === 10) return true;
    if (a === 192 && b === 168) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 100 && b >= 64 && b <= 127) return true; // 통신사 공유 주소(100.64/10)
    return false;
  }
  if (isIP(h) === 6) return h.startsWith("fc") || h.startsWith("fd") || h.startsWith("fe80");
  return false;
}

const MAX_REDIRECTS = 3;

export interface FetchOptions {
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
  /** 에뮬레이터 시험의 로컬 가짜 서버용. 실서비스는 false. */
  allowLoopback?: boolean;
}

/** 주소에서 그림 바이트를 받는다. 머리말 · 흘러온 길이 둘 다 10MB 상한을 본다. */
export async function fetchImageBytes(url: string, opts: FetchOptions = {}): Promise<Buffer> {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    throw new ImportError("fetch-failed", "bad url");
  }
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), opts.timeoutMs ?? ENTRY_IMAGE.FETCH_TIMEOUT_MS);
  try {
    // 되돌림(3xx)은 직접 따라간다 — 한 번 넘어갈 때마다 내부 주소인지 다시 본다(리뷰 I-4).
    let res: Response | null = null;
    for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
      if (u.protocol !== "http:" && u.protocol !== "https:") throw new ImportError("fetch-failed", "protocol");
      if (isBlockedHost(u.hostname, opts.allowLoopback === true)) throw new ImportError("fetch-failed", "blocked host");
      let r: Response;
      try {
        r = await (opts.fetchImpl ?? fetch)(u.toString(), { signal: ctrl.signal, redirect: "manual" });
      } catch (e) {
        throw new ImportError("fetch-failed", String(e));
      }
      const location = r.headers.get("location");
      if (r.status >= 300 && r.status < 400 && location) {
        void r.body?.cancel().catch(() => undefined);
        try {
          u = new URL(location, u);
        } catch {
          throw new ImportError("fetch-failed", "bad redirect");
        }
        continue;
      }
      res = r;
      break;
    }
    if (!res) throw new ImportError("fetch-failed", "too many redirects");
    if (!res.ok) throw new ImportError("fetch-failed", `status ${res.status}`);
    const type = (res.headers.get("content-type") ?? "").toLowerCase();
    if (!type.startsWith("image/")) throw new ImportError("not-image", type);
    const len = Number(res.headers.get("content-length"));
    if (Number.isFinite(len) && len > ENTRY_IMAGE.MAX_BYTES) throw new ImportError("too-large");
    if (!res.body) throw new ImportError("fetch-failed", "no body");

    const chunks: Buffer[] = [];
    let total = 0;
    const reader = res.body.getReader();
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        total += value.byteLength;
        if (total > ENTRY_IMAGE.MAX_BYTES) throw new ImportError("too-large");
        chunks.push(Buffer.from(value));
      }
    } catch (e) {
      if (e instanceof ImportError) throw e;
      throw new ImportError("fetch-failed", String(e));
    }
    return Buffer.concat(chunks);
  } finally {
    clearTimeout(timer);
    ctrl.abort();
  }
}

/**
 * 긴 변 1600 jpg + 600 jpg. 세로 400px 미만은 거부(D-77 하한 · ④ URL 만 서버가 판정한다).
 * 반환 width/height 는 1600 판의 크기.
 */
export async function resizeToJpegs(
  buf: Buffer,
): Promise<{ full: Buffer; thumb: Buffer; width: number; height: number }> {
  let img: Awaited<ReturnType<typeof loadImage>>;
  try {
    img = await loadImage(buf);
  } catch {
    throw new ImportError("not-image", "decode");
  }
  if (!img.width || !img.height) throw new ImportError("not-image", "empty");
  if (img.height < ENTRY_IMAGE.MIN_HEIGHT) throw new ImportError("too-small");
  const draw = (max: number) => {
    const { w, h } = fitLongEdge(img.width, img.height, max);
    const c = createCanvas(w, h);
    const ctx = c.getContext("2d");
    ctx.fillStyle = "#ffffff"; // 투명 png 의 빈 곳이 jpg 에서 검게 되지 않게
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h);
    return { buf: c.toBuffer("image/jpeg", { quality: JPEG_QUALITY }), w, h };
  };
  const full = draw(ENTRY_IMAGE.LONG_EDGE);
  const thumb = draw(ENTRY_IMAGE.THUMB_EDGE);
  return { full: full.buf, thumb: thumb.buf, width: full.w, height: full.h };
}

const ID = /^[A-Za-z0-9]{1,64}$/;
const isSlot = (v: unknown): v is number => Number.isInteger(v) && (v as number) >= 0 && (v as number) < SLOT_COUNT;

export interface ImportRequest {
  draftId: string;
  slot: number;
  url: string;
}

/** 콜러블 입력 검사. 틀리면 null(콜러블이 invalid-argument 로). */
export function parseImportRequest(data: unknown): ImportRequest | null {
  if (!data || typeof data !== "object") return null;
  const d = data as Record<string, unknown>;
  if (typeof d.draftId !== "string" || !ID.test(d.draftId)) return null;
  if (!isSlot(d.slot)) return null;
  if (typeof d.url !== "string" || d.url.trim() === "" || d.url.length > 2048) return null;
  return { draftId: d.draftId, slot: d.slot, url: d.url.trim() };
}

export const draftImageDir = (uid: string, draftId: string) => `entry-images/drafts/${uid}/${draftId}/`;
export const draftImagePath = (uid: string, draftId: string, slot: number) =>
  `${draftImageDir(uid, draftId)}${slot}.jpg`;
export const thumbPathOf = (fullPath: string) => fullPath.replace(/\.jpg$/, "_600.jpg");

export interface FinalizeStep {
  slot: number;
  from: string;
  fromThumb: string;
  to: string;
  toThumb: string;
}

/**
 * 발행 때 복사 계획. **칸 번호가 아니라 칸이 들고 있는 경로**에서 복사한다 — 칸을 옮기면
 * 파일 이름(옛 칸 번호)과 지금 칸 번호가 다르다. 결과 이름은 지금 칸 번호.
 * 자기 uid · 이 초안 아래 경로만 받는다(남의 그림을 복사해 가지 못하게).
 */
export function planFinalize(
  uid: string,
  draftId: string,
  tournamentId: string,
  slots: readonly { slot: number; storagePath: string }[],
): FinalizeStep[] {
  if (!ID.test(draftId)) throw new Error("bad draftId");
  if (!/^[A-Za-z0-9]{1,64}$/.test(tournamentId)) throw new Error("bad tournamentId");
  const dir = draftImageDir(uid, draftId);
  const fileRe = /^\d{1,2}\.jpg$/;
  return slots.map(({ slot, storagePath }) => {
    if (!isSlot(slot)) throw new Error(`bad slot ${String(slot)}`);
    if (typeof storagePath !== "string" || !storagePath.startsWith(dir) || !fileRe.test(storagePath.slice(dir.length))) {
      throw new Error(`path not in this draft: ${String(storagePath)}`);
    }
    const to = `entry-images/tournaments/${tournamentId}/${slot}.jpg`;
    return { slot, from: storagePath, fromThumb: thumbPathOf(storagePath), to, toThumb: thumbPathOf(to) };
  });
}


// 삭제 경로(캔버스 없이 쓰는 쪽 — tournamentAdminStore 가 루트 시험에서도 읽는다)
export { DRAFT_DIR_META, tournamentImageDir, entryImagePrefixesToDelete } from "./entryImagePaths";
