/**
 * 소싱 결과 → 그리드 주입 · 배치 드라이버 테스트 (LAB-EV-2 §5 C).
 *
 * 컴포넌트 렌더 테스트는 하지 않는다(LAB-EV-1 §0.5와 같은 규칙) — 대신 어떤 슬롯이
 * 무엇을 갖게 되는지와, 배치를 건너뛰는 중복 회피를 이 층에서 촘촘히 잡는다.
 */
import { describe, expect, it, vi } from "vitest";
import { TOTAL_CONTESTANTS } from "@/lib/types/tournament";
import type { ContestantDraft } from "@/lib/lab/tournamentDoc";
import type { LinkVerdict } from "@/lib/embed/verdict";
import type {
  SourcingBatchSummary,
  SourcingResult,
} from "@/lib/embed/sourcing/types";
import { MAX_BATCH_TARGETS } from "@/lib/embed/sourcing/pipeline";
import {
  addToTally,
  applySourcingResults,
  buildSourcingTargets,
  chunkTargets,
  collectExcludedVideoIds,
  EMPTY_TALLY,
  toSourcingStates,
} from "@/lib/lab/sourcingDraft";
import { runSourcingBatches, type SourcingCall } from "@/lib/lab/autoSource";
import {
  sourcingBadgeTone,
  sourcingReasonMessage,
  sourcingStatusMessage,
} from "@/lib/lab/sourcingMessages";
import { MESSAGES } from "@/lib/i18n/messages";

function emptyDraft(): ContestantDraft {
  return { name: "", nationality: "", position: "", imageUrl: "", imageSearchKeyword: "" };
}

function draft(over: Partial<ContestantDraft> = {}): ContestantDraft {
  return { ...emptyDraft(), ...over };
}

function verdict(videoId: string, over: Partial<LinkVerdict> = {}): LinkVerdict {
  return {
    videoId,
    exists: true,
    embeddable: true,
    regionBlockedIn: [],
    regionAllowedOnly: [],
    ageRestricted: false,
    isLive: false,
    durationSec: 240,
    title: "t",
    channelTitle: "c",
    thumbnailUrl: "",
    status: "pass",
    reasons: [],
    ...over,
  };
}

function suggested(index: number, videoId: string): SourcingResult {
  return {
    index,
    status: "suggested",
    verdict: verdict(videoId),
    startSec: 60,
    attempted: 1,
    cacheHit: false,
    ambiguous: 0,
  };
}

function batchOf(results: SourcingResult[], over: Partial<SourcingBatchSummary> = {}) {
  return {
    results,
    spent: { searchCalls: results.length, units: results.length + 1 },
    reserved: { searchCalls: results.length, units: results.length + 1 },
    cacheHits: 0,
    aiJudged: 0,
    ...over,
  } as SourcingBatchSummary;
}

describe("buildSourcingTargets", () => {
  it("이름이 있는 칸만, 힌트를 실어서 대상이 된다", () => {
    const targets = buildSourcingTargets([
      draft({ name: "Jisoo", imageSearchKeyword: "BLACKPINK Jisoo stage" }),
      draft({ name: "  " }),
      draft({ name: "Karina" }),
    ]);
    expect(targets).toEqual([
      { index: 0, name: "Jisoo", searchHint: "BLACKPINK Jisoo stage" },
      { index: 2, name: "Karina" },
    ]);
  });

  it("이미 영상이 붙은 칸도 대상이다 (재실행 = 캐시 적중 시나리오)", () => {
    const targets = buildSourcingTargets([draft({ name: "Jisoo", videoId: "aaaaaaaaaaa" })]);
    expect(targets).toHaveLength(1);
  });
});

describe("collectExcludedVideoIds", () => {
  it("이번에 안 건드리는 칸의 영상만 회피 목록에 넣는다", () => {
    const drafts = [
      draft({ name: "A", videoId: "aaaaaaaaaaa" }),
      draft({ name: "B", videoId: "bbbbbbbbbbb" }),
      draft({ name: "C" }),
    ];
    expect(collectExcludedVideoIds(drafts, [0])).toEqual(["bbbbbbbbbbb"]);
    expect(collectExcludedVideoIds(drafts, [0, 1])).toEqual([]);
  });
});

