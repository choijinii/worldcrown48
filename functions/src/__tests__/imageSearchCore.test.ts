/**
 * IMAGE-1 PR 2 (원장 D-77) — 이미지 검색 AI 서버 코어.
 *   검색어 = 이름 + 소속 · Brave 응답 해석 · 후보 고르기(400 미만 · 그림 아님 · 10MB 넘음 버림 ·
 *   이미 쓴 주소 건너뜀 · 첫 통과) · 한도(402/429) 판정 · 동시 3칸 · 저장 금지(돌려주는 값의 칸).
 * 바깥 사이트를 부르지 않는다 — 검색 · 내려받기 · 저장은 가짜로 주입한다.
 */
import { describe, expect, it } from "vitest";
import { ImportError } from "../core/entryImageCore";
import {
  IMAGE_SEARCH,
  RESULT_KEYS,
  braveDecision,
  buildImageQuery,
  parseAutoSourceImagesRequest,
  parseBraveImages,
  runImageSourcing,
  startImageSourcing,
  type BraveCandidate,
  type ImageSourcingDeps,
  type SearchOutcome,
} from "../core/imageSearchCore";

describe("buildImageQuery", () => {
  it("이름에 소속을 붙인다(있을 때만)", () => {
    expect(buildImageQuery("Huda Kattan", "Huda Beauty")).toBe("Huda Kattan Huda Beauty");
    expect(buildImageQuery("  Pony ", "")).toBe("Pony");
    expect(buildImageQuery("Pony", undefined)).toBe("Pony");
    expect(buildImageQuery("Pony", "  ")).toBe("Pony");
  });
});

describe("parseAutoSourceImagesRequest", () => {
  it("draftId · slots(0~47, 이름 필수) · excludeUrls 를 받는다", () => {
    expect(
      parseAutoSourceImagesRequest({
        draftId: "d1",
        slots: [{ slot: 0, name: "A", affiliation: "X" }, { slot: 3, name: "B" }],
        excludeUrls: ["https://a/1.jpg"],
      }),
    ).toEqual({
      draftId: "d1",
      slots: [{ slot: 0, name: "A", affiliation: "X" }, { slot: 3, name: "B" }],
      excludeUrls: ["https://a/1.jpg"],
    });
  });
  it("틀린 입력은 null", () => {
    expect(parseAutoSourceImagesRequest(null)).toBeNull();
    expect(parseAutoSourceImagesRequest({ draftId: "a/b", slots: [] })).toBeNull();
    expect(parseAutoSourceImagesRequest({ draftId: "d", slots: [{ slot: 48, name: "A" }] })).toBeNull();
    expect(parseAutoSourceImagesRequest({ draftId: "d", slots: [{ slot: 1, name: " " }] })).toBeNull();
    expect(parseAutoSourceImagesRequest({ draftId: "d", slots: [{ slot: 1, name: "A" }, { slot: 1, name: "B" }] })).toBeNull();
    expect(parseAutoSourceImagesRequest({ draftId: "d", slots: [] })).toBeNull();
  });
  it("excludeUrls 가 없으면 빈 목록", () => {
    expect(parseAutoSourceImagesRequest({ draftId: "d", slots: [{ slot: 1, name: "A" }] })?.excludeUrls).toEqual([]);
  });
});

describe("parseBraveImages", () => {
  it("그림 주소(properties.url) · 페이지 주소(url) · 알려진 세로만 꺼낸다 — 제목 · 썸네일은 버린다", () => {
    const out = parseBraveImages({
      results: [
        { title: "t", url: "https://p/1", thumbnail: { src: "https://th/1" }, properties: { url: "https://i/1.jpg", width: 800, height: 1200 } },
        { title: "t2", url: "https://p/2", properties: { url: "https://i/2.jpg" } },
        { title: "no image", url: "https://p/3", properties: {} },
        "junk",
      ],
    });
    expect(out).toEqual([
      { imageUrl: "https://i/1.jpg", pageUrl: "https://p/1", height: 1200 },
      { imageUrl: "https://i/2.jpg", pageUrl: "https://p/2" },
    ]);
    expect(parseBraveImages({})).toEqual([]);
    expect(parseBraveImages(null)).toEqual([]);
  });
});

describe("braveDecision", () => {
  it("200 = ok · 402 = limit · 그 밖의 실패 = error", () => {
    expect(braveDecision(200, {})).toBe("ok");
    expect(braveDecision(402, {})).toBe("limit");
    expect(braveDecision(500, {})).toBe("error");
    expect(braveDecision(422, {})).toBe("error");
  });
  it("429: 월 한도가 있고 남은 것이 0 이면 limit, 초당 한도면 throttle(잠깐 쉬고 다시)", () => {
    expect(braveDecision(429, { limit: "50, 2000", remaining: "10, 0" })).toBe("limit");
    expect(braveDecision(429, { limit: "50, 0", remaining: "0, 0" })).toBe("throttle");
    expect(braveDecision(429, { limit: "1, 2000", remaining: "0, 1500" })).toBe("throttle");
    expect(braveDecision(429, {})).toBe("throttle");
  });
});

