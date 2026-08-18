/**
 * 자동 영상 소싱 코어 테스트 (LAB-EV-2 §5 A · §7).
 *
 * 모의 API만 쓴다 — 실 키·네트워크 없이 캐시 적중/미적중, 쿼터 거부, 3회 실패,
 * 중복 회피, 0건(실존 의심), 관련성 판정 전 경로를 덮는다.
 */
import { describe, expect, it, vi } from "vitest";
import type { LinkVerdict } from "@/lib/embed/verdict";
import { TOTAL_CONTESTANTS } from "@/lib/types/tournament";
import {
  affordableSlots,
  decideQuota,
  estimateSourcingQuota,
  ptDate,
  remainingQuota,
  SEARCH_CALLS_PER_DAY,
  UNITS_PER_DAY,
  CANDIDATE_ATTEMPTS,
} from "@/lib/embed/sourcing/quota";
import {
  buildSearchQuery,
  hintTokens,
  isCacheFresh,
  searchCacheKey,
  tokenize,
  CACHE_TTL_MS,
  SEARCH_MAX_RESULTS,
} from "@/lib/embed/sourcing/searchQuery";
import {
  ambiguousRate,
  buildRelevancePrompt,
  hasChannelHint,
  judgeRelevance,
  findNegativeTerms,
  NEGATIVE_PENALTY,
  PENALTY_FLOOR,
  THRESHOLD_IRRELEVANT,
  THRESHOLD_RELEVANT,
  parseRelevanceResponse,
} from "@/lib/embed/sourcing/relevance";
import { sourceBatch, type SourcingDeps } from "@/lib/embed/sourcing/pipeline";
import type { SearchCandidate, SourcingTarget } from "@/lib/embed/sourcing/types";

// ── 픽스처 ────────────────────────────────────────────────────────────

function candidate(n: number, over: Partial<SearchCandidate> = {}): SearchCandidate {
  return {
    videoId: `vid${String(n).padStart(8, "0")}`, // 11자
    title: "BLACKPINK JISOO Solo Stage",
    channelTitle: "BLACKPINK",
    ...over,
  };
}

function verdictFor(videoId: string, over: Partial<LinkVerdict> = {}): LinkVerdict {
  return {
    videoId,
    exists: true,
    embeddable: true,
    regionBlockedIn: [],
    regionAllowedOnly: [],
    ageRestricted: false,
    isLive: false,
    durationSec: 200,
    title: "BLACKPINK JISOO Solo Stage",
    channelTitle: "BLACKPINK",
    thumbnailUrl: "",
    status: "pass",
    reasons: [],
    ...over,
  };
}

const JISOO: SourcingTarget = {
  index: 0,
  name: "Jisoo",
  searchHint: "BLACKPINK Jisoo stage performance",
};

function makeDeps(over: Partial<SourcingDeps> = {}): SourcingDeps {
  return {
    search: vi.fn(async () => [candidate(1), candidate(2), candidate(3)]),
    verify: vi.fn(async (ids: string[]) => ids.map((id) => verdictFor(id))),
    readCache: vi.fn(async () => new Map()),
    writeCache: vi.fn(async () => {}),
    reserveQuota: vi.fn(async () => {}),
    settleQuota: vi.fn(async () => {}),
    ...over,
  };
}

// ── quota (R4 · R8 실측) ──────────────────────────────────────────────

