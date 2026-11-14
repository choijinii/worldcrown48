/**
 * imageSearchCore — 이미지 검색 AI(Brave) 서버 코어 (IMAGE-1 PR 2 · 원장 D-77).
 *
 * 칸마다: 검색어(이름 + 소속) → Brave 이미지 검색 1번(safesearch=strict · count=20) → 위에서부터
 * PR 1 과 같은 관문(내려받기 · 그림 파일 · 10MB · 세로 400px · 1600+600 줄이기)을 지나는 첫 장 → 저장.
 *
 * **Brave 약관(검색 결과 저장 금지).** 이 모듈은 검색 결과 목록을 메모리에서만 쓰고 버린다.
 * 밖으로 나가는 값은 고른 그림의 원본 주소(sourceUrl)와 그 페이지 주소(sourcePage) 두 개뿐이고,
 * 나머지는 우리 Storage 복사본의 주소 · 크기다(RESULT_KEYS). 로그도 칸 번호 · 개수만.
 *
 * Firestore · Storage · 네트워크를 모른다 — 콜러블(autoSourceImages)이 주입한다(시험 가능).
 */
import { ImportError, SLOT_COUNT, ENTRY_IMAGE } from "./entryImageCore";

export const IMAGE_SEARCH = {
  COUNT: 20,
  SAFESEARCH: "strict",
  CONCURRENCY: 3,
  /** 한 칸에서 내려받기를 시도하는 상한 — 10초 제한 × 8 이면 칸 하나가 함수 시간을 다 쓰지 않는다. */
  MAX_TRIES_PER_SLOT: 8,
  /** 초당 한도(429)에서 쉬었다 다시 부르는 횟수. */
  THROTTLE_RETRIES: 2,
  THROTTLE_WAIT_MS: 1100,
} as const;

export interface ImageSlotTarget {
  slot: number;
  name: string;
  affiliation?: string;
}

export interface AutoSourceImagesRequest {
  draftId: string;
  slots: ImageSlotTarget[];
  excludeUrls: string[];
}

export interface BraveCandidate {
  imageUrl: string;
  pageUrl: string;
  /** Brave 가 알려 준 세로(없을 수 있음). 내려받기 전에 400 미만을 거르는 데만 쓴다. */
  height?: number;
}

export type SearchOutcome = { kind: "ok"; candidates: BraveCandidate[] } | { kind: "limit" } | { kind: "error" };

export interface SavedImage {
  url: string;
  thumbUrl: string;
  storagePath: string;
  width: number;
  height: number;
  addedAt: number;
  sourceUrl: string;
  sourcePage: string;
}

export type SlotImageResult = ({ slot: number; ok: true } & SavedImage) | { slot: number; ok: false; reason: "not-found" };

/** 성공 칸이 들고 나가는 칸 이름 전부 — 저장 금지 시험이 이 목록을 잠근다. */
export const RESULT_KEYS = [
  "slot",
  "ok",
  "url",
  "thumbUrl",
  "storagePath",
  "width",
  "height",
  "addedAt",
  "sourceUrl",
  "sourcePage",
] as const;

export interface Resized {
  full: Buffer;
  thumb: Buffer;
  width: number;
  height: number;
}

export interface ImageSourcingDeps {
  search(query: string): Promise<SearchOutcome>;
  /** 실패는 ImportError 로 던진다. */
  fetchBytes(url: string): Promise<Buffer>;
  /** 세로 400 미만 · 그림 아님은 ImportError 로 던진다(resizeToJpegs). */
  prepare(bytes: Buffer): Promise<Resized>;
  save(slot: number, resized: Resized, candidate: BraveCandidate): Promise<SavedImage>;
}

const ID = /^[A-Za-z0-9]{1,64}$/;

export function buildImageQuery(name: string, affiliation?: string): string {
  return [name.trim(), (affiliation ?? "").trim()].filter(Boolean).join(" ");
}

export function parseAutoSourceImagesRequest(data: unknown): AutoSourceImagesRequest | null {
  if (!data || typeof data !== "object") return null;
  const d = data as Record<string, unknown>;
  if (typeof d.draftId !== "string" || !ID.test(d.draftId)) return null;
  if (!Array.isArray(d.slots) || d.slots.length === 0 || d.slots.length > SLOT_COUNT) return null;
  const seen = new Set<number>();
  const slots: ImageSlotTarget[] = [];
  for (const raw of d.slots) {
    if (!raw || typeof raw !== "object") return null;
    const s = raw as Record<string, unknown>;
    if (!Number.isInteger(s.slot) || (s.slot as number) < 0 || (s.slot as number) >= SLOT_COUNT) return null;
    if (seen.has(s.slot as number)) return null;
    if (typeof s.name !== "string" || s.name.trim() === "" || s.name.length > 200) return null;
    seen.add(s.slot as number);
    const t: ImageSlotTarget = { slot: s.slot as number, name: s.name };
    if (typeof s.affiliation === "string" && s.affiliation.length <= 200) t.affiliation = s.affiliation;
    slots.push(t);
  }
  const excludeUrls = Array.isArray(d.excludeUrls)
    ? d.excludeUrls.filter((u): u is string => typeof u === "string" && u.length <= 2048).slice(0, 200)
    : [];
  return { draftId: d.draftId, slots, excludeUrls };
}