// ── 실행 ─────────────────────────────────────────────────────────────────────

const TALL = { full: Buffer.from("f"), thumb: Buffer.from("t"), width: 1067, height: 1600 };

function fakeDeps(opts: {
  results: Record<string, BraveCandidate[] | "limit" | "error">;
  /** 내려받기 결과: 주소 → 바이트 표지 또는 실패 이유 */
  bytes?: Record<string, "small" | "not-image" | "too-large" | "fetch-failed">;
  searchDelayMs?: number;
}) {
  const calls = { search: [] as string[], fetch: [] as string[], saved: [] as number[], inFlight: 0, maxInFlight: 0 };
  const deps: ImageSourcingDeps = {
    async search(q): Promise<SearchOutcome> {
      calls.search.push(q);
      calls.inFlight++;
      calls.maxInFlight = Math.max(calls.maxInFlight, calls.inFlight);
      await new Promise((r) => setTimeout(r, opts.searchDelayMs ?? 5));
      calls.inFlight--;
      const r = opts.results[q] ?? [];
      if (r === "limit") return { kind: "limit" };
      if (r === "error") return { kind: "error" };
      return { kind: "ok", candidates: r };
    },
    async fetchBytes(url) {
      calls.fetch.push(url);
      const b = opts.bytes?.[url];
      if (b && b !== "small") throw new ImportError(b);
      return Buffer.from(b ?? "tall");
    },
    async prepare(bytes) {
      if (bytes.toString() === "small") throw new ImportError("too-small");
      return TALL;
    },
    async save(slot, _r, c) {
      calls.saved.push(slot);
      return {
        url: `https://store/${slot}.jpg`,
        thumbUrl: `https://store/${slot}_600.jpg`,
        storagePath: `entry-images/drafts/u/d/${slot}.jpg`,
        width: TALL.width,
        height: TALL.height,
        addedAt: 1,
        sourceUrl: c.imageUrl,
        sourcePage: c.pageUrl,
      };
    },
  };
  return { deps, calls };
}

const c = (n: string, height?: number): BraveCandidate =>
  height === undefined ? { imageUrl: `https://i/${n}.jpg`, pageUrl: `https://p/${n}` } : { imageUrl: `https://i/${n}.jpg`, pageUrl: `https://p/${n}`, height };

describe("runImageSourcing — 후보 고르기", () => {
  it("400 미만 · 그림 아님 · 10MB 넘음은 버리고 처음으로 모두 통과한 한 장을 고른다", async () => {
    const { deps, calls } = fakeDeps({
      results: { A: [c("small"), c("page"), c("big"), c("good"), c("later")] },
      bytes: { "https://i/small.jpg": "small", "https://i/page.jpg": "not-image", "https://i/big.jpg": "too-large" },
    });
    const out = await runImageSourcing({ draftId: "d", slots: [{ slot: 0, name: "A" }], excludeUrls: [] }, deps);
    expect(out.code).toBeUndefined();
    expect(out.results).toHaveLength(1);
    expect(out.results[0]).toMatchObject({ slot: 0, ok: true, sourceUrl: "https://i/good.jpg", sourcePage: "https://p/good" });
    expect(calls.fetch).not.toContain("https://i/later.jpg");
  });

  it("검색이 알려 준 세로가 400 미만이면 내려받지도 않는다", async () => {
    const { deps, calls } = fakeDeps({ results: { A: [c("tiny", 300), c("ok", 900)] } });
    await runImageSourcing({ draftId: "d", slots: [{ slot: 0, name: "A" }], excludeUrls: [] }, deps);
    expect(calls.fetch).toEqual(["https://i/ok.jpg"]);
  });

  it("excludeUrls 와 같은 호출의 다른 칸이 이미 고른 주소는 건너뛴다", async () => {
    const { deps } = fakeDeps({
      results: { A: [c("x"), c("shared"), c("a2")], B: [c("shared"), c("b2")] },
    });
    const out = await runImageSourcing(
      { draftId: "d", slots: [{ slot: 0, name: "A" }, { slot: 1, name: "B" }], excludeUrls: ["https://i/x.jpg"] },
      deps,
    );
    const urls = out.results.map((r) => (r.ok ? r.sourceUrl : null));
    expect(urls[0]).toBe("https://i/shared.jpg");
    expect(urls[1]).toBe("https://i/b2.jpg");
  });

  it("통과한 후보가 없으면 not-found · Brave 오류(error)는 그 칸만 search-error(문구 16 · 못 찾은 것과 다르다)", async () => {
    const { deps } = fakeDeps({ results: { A: [c("s")], B: "error" }, bytes: { "https://i/s.jpg": "small" } });
    const out = await runImageSourcing(
      { draftId: "d", slots: [{ slot: 4, name: "A" }, { slot: 5, name: "B" }], excludeUrls: [] },
      deps,
    );
    expect(out.results).toEqual([
      { slot: 4, ok: false, reason: "not-found" },
      { slot: 5, ok: false, reason: "search-error" },
    ]);
  });

  it(`한 칸에서 내려받기는 ${IMAGE_SEARCH.MAX_TRIES_PER_SLOT}번까지만 시도한다`, async () => {
    const many = Array.from({ length: 20 }, (_, i) => c(`f${i}`));
    const bytes = Object.fromEntries(many.map((x) => [x.imageUrl, "fetch-failed" as const]));
    const { deps, calls } = fakeDeps({ results: { A: many }, bytes });
    await runImageSourcing({ draftId: "d", slots: [{ slot: 0, name: "A" }], excludeUrls: [] }, deps);
    expect(calls.fetch).toHaveLength(IMAGE_SEARCH.MAX_TRIES_PER_SLOT);
  });
});