describe("quota — Google 문서 실측 모델", () => {
  it("두 버킷을 따로 센다 (search 100콜/일 · 공용 10,000유닛/일)", () => {
    expect(SEARCH_CALLS_PER_DAY).toBe(100);
    expect(UNITS_PER_DAY).toBe(10_000);
    expect(remainingQuota({ searchCalls: 90, units: 500 })).toEqual({
      searchCalls: 10,
      units: 9_500,
    });
  });

  it("남은 양이 음수여도 0으로 눌러 준다", () => {
    expect(remainingQuota({ searchCalls: 120, units: 20_000 })).toEqual({
      searchCalls: 0,
      units: 0,
    });
  });

  it("캐시 적중분은 search 콜에 안 잡힌다", () => {
    const est = estimateSourcingQuota({
      searchesNeeded: 3,
      verifyIdCount: 24,
      maxIdsPerVerifyCall: 50,
    });
    // search 3콜 + videos.list 1콜 = 4유닛
    expect(est).toEqual({ searchCalls: 3, units: 4 });
  });

  it("풀 전체 소싱(전부 미적중)이 search 버킷의 절반을 쓴다 — R2 48 리터럴 금지", () => {
    const est = estimateSourcingQuota({
      searchesNeeded: TOTAL_CONTESTANTS,
      verifyIdCount: TOTAL_CONTESTANTS * CANDIDATE_ATTEMPTS,
      maxIdsPerVerifyCall: 50,
    });
    expect(est.searchCalls).toBe(TOTAL_CONTESTANTS);
    expect(est.units).toBe(
      TOTAL_CONTESTANTS + Math.ceil((TOTAL_CONTESTANTS * CANDIDATE_ATTEMPTS) / 50),
    );
    // search 버킷(100콜/일)이 진짜 천장 — 하루 2개 토너먼트.
    expect(est.searchCalls * 2).toBeLessThanOrEqual(SEARCH_CALLS_PER_DAY);
    expect(decideQuota({ searchCalls: 0, units: 0 }, est).status).toBe("allowed");
  });

  it("search 버킷이 먼저 걸리면 그 버킷을 지목해 거부한다", () => {
    const est = estimateSourcingQuota({
      searchesNeeded: TOTAL_CONTESTANTS,
      verifyIdCount: TOTAL_CONTESTANTS * CANDIDATE_ATTEMPTS,
      maxIdsPerVerifyCall: 50,
    });
    const decision = decideQuota({ searchCalls: 90, units: 100 }, est);
    expect(decision).toEqual({
      status: "denied",
      bucket: "search",
      remaining: 10,
      needed: TOTAL_CONTESTANTS,
    });
  });

  it("공용 유닛 풀이 바닥나도 거부한다", () => {
    const decision = decideQuota(
      { searchCalls: 0, units: UNITS_PER_DAY },
      { searchCalls: 1, units: 2 },
    );
    expect(decision).toMatchObject({ status: "denied", bucket: "units", remaining: 0 });
  });

  it("캐시 적중 슬롯은 남은 콜과 무관하게 처리 가능하다", () => {
    expect(affordableSlots({ searchCalls: 98, units: 0 }, 40)).toBe(42);
  });

  it("카운터 날짜는 KST가 아니라 태평양시다 (Google 리셋 기준)", () => {
    // 2026-08-18 09:00 KST = 2026-08-17 17:00 PT — 날짜가 갈린다.
    const d = new Date("2026-08-18T00:00:00.000Z");
    expect(ptDate(d)).toBe("2026-08-17");
  });
});

// ── searchQuery ──────────────────────────────────────────────────────

describe("searchQuery", () => {
  it("힌트가 있으면 그대로 쓴다 (§3 OUT — AI 재작성 금지)", () => {
    expect(buildSearchQuery(JISOO, ["kpop", "girlgroup"])).toBe(
      "BLACKPINK Jisoo stage performance",
    );
  });

  it("힌트가 없을 때만 이름 + 카테고리 키워드 2개를 붙인다", () => {
    expect(
      buildSearchQuery({ name: "Karina" }, ["kpop", "girlgroup", "4th-gen"]),
    ).toBe("Karina kpop girlgroup");
  });

  it("이름이 비면 검색어도 빈 문자열 (검색을 아예 안 부른다)", () => {
    expect(buildSearchQuery({ name: "  " }, ["kpop"])).toBe("");
  });

  it("캐시 키는 정규화 후 결정적이고, 다른 검색어끼리 갈린다", () => {
    expect(searchCacheKey("BLACKPINK Jisoo")).toBe(searchCacheKey("  blackpink   jisoo  "));
    expect(searchCacheKey("BLACKPINK Jisoo")).not.toBe(searchCacheKey("BLACKPINK Rosé"));
    expect(searchCacheKey("x")).toMatch(/^[0-9a-f]{16}$/);
  });

  it("TTL 7일 — 경계 안은 신선, 밖은 만료", () => {
    const now = 1_000_000_000_000;
    expect(isCacheFresh(now - CACHE_TTL_MS + 1, now)).toBe(true);
    expect(isCacheFresh(now - CACHE_TTL_MS, now)).toBe(false);
    expect(isCacheFresh(0, now)).toBe(false);
  });

  it("토큰화 — 구두점으로 자르고 한글·악센트 라틴은 살린다", () => {
    expect(tokenize("BLACKPINK - JISOO 「FLOWER」 (Official M/V)")).toEqual([
      "blackpink",
      "jisoo",
      "flower",
      "official",
      "m",
      "v",
    ]);
    expect(tokenize("아이브 장원영 · 무대 모음")).toEqual(["아이브", "장원영", "무대", "모음"]);
    expect(tokenize("BLACKPINK Rosé — On The Ground")).toContain("rosé");
  });

  it("힌트 토큰에서 이름·불용어를 걷어낸다", () => {
    expect(hintTokens("BLACKPINK Jisoo stage performance", tokenize("Jisoo"))).toEqual([
      "blackpink",
    ]);
  });

  it("maxResults는 문서 허용 범위(0~50) 안이다", () => {
    expect(SEARCH_MAX_RESULTS).toBeGreaterThan(0);
    expect(SEARCH_MAX_RESULTS).toBeLessThanOrEqual(50);
  });
});