describe("chunkTargets", () => {
  it("R5 배치 크기로 자른다", () => {
    const targets = Array.from({ length: TOTAL_CONTESTANTS }, (_, i) => ({
      index: i,
      name: `n${i}`,
    }));
    const chunks = chunkTargets(targets, MAX_BATCH_TARGETS);
    expect(chunks).toHaveLength(Math.ceil(TOTAL_CONTESTANTS / MAX_BATCH_TARGETS));
    expect(chunks[0]).toHaveLength(MAX_BATCH_TARGETS);
    expect(chunks.flat()).toHaveLength(TOTAL_CONTESTANTS);
  });
});

describe("applySourcingResults", () => {
  it("제안분만 슬롯에 얹고 이름·이미지는 건드리지 않는다", () => {
    const drafts = [draft({ name: "Jisoo", imageUrl: "https://img/1.jpg" })];
    const { drafts: next } = applySourcingResults(
      drafts,
      [suggested(0, "aaaaaaaaaaa")],
      TOTAL_CONTESTANTS,
      emptyDraft,
    );
    expect(next[0].name).toBe("Jisoo");
    expect(next[0].imageUrl).toBe("https://img/1.jpg");
    expect(next[0].videoId).toBe("aaaaaaaaaaa");
    expect(next[0].videoStartSec).toBe(60);
    expect(next[0].videoSourceUrl).toContain("aaaaaaaaaaa");
    expect(next).toHaveLength(TOTAL_CONTESTANTS);
  });

  it("실패 슬롯은 기존 영상을 지우지 않는다", () => {
    const drafts = [draft({ name: "Jisoo", videoId: "oldoldoldol" })];
    const { drafts: next, states } = applySourcingResults(
      drafts,
      [
        {
          index: 0,
          status: "manual",
          reason: "all-blocked",
          attempted: 3,
          cacheHit: false,
          ambiguous: 0,
        },
      ],
      TOTAL_CONTESTANTS,
      emptyDraft,
    );
    expect(next[0].videoId).toBe("oldoldoldol");
    expect(states[0]).toEqual({ status: "manual", reason: "all-blocked" });
  });

  it("범위 밖 index는 무시한다", () => {
    const { drafts: next } = applySourcingResults(
      [],
      [suggested(TOTAL_CONTESTANTS + 5, "aaaaaaaaaaa")],
      TOTAL_CONTESTANTS,
      emptyDraft,
    );
    expect(next).toHaveLength(TOTAL_CONTESTANTS);
    expect(next.some((d) => d.videoId)).toBe(false);
  });

  it("제안에는 사유가 없다", () => {
    expect(toSourcingStates([suggested(0, "aaaaaaaaaaa")])[0]).toEqual({
      status: "suggested",
    });
  });
});