/** Brave 이미지 검색 응답 → 후보(그림 주소 · 페이지 주소 · 알려진 세로). 나머지 칸은 읽지 않는다. */
export function parseBraveImages(json: unknown): BraveCandidate[] {
  const results = (json as { results?: unknown } | null)?.results;
  if (!Array.isArray(results)) return [];
  const out: BraveCandidate[] = [];
  for (const r of results) {
    if (!r || typeof r !== "object") continue;
    const x = r as { url?: unknown; properties?: { url?: unknown; height?: unknown } };
    const imageUrl = x.properties?.url;
    if (typeof imageUrl !== "string" || !imageUrl) continue;
    const pageUrl = typeof x.url === "string" && x.url ? x.url : imageUrl;
    const h = Number(x.properties?.height);
    out.push(Number.isFinite(h) && h > 0 ? { imageUrl, pageUrl, height: h } : { imageUrl, pageUrl });
  }
  return out;
}

const nums = (v?: string | null) => (v ?? "").split(",").map((s) => Number(s.trim()));

/**
 * Brave 응답 상태 → 할 일. 402 = 요금제 한도 · 429 는 머리말로 가른다:
 * `x-ratelimit-limit: "초당, 월"` · `x-ratelimit-remaining: "초당, 월"` (월 0 = 월 상한 없음).
 */
export function braveDecision(
  status: number,
  headers: { limit?: string | null; remaining?: string | null },
): "ok" | "limit" | "throttle" | "error" {
  if (status >= 200 && status < 300) return "ok";
  if (status === 402) return "limit";
  if (status === 429) {
    const [, monthLimit] = nums(headers.limit);
    const [, monthLeft] = nums(headers.remaining);
    if (Number.isFinite(monthLimit) && monthLimit > 0 && monthLeft === 0) return "limit";
    return "throttle";
  }
  return "error";
}

async function sourceOne(
  target: ImageSlotTarget,
  candidates: BraveCandidate[],
  used: Set<string>,
  deps: ImageSourcingDeps,
): Promise<SlotImageResult> {
  let tries = 0;
  for (const cand of candidates) {
    if (tries >= IMAGE_SEARCH.MAX_TRIES_PER_SLOT) break;
    if (used.has(cand.imageUrl)) continue;
    if (cand.height !== undefined && cand.height < ENTRY_IMAGE.MIN_HEIGHT) continue;
    // 시도 전에 예약한다 — 동시에 도는 다른 칸이 같은 그림을 고르지 않게(실패한 주소는 어차피 다시 실패한다).
    used.add(cand.imageUrl);
    tries++;
    try {
      const bytes = await deps.fetchBytes(cand.imageUrl);
      const resized = await deps.prepare(bytes);
      const saved = await deps.save(target.slot, resized, cand);
      return { slot: target.slot, ok: true, ...saved };
    } catch (e) {
      if (e instanceof ImportError) continue;
      throw e;
    }
  }
  return { slot: target.slot, ok: false, reason: "not-found" };
}

/**
 * 칸 여러 개를 동시에 3칸까지. 한도를 만나면 새 칸을 시작하지 않고, 이미 끝난 칸은 돌려준다
 * (화면이 저장한다). 한도로 못 한 칸은 결과에 넣지 않는다 — 화면이 남은 칸으로 센다.
 */
export async function runImageSourcing(
  req: AutoSourceImagesRequest,
  deps: ImageSourcingDeps,
): Promise<{ results: SlotImageResult[]; code?: "limit" }> {
  const used = new Set(req.excludeUrls);
  const results: SlotImageResult[] = [];
  let limited = false;
  let next = 0;

  async function worker() {
    while (!limited && next < req.slots.length) {
      const target = req.slots[next++];
      const outcome = await deps.search(buildImageQuery(target.name, target.affiliation));
      if (outcome.kind === "limit") {
        limited = true;
        return;
      }
      if (outcome.kind === "error") {
        results.push({ slot: target.slot, ok: false, reason: "not-found" });
        continue;
      }
      results.push(await sourceOne(target, outcome.candidates, used, deps));
    }
  }

  await Promise.all(Array.from({ length: Math.min(IMAGE_SEARCH.CONCURRENCY, req.slots.length) }, worker));
  results.sort((a, b) => a.slot - b.slot);
  return limited ? { results, code: "limit" } : { results };
}

export type AutoSourceImagesResponse =
  | { ok: true; results: SlotImageResult[]; code?: "limit" }
  | { ok: false; code: "no-key" };

/** 비밀이 비어 있으면 검색하지 않고 no-key — 화면은 이름 채우기 결과를 그대로 두고 문구 13을 보인다. */
export async function startImageSourcing(
  key: string | undefined,
  req: AutoSourceImagesRequest,
  makeDeps: (key: string) => ImageSourcingDeps,
): Promise<AutoSourceImagesResponse> {
  if (!key || !key.trim()) return { ok: false, code: "no-key" };
  const out = await runImageSourcing(req, makeDeps(key.trim()));
  return { ok: true, ...out };
}