// ── relevance ────────────────────────────────────────────────────────

describe("relevance — 규칙 판정", () => {
  it("이름이 제목에 전부 있으면 규칙만으로 통과", () => {
    const r = judgeRelevance(
      { title: "BLACKPINK JISOO Solo Stage", channelTitle: "Some Fan Channel" },
      JISOO,
    );
    expect(r.verdict).toBe("relevant");
    expect(r.matchedNameTokens).toEqual(["jisoo"]);
  });

  it("아무 것도 안 맞으면 모델에 묻지 않고 탈락", () => {
    const r = judgeRelevance(
      { title: "How to cook pasta", channelTitle: "Kitchen Daily" },
      JISOO,
    );
    expect(r.verdict).toBe("irrelevant");
  });

  it("한글 이름 ↔ 로마자 제목은 힌트가 다리를 놓는다", () => {
    const r = judgeRelevance(
      { title: "BLACKPINK JISOO - FLOWER Stage", channelTitle: "1theK (원더케이)" },
      { name: "지수", searchHint: "BLACKPINK Jisoo stage performance" },
    );
    // 이름 토큰 0(스크립트가 다르다) + 힌트 2/2 적중 + 공식 채널 → 통과
    expect(r.verdict).toBe("relevant");
    expect(r.matchedNameTokens).toEqual([]);
  });

  it("그룹만 언급한 영상은 솔로 후보에게 ambiguous다 (AI가 받는 몫)", () => {
    const r = judgeRelevance(
      { title: "BLACKPINK 무대 모음", channelTitle: "1theK (원더케이)" },
      { name: "지수", searchHint: "BLACKPINK Jisoo stage performance" },
    );
    // 힌트 1/2 + 공식 채널 = 2점 — 통과 임계값 3에 못 미친다.
    expect(r.verdict).toBe("ambiguous");
  });

  it("근거가 반쯤일 때만 ambiguous로 남긴다", () => {
    const r = judgeRelevance(
      { title: "BLACKPINK Members Ranking", channelTitle: "Random Uploads" },
      JISOO,
    );
    expect(r.verdict).toBe("ambiguous");
  });

  /**
   * AI-2 (2026-08-18) — 부정 키워드 감점.
   * "이 인물의 영상인가"는 예인데 "대회 카드에 걸 영상인가"는 아닌 것들을 뒤로 민다.
   */
  it("논란·해명 영상은 감점돼 정상 무대보다 뒤로 밀린다", () => {
    const clean = judgeRelevance(
      { title: "BLACKPINK JISOO Solo Stage", channelTitle: "Some Fan Channel" },
      JISOO,
    );
    const demoted = judgeRelevance(
      { title: "BLACKPINK JISOO 학폭 논란 해명 영상", channelTitle: "Some Fan Channel" },
      JISOO,
    );
    expect(demoted.demotedTerms).toContain("논란");
    expect(demoted.score).toBeLessThan(clean.score);
    expect(clean.demotedTerms).toEqual([]);
  });

  it("감점은 제외가 아니다 — 통과선을 넘던 후보는 irrelevant로 안 떨어진다", () => {
    const demoted = judgeRelevance(
      { title: "JISOO 탈퇴 해명", channelTitle: "Random Uploads" },
      JISOO,
    );
    expect(demoted.verdict).not.toBe("irrelevant");
    expect(demoted.score).toBeGreaterThan(THRESHOLD_IRRELEVANT);
    expect(demoted.score).toBeGreaterThanOrEqual(PENALTY_FLOOR);
  });

  it("원래 무관한 영상은 감점이 있어도 그대로 무관이다", () => {
    const r = judgeRelevance(
      { title: "오늘의 연예계 논란 정리", channelTitle: "Gossip Daily" },
      JISOO,
    );
    expect(r.verdict).toBe("irrelevant");
  });

  it("감점 폭은 만점 이름 일치를 딱 ambiguous까지만 내린다", () => {
    // 더 키우면 정상 무대까지 밀려난다(§6 Auto-STOP — 감점 폭 조정 조건).
    expect(THRESHOLD_RELEVANT - NEGATIVE_PENALTY).toBeGreaterThan(THRESHOLD_IRRELEVANT);
  });

  it("영어 부정 키워드도 잡는다", () => {
    expect(findNegativeTerms("JISOO apology statement")).toContain("apology");
    expect(findNegativeTerms("BTS Jin scandal explained")).toContain("scandal");
  });

  it("정상 무대 제목에는 감점이 없다", () => {
    for (const title of [
      "BLACKPINK JISOO - FLOWER Stage",
      "NMIXX Sullyoon fancam",
      "임영웅 무대 모음",
    ]) {
      expect(findNegativeTerms(title)).toEqual([]);
    }
  });

  it("공식·방송사 채널 힌트를 부분일치로 잡는다", () => {
    expect(hasChannelHint("Mnet K-POP")).toBe(true);
    expect(hasChannelHint("KBS WORLD TV")).toBe(true);
    expect(hasChannelHint("SBS KPOP CLASSIC")).toBe(true);
    expect(hasChannelHint("random fancam")).toBe(false);
  });

  it("배치 프롬프트는 목록의 key만 쓰라고 못박는다 (허구 생성 방지)", () => {
    const prompt = buildRelevancePrompt([
      { key: "0:abc", name: "Jisoo", searchHint: "", title: "T", channelTitle: "C" },
    ]);
    expect(prompt).toContain('key="0:abc"');
    expect(prompt).toContain("새 key를 만들지 마라");
    expect(prompt).toContain("지어내지 마라");
  });

  it("모델 응답 파싱 — 펜스·잡음을 견디고, 실패는 보수적으로 빈 판정", () => {
    const ok = parseRelevanceResponse(
      '```json\n{"judgments":[{"key":"0:a","match":true},{"key":"0:b","match":false}]}\n```',
    );
    expect(ok.get("0:a")).toBe(true);
    expect(ok.get("0:b")).toBe(false);
    expect(parseRelevanceResponse("설명만 잔뜩").size).toBe(0);
    expect(parseRelevanceResponse("{not json").size).toBe(0);
    expect(parseRelevanceResponse("").size).toBe(0);
  });

  it("ambiguous 비율 — Auto-STOP 30% 계측", () => {
    expect(ambiguousRate(0, 0)).toBe(0);
    expect(ambiguousRate(3, 10)).toBeCloseTo(0.3);
  });
});