describe("runSourcingBatches", () => {
  const targets = Array.from({ length: 20 }, (_, i) => ({ index: i, name: `n${i}` }));

  it("배치를 순차 호출하며 진행률을 올린다", async () => {
    const call: SourcingCall = vi.fn(async (payload) =>
      batchOf(payload.targets.map((t, i) => suggested(t.index, `v${t.index}${i}`.padEnd(11, "x")))),
    );
    const progress: number[] = [];
    const result = await runSourcingBatches(
      { targets, categoryKeywords: [], excludeVideoIds: [] },
      { call, onBatch: () => {}, onProgress: (done) => progress.push(done) },
    );

    expect(call).toHaveBeenCalledTimes(Math.ceil(20 / MAX_BATCH_TARGETS));
    expect(progress[0]).toBe(0);
    expect(progress[progress.length - 1]).toBe(20);
    expect(result.remaining).toBe(0);
    expect(result.error).toBeNull();
    expect(result.tally.suggested).toBe(20);
  });

  it("앞 배치가 고른 영상을 다음 배치의 회피 목록에 실어 보낸다", async () => {
    const seen: string[][] = [];
    const call: SourcingCall = vi.fn(async (payload) => {
      seen.push(payload.excludeVideoIds ?? []);
      return batchOf([suggested(payload.targets[0].index, "sharedvideo")]);
    });
    await runSourcingBatches(
      { targets, categoryKeywords: [], excludeVideoIds: ["preexisting1"] },
      { call, onBatch: () => {}, onProgress: () => {} },
    );

    expect(seen[0]).toEqual(["preexisting1"]);
    expect(seen[1]).toEqual(["preexisting1", "sharedvideo"]);
  });

  it("중간 실패는 앞선 결과를 버리지 않는다 (부분 결과 보존)", async () => {
    let call = 0;
    const applied: SourcingResult[] = [];
    const failing: SourcingCall = vi.fn(async (payload) => {
      call += 1;
      if (call === 2) throw Object.assign(new Error("quota"), { code: "resource-exhausted" });
      return batchOf(payload.targets.map((t) => suggested(t.index, `v${t.index}`.padEnd(11, "x"))));
    });

    const result = await runSourcingBatches(
      { targets, categoryKeywords: [], excludeVideoIds: [] },
      {
        call: failing,
        onBatch: (b) => applied.push(...b.results),
        onProgress: () => {},
      },
    );

    expect(applied).toHaveLength(MAX_BATCH_TARGETS); // 1배치분은 그리드에 남았다
    expect(result.tally.suggested).toBe(MAX_BATCH_TARGETS);
    expect(result.remaining).toBe(20 - MAX_BATCH_TARGETS);
    expect(result.error).toBeTruthy();
  });
});

describe("addToTally", () => {
  it("배치 여러 개를 한 표로 누적한다", () => {
    const a = addToTally(
      EMPTY_TALLY,
      batchOf(
        [
          suggested(0, "aaaaaaaaaaa"),
          { index: 1, status: "manual", reason: "all-blocked", attempted: 3, cacheHit: true, ambiguous: 2 },
          { index: 2, status: "unknown-person", reason: "no-results", attempted: 0, cacheHit: false, ambiguous: 0 },
        ],
        { cacheHits: 1, aiJudged: 2, spent: { searchCalls: 2, units: 3 } },
      ),
    );
    expect(a).toMatchObject({
      suggested: 1,
      manual: 1,
      unknownPerson: 1,
      cacheHits: 1,
      aiJudged: 2,
      ambiguous: 2,
      searchCalls: 2,
      units: 3,
    });

    const b = addToTally(a, batchOf([suggested(3, "bbbbbbbbbbb")], { spent: { searchCalls: 1, units: 2 } }));
    expect(b.suggested).toBe(2);
    expect(b.searchCalls).toBe(3);
  });
});

describe("sourcingMessages — 3언어 커버리지", () => {
  const statuses = ["suggested", "manual", "unknown-person"] as const;
  const reasons = [
    "no-results",
    "all-blocked",
    "not-relevant",
    "all-duplicate",
    "search-failed",
  ] as const;

  it("모든 상태·사유에 ko/en/es 문구가 있다", () => {
    for (const status of statuses) {
      const key = sourcingStatusMessage(status).key;
      expect(MESSAGES[key]).toBeDefined();
      expect(MESSAGES[key].ko && MESSAGES[key].en && MESSAGES[key].es).toBeTruthy();
    }
    for (const reason of reasons) {
      const msg = sourcingReasonMessage({ status: "manual", reason });
      expect(msg).not.toBeNull();
      const entry = MESSAGES[msg!.key];
      expect(entry.ko && entry.en && entry.es).toBeTruthy();
    }
  });

  it("배지 색 역할이 상태마다 정해져 있다 (팔레트에 초록 없음)", () => {
    expect(sourcingBadgeTone("suggested")).toBe("ok");
    expect(sourcingBadgeTone("manual")).toBe("danger");
    expect(sourcingBadgeTone("unknown-person")).toBe("warn");
  });
});
