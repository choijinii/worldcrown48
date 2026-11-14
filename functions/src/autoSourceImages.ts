/**
 * autoSourceImages — 이미지 검색 AI 콜러블 (IMAGE-1 PR 2 · 원장 D-77 ② 길).
 *
 *   { draftId, slots: [{ slot, name, affiliation? }], excludeUrls? }
 *     → { ok: true, results: [{ slot, ok: true, url, thumbUrl, storagePath, width, height, addedAt, sourceUrl, sourcePage }
 *                            | { slot, ok: false, reason: "not-found" }], code?: "limit" }
 *     | { ok: false, code: "no-key" }
 *
 * 얇은 어댑터다(autoSourceVideos 와 같은 틀). 고르기 · 한도 · 동시 처리는 `core/imageSearchCore`,
 * 내려받기 · 줄이기는 PR 1 `core/entryImageCore`, 저장은 `core/entryImageStore`(importEntryImage 와 같은 자리).
 *
 * Brave 약관: 검색 결과는 메모리에서만 쓰고 버린다. 로그에는 칸 수 · 찾은 수 · 못 찾은 수만.
 * 화면이 48칸을 6칸씩 나눠 부른다(진행 표시 · 함수 시간).
 */
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { logger } from "firebase-functions";
import { ALLOWED_ORIGINS } from "./cors";
import { requireAdmin } from "./core/requireAdmin";
import { createUidRateLimiter } from "./core/uidRateLimit";
import { fetchImageBytes, resizeToJpegs } from "./core/entryImageCore";
import { saveDraftImage } from "./core/entryImageStore";
import {
  IMAGE_SEARCH,
  braveDecision,
  parseAutoSourceImagesRequest,
  parseBraveImages,
  startImageSourcing,
  type ImageSourcingDeps,
  type SearchOutcome,
} from "./core/imageSearchCore";

const BRAVE_SEARCH_API_KEY = defineSecret("BRAVE_SEARCH_API_KEY");

/** 48칸 = 8번 + [새 이미지 찾기] 연타 여유. */
const limiter = createUidRateLimiter(40, 60_000);

const EMULATOR = process.env.FUNCTIONS_EMULATOR === "true";
/** 실서비스는 늘 Brave. 에뮬레이터 시험만 가짜 Brave 주소를 쓴다(BRAVE_API_BASE). */
const BRAVE_BASE = (EMULATOR && process.env.BRAVE_API_BASE) || "https://api.search.brave.com";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function braveSearch(key: string): (query: string) => Promise<SearchOutcome> {
  return async (query) => {
    const u = new URL("/res/v1/images/search", BRAVE_BASE);
    u.searchParams.set("q", query);
    u.searchParams.set("count", String(IMAGE_SEARCH.COUNT));
    u.searchParams.set("safesearch", IMAGE_SEARCH.SAFESEARCH);
    for (let attempt = 0; attempt <= IMAGE_SEARCH.THROTTLE_RETRIES; attempt++) {
      let res: Response;
      try {
        res = await fetch(u, {
          headers: { Accept: "application/json", "X-Subscription-Token": key },
          signal: AbortSignal.timeout(15_000),
        });
      } catch {
        return { kind: "error" };
      }
      const decision = braveDecision(res.status, {
        limit: res.headers.get("x-ratelimit-limit"),
        remaining: res.headers.get("x-ratelimit-remaining"),
      });
      if (decision === "ok") {
        try {
          return { kind: "ok", candidates: parseBraveImages(await res.json()) };
        } catch {
          return { kind: "error" };
        }
      }
      void res.body?.cancel().catch(() => undefined);
      if (decision === "limit") return { kind: "limit" };
      if (decision === "error") return { kind: "error" };
      await sleep(IMAGE_SEARCH.THROTTLE_WAIT_MS);
    }
    // 초당 한도가 계속되면 한도로 본다 — 찾은 칸은 화면이 저장한다.
    return { kind: "limit" };
  };
}

function makeDeps(uid: string, draftId: string): (key: string) => ImageSourcingDeps {
  return (key) => ({
    search: braveSearch(key),
    fetchBytes: (url) => fetchImageBytes(url, { allowLoopback: EMULATOR }),
    prepare: (bytes) => resizeToJpegs(bytes),
    save: async (slot, r, cand) => ({
      ...(await saveDraftImage(uid, draftId, slot, r)),
      sourceUrl: cand.imageUrl,
      sourcePage: cand.pageUrl,
    }),
  });
}

export const autoSourceImages = onCall(
  {
    cors: ALLOWED_ORIGINS,
    secrets: [BRAVE_SEARCH_API_KEY, "ADMIN_UID"],
    timeoutSeconds: 540,
    memory: "1GiB",
  },
  async (req) => {
    requireAdmin(req.auth?.uid, process.env.ADMIN_UID);
    const uid = req.auth!.uid;
    if (!limiter.check(uid, Date.now())) {
      throw new HttpsError("resource-exhausted", "요청이 너무 많습니다. 잠시 후 다시 시도해주세요.");
    }
    const input = parseAutoSourceImagesRequest(req.data);
    if (!input) throw new HttpsError("invalid-argument", "draftId · slots(0~47 · 이름) 가 필요합니다.");

    try {
      const out = await startImageSourcing(BRAVE_SEARCH_API_KEY.value(), input, makeDeps(uid, input.draftId));
      if (!out.ok) {
        logger.warn("autoSourceImages: BRAVE_SEARCH_API_KEY 가 비어 있다");
        return out;
      }
      const found = out.results.filter((r) => r.ok).length;
      // 칸 번호 · 개수만 — 검색어 · 주소 · 결과는 남기지 않는다(Brave 약관).
      logger.info("autoSourceImages done", {
        slots: input.slots.length,
        found,
        notFound: out.results.length - found,
        limit: out.code === "limit",
        notFoundSlots: out.results.filter((r) => !r.ok).map((r) => r.slot),
      });
      return out;
    } catch (err) {
      logger.error("autoSourceImages failed", { slots: input.slots.length, err: String(err) });
      throw new HttpsError("internal", "그림을 찾지 못했습니다.");
    }
  },
);