// ── pipeline ─────────────────────────────────────────────────────────

describe("sourceBatch", () => {
  it("미적중 → 검색 1콜 · 캐시 저장 · 첫 통과 후보 제안", async () => {
    const deps = makeDeps();
    const out = await sourceBatch({ targets: [JISOO], nowMs: 1 }, deps);

    expect(deps.search).toHaveBeenCalledTimes(1);
    expect(deps.writeCache).toHaveBeenCalledTimes(1);
    expect(out.results[0]).toMatchObject({
      index: 0,
      status: "suggested",
      cacheHit: false,
    });
    expect(out.results[0].verdict?.videoId).toBe("vid00000001");
    expect(out.results[0].startSec).toBeGreaterThanOrEqual(0);
    expect(out.spent).toEqual({ searchCalls: 1, units: 2 }); // search 1 + videos.list 1
  });

  // AI-2: 감점이 순위에 실제로 먹히는지 — 규칙 단위 테스트가 아니라 배정 결과로.
  it("정상 무대가 있으면 논란 영상보다 먼저 배정된다 (감점의 목적)", async () => {
    const deps = makeDeps({
      search: vi.fn(async () => [
        candidate(1, { title: "BLACKPINK JISOO 학폭 논란 해명", channelTitle: "Gossip" }),
        candidate(2), // 정상 무대
      ]),
    });
    const out = await sourceBatch({ targets: [JISOO], nowMs: 1 }, deps);
    expect(out.results[0].verdict?.videoId).toBe("vid00000002");
    expect(out.results[0].demotedTerms).toBeUndefined();
  });

  it("논란 영상뿐이면 제외하지 않고 얹되 감점 사유를 실어 보낸다", async () => {
    const deps = makeDeps({
      search: vi.fn(async () => [
        candidate(1, { title: "BLACKPINK JISOO 탈퇴 해명 영상", channelTitle: "Gossip" }),
      ]),
      // 규칙이 못 가르면(감점으로 ambiguous) 모델이 "그 인물 맞다"고 답하는 경로.
      judgeAmbiguous: vi.fn(async (items) => {
        const m = new Map<string, boolean>();
        for (const it of items) m.set(it.key, true);
        return m;
      }),
    });
    const out = await sourceBatch({ targets: [JISOO], nowMs: 1 }, deps);
    expect(out.results[0].status).toBe("suggested");
    expect(out.results[0].demotedTerms).toEqual(expect.arrayContaining(["탈퇴"]));
  });

  it("캐시 적중이면 search.list를 아예 안 부른다 (유닛 ≈0)", async () => {
    const deps = makeDeps({
      readCache: vi.fn(async () => {
        const m = new Map<string, SearchCandidate[]>();
        m.set(searchCacheKey(buildSearchQuery(JISOO)), [candidate(9)]);
        return m;
      }),
    });
    const out = await sourceBatch({ targets: [JISOO], nowMs: 1 }, deps);

    expect(deps.search).not.toHaveBeenCalled();
    expect(deps.writeCache).not.toHaveBeenCalled();
    expect(out.results[0]).toMatchObject({ status: "suggested", cacheHit: true });
    expect(out.spent.searchCalls).toBe(0);
    expect(out.cacheHits).toBe(1);
  });

  it("bypassCache면 캐시를 건너뛰고 새로 검색한다 ([새 영상 찾기])", async () => {
    const deps = makeDeps({
      readCache: vi.fn(async () => new Map([["k", [candidate(9)]]])),
    });
    await sourceBatch({ targets: [JISOO], bypassCache: true, nowMs: 1 }, deps);
    expect(deps.readCache).not.toHaveBeenCalled();
    expect(deps.search).toHaveBeenCalledTimes(1);
  });

  it("쿼터 거부는 API를 한 콜도 부르기 전에 던진다 (R4)", async () => {
    const deps = makeDeps({
      reserveQuota: vi.fn(async () => {
        throw new Error("quota");
      }),
    });
    await expect(sourceBatch({ targets: [JISOO], nowMs: 1 }, deps)).rejects.toThrow("quota");
    expect(deps.search).not.toHaveBeenCalled();
    expect(deps.verify).not.toHaveBeenCalled();
  });

  it("검색 0건 → 실존 의심 (§1 결정 ⑤)", async () => {
    const deps = makeDeps({ search: vi.fn(async () => []) });
    const out = await sourceBatch({ targets: [JISOO], nowMs: 1 }, deps);
    expect(out.results[0]).toMatchObject({
      status: "unknown-person",
      reason: "no-results",
      attempted: 0,
    });
  });

  it("후보 3개가 전부 차단이면 그 칸만 수동 필요", async () => {
    const deps = makeDeps({
      verify: vi.fn(async (ids: string[]) =>
        ids.map((id) => verdictFor(id, { status: "blocked", reasons: ["not-embeddable"] })),
      ),
    });
    const out = await sourceBatch({ targets: [JISOO], nowMs: 1 }, deps);
    expect(out.results[0]).toMatchObject({
      status: "manual",
      reason: "all-blocked",
      attempted: CANDIDATE_ATTEMPTS,
    });
  });

  it("차단된 1순위를 건너뛰고 2순위를 쓴다 (자동 재시도)", async () => {
    const deps = makeDeps({
      verify: vi.fn(async (ids: string[]) =>
        ids.map((id) =>
          id === "vid00000001"
            ? verdictFor(id, { status: "blocked", reasons: ["private"] })
            : verdictFor(id),
        ),
      ),
    });
    const out = await sourceBatch({ targets: [JISOO], nowMs: 1 }, deps);
    expect(out.results[0].verdict?.videoId).toBe("vid00000002");
    expect(out.results[0].attempted).toBe(2);
  });

  it("같은 토너먼트에 이미 쓰인 영상은 후보에서 빠진다 (중복 회피)", async () => {
    const deps = makeDeps();
    const out = await sourceBatch(
      { targets: [JISOO], excludeVideoIds: ["vid00000001"], nowMs: 1 },
      deps,
    );
    expect(out.results[0].verdict?.videoId).toBe("vid00000002");
  });

  it("같은 배치의 두 슬롯이 같은 영상을 고르면 앞 슬롯이 가져간다", async () => {
    const only = [candidate(1)];
    const deps = makeDeps({ search: vi.fn(async () => only) });
    const out = await sourceBatch(
      {
        targets: [JISOO, { ...JISOO, index: 1 }],
        nowMs: 1,
      },
      deps,
    );
    expect(out.results[0].status).toBe("suggested");
    expect(out.results[1]).toMatchObject({ status: "manual", reason: "all-duplicate" });
  });

  it("검색 실패는 그 슬롯만 죽인다 (R5 슬롯 단위 격리)", async () => {
    let call = 0;
    const deps = makeDeps({
      search: vi.fn(async () => {
        call += 1;
        if (call === 1) throw new Error("upstream");
        return [candidate(5, { title: "Beta Official Stage", channelTitle: "Beta Official" })];
      }),
    });
    const out = await sourceBatch(
      {
        targets: [
          { index: 0, name: "Alpha", searchHint: "Alpha stage" },
          { index: 1, name: "Beta", searchHint: "Beta stage" },
        ],
        nowMs: 1,
      },
      deps,
    );
    const failed = out.results.filter((r) => r.reason === "search-failed");
    const ok = out.results.filter((r) => r.status === "suggested");
    expect(failed).toHaveLength(1);
    expect(ok).toHaveLength(1);
    // 실패한 콜도 쿼터를 태운다 — 카운터가 Google 실사용량과 벌어지면 안 된다.
    expect(out.spent.searchCalls).toBe(2);
  });

  it("규칙이 못 가른 후보만 AI 배치 1콜로 넘긴다", async () => {
    const judge = vi.fn(async () => new Map([["0:vid00000001", true]]));
    const deps = makeDeps({
      search: vi.fn(async () => [
        candidate(1, { title: "BLACKPINK Members Ranking", channelTitle: "Random Uploads" }),
      ]),
      judgeAmbiguous: judge,
    });
    const out = await sourceBatch({ targets: [JISOO], nowMs: 1 }, deps);

    expect(judge).toHaveBeenCalledTimes(1);
    expect(out.aiJudged).toBe(1);
    expect(out.results[0].status).toBe("suggested");
  });

  it("AI 판정이 없으면 애매한 후보는 버린다 (보수적)", async () => {
    const deps = makeDeps({
      search: vi.fn(async () => [
        candidate(1, { title: "BLACKPINK Members Ranking", channelTitle: "Random Uploads" }),
      ]),
      judgeAmbiguous: undefined,
    });
    const out = await sourceBatch({ targets: [JISOO], nowMs: 1 }, deps);
    expect(out.results[0]).toMatchObject({ status: "manual", reason: "not-relevant" });
  });

  it("AI 판정 실패도 배치를 죽이지 않는다", async () => {
    const deps = makeDeps({
      search: vi.fn(async () => [
        candidate(1, { title: "BLACKPINK Members Ranking", channelTitle: "Random Uploads" }),
      ]),
      judgeAmbiguous: vi.fn(async () => {
        throw new Error("anthropic down");
      }),
    });
    const out = await sourceBatch({ targets: [JISOO], nowMs: 1 }, deps);
    expect(out.results[0].status).toBe("manual");
  });

  it("예약 상한과 실사용의 차이를 되돌린다 (Cloud Console 대조 정합)", async () => {
    const settle = vi.fn(async () => {});
    const deps = makeDeps({ settleQuota: settle });
    const out = await sourceBatch({ targets: [JISOO], nowMs: 1 }, deps);

    expect(out.reserved).toEqual({ searchCalls: 1, units: 2 });
    expect(out.spent).toEqual({ searchCalls: 1, units: 2 });
    expect(settle).not.toHaveBeenCalled();

    // 캐시 적중이면 예약(검증 1콜)보다 실사용이 같거나 적다.
    const cachedDeps = makeDeps({
      settleQuota: settle,
      readCache: vi.fn(async () => {
        const m = new Map<string, SearchCandidate[]>();
        m.set(searchCacheKey(buildSearchQuery(JISOO)), [candidate(9)]);
        return m;
      }),
    });
    const cached = await sourceBatch({ targets: [JISOO], nowMs: 1 }, cachedDeps);
    expect(cached.reserved.searchCalls).toBe(0);
    expect(cached.spent.searchCalls).toBe(0);
  });

  it("이름이 빈 슬롯은 검색을 부르지 않는다", async () => {
    const deps = makeDeps();
    const out = await sourceBatch(
      { targets: [{ index: 0, name: "" }], nowMs: 1 },
      deps,
    );
    expect(deps.search).not.toHaveBeenCalled();
    expect(out.results[0].status).toBe("unknown-person");
  });
});