describe("runImageSourcing — 한도 · 동시 처리", () => {
  it("한도(limit)를 만나면 그때까지 찾은 칸은 돌려주고 남은 칸은 부르지 않는다", async () => {
    const results: Record<string, BraveCandidate[] | "limit"> = { E0: [c("e0")], E1: [c("e1")], E2: [c("e2")], E3: "limit" };
    for (let i = 4; i < 12; i++) results[`E${i}`] = [c(`e${i}`)];
    const { deps, calls } = fakeDeps({ results });
    const slots = Array.from({ length: 12 }, (_, i) => ({ slot: i, name: `E${i}` }));
    const out = await runImageSourcing({ draftId: "d", slots, excludeUrls: [] }, deps);
    expect(out.code).toBe("limit");
    expect(out.results.filter((r) => r.ok).map((r) => r.slot)).toEqual(expect.arrayContaining([0, 1, 2]));
    expect(out.results.some((r) => r.slot === 3)).toBe(false);
    // 한도 뒤로는 새 칸을 시작하지 않는다(이미 돌던 칸 몇 개만 끝난다)
    expect(calls.search.length).toBeLessThan(12);
  });

  it(`동시에 ${IMAGE_SEARCH.CONCURRENCY}칸까지만 처리하고 결과는 칸 순서로 돌려준다`, async () => {
    const results: Record<string, BraveCandidate[]> = {};
    for (let i = 0; i < 9; i++) results[`N${i}`] = [c(`n${i}`)];
    const { deps, calls } = fakeDeps({ results, searchDelayMs: 20 });
    const slots = Array.from({ length: 9 }, (_, i) => ({ slot: 8 - i, name: `N${i}` }));
    const out = await runImageSourcing({ draftId: "d", slots, excludeUrls: [] }, deps);
    expect(calls.maxInFlight).toBe(IMAGE_SEARCH.CONCURRENCY);
    expect(out.results.map((r) => r.slot)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8]);
  });
});

describe("저장 금지 — 돌려주는 값(화면이 Firestore 초안에 싣는 값)의 칸", () => {
  it("성공 칸 = 우리 복사본 주소 · 크기 · sourceUrl · sourcePage 뿐 — 제목 · 순위 · 썸네일 · 설명 없음", async () => {
    const { deps } = fakeDeps({ results: { A: [c("good")] } });
    const out = await runImageSourcing({ draftId: "d", slots: [{ slot: 0, name: "A" }], excludeUrls: [] }, deps);
    expect(Object.keys(out.results[0]).sort()).toEqual([...RESULT_KEYS].sort());
    expect(RESULT_KEYS).toEqual(
      expect.arrayContaining(["sourceUrl", "sourcePage"]),
    );
    for (const k of ["title", "thumbnail", "rank", "description", "query", "candidates"]) {
      expect(RESULT_KEYS as readonly string[]).not.toContain(k);
    }
  });
});

describe("startImageSourcing — no-key", () => {
  it("키가 비어 있으면 검색 없이 { ok:false, code:'no-key' }", async () => {
    let made = 0;
    const { deps } = fakeDeps({ results: {} });
    const req = { draftId: "d", slots: [{ slot: 0, name: "A" }], excludeUrls: [] };
    for (const key of [undefined, "", "   "]) {
      expect(await startImageSourcing(key, req, () => (made++, deps))).toEqual({ ok: false, code: "no-key" });
    }
    expect(made).toBe(0);
  });
  it("키가 있으면 결과를 ok:true 로 감싼다", async () => {
    const { deps } = fakeDeps({ results: { A: [c("g")] } });
    const out = await startImageSourcing("k", { draftId: "d", slots: [{ slot: 0, name: "A" }], excludeUrls: [] }, () => deps);
    expect(out).toMatchObject({ ok: true, results: [{ slot: 0, ok: true }] });
  });
});
