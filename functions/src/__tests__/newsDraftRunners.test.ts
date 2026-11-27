/**
 * NEWS-0a — 뉴스 초안 신호 셋(개막 · 결과 · 주간)이 시험 대회를 건너뛴다(통합 · 주입식 · AI 는 가짜).
 * 판정은 하나(lib/ops/e2eLeftovers isTestTournament — 빌드 때 _news 로 복사).
 */
import { describe, expect, it, vi } from "vitest";
import { runOpenDraft, runResultDraft, runWeeklyDraft, type NewsRunnerBase } from "../core/newsDraftRunners";

/** 가짜 AI — 초안 단계와 번역 단계(en · es)의 답 모양(newsTriggers.core.test 와 같은 흉내). */
function fakeAi(prompt: string): string {
  if (/번역/.test(prompt) && /\((en|es)\)/.test(prompt)) {
    const l = prompt.includes("(en)") ? "en" : "es";
    return JSON.stringify({ title: `T-${l}`, subhead: `S-${l}`, body: [{ type: "lead", text: `l-${l}` }] });
  }
  return JSON.stringify({ title: "제목", subhead: "부제", blocks: [{ type: "lead", text: "본문" }] });
}

function base(): NewsRunnerBase & { written: { slug: string; tournamentId?: string; template: string }[] } {
  const written: { slug: string; tournamentId?: string; template: string }[] = [];
  return {
    written,
    createMessage: vi.fn(async (p: string) => fakeAi(p)),
    writeNewsDraft: vi.fn(async (d) => { written.push(d as never); }),
    newSlug: () => `20261127-${written.length.toString().padStart(6, "0")}`,
    kstDay: () => "2026-11-27",
    stamp: () => "2026-11-27 09:00 KST",
    nowMs: () => 0,
    logError: () => {},
    logInfo: () => {},
  };
}

const real = { status: "active", title: "K-pop의 전설이 될 최고의 무대!", category: "KPOP", hostUid: "89dvYo", totalContestants: 48 };

describe("runOpenDraft — 개막 초안", () => {
  it("진짜 대회 → 초안 1", async () => {
    const b = base();
    const r = await runOpenDraft("t1", real, { ...b, existingDraftKeys: async () => [] });
    expect(r).toBe("written");
    expect(b.written).toHaveLength(1);
    expect(b.written[0]).toMatchObject({ template: "open", tournamentId: "t1", status: "draft" });
  });
  it("시험 표식 대회 → 초안 0 · AI 도 부르지 않음", async () => {
    const b = base();
    const r = await runOpenDraft("t2", { ...real, e2e: true }, { ...b, existingDraftKeys: async () => [] });
    expect(r).toBe("test-tournament");
    expect(b.written).toHaveLength(0);
    expect(b.createMessage).not.toHaveBeenCalled();
  });
  it("표식이 늦게 붙는 Lab 시험(이름 머리 'E2E Tournament #') → 초안 0", async () => {
    const b = base();
    const r = await runOpenDraft("t3", { ...real, title: "E2E Tournament #45843040152.1.0" }, { ...b, existingDraftKeys: async () => [] });
    expect(r).toBe("test-tournament");
    expect(b.written).toHaveLength(0);
  });
  it("seed- 주인 → 초안 0", async () => {
    const b = base();
    expect(await runOpenDraft("t4", { ...real, hostUid: "seed-operator" }, { ...b, existingDraftKeys: async () => [] })).toBe("test-tournament");
  });
  it("이미 개막 초안이 있으면 만들지 않는다(지금과 같음)", async () => {
    const b = base();
    const r = await runOpenDraft("t1", real, { ...b, existingDraftKeys: async () => [{ origin: "event_open", tournamentId: "t1" }] });
    expect(r).toBe("exists");
    expect(b.written).toHaveLength(0);
  });
});

const cache = {
  rankings: [
    { rank: 1, contestantId: "c1", name: "방탄소년단", crownScore: 800, winRate: 0.5, shareRate: 0.3 },
    { rank: 2, contestantId: "c2", name: "세븐틴", crownScore: 500, winRate: 0.2, shareRate: 0.2 },
  ],
  runsTotal: 12,
};

describe("runResultDraft — 결과 초안", () => {
  const deps = (t: Record<string, unknown> | undefined) => ({
    existingDraftKeys: async () => [],
    loadTournament: async () => t,
    loadRankingCache: async () => cache,
  });
  it("진짜 대회 → 초안 1", async () => {
    const b = base();
    expect(await runResultDraft("t1", { ...b, ...deps(real) })).toBe("written");
    expect(b.written[0]).toMatchObject({ template: "result", tournamentId: "t1" });
  });
  it("시험 대회 · 이름 머리 시험 → 초안 0 · AI 안 부름", async () => {
    for (const t of [{ ...real, e2e: true }, { ...real, title: "E2E Tournament #1.1.0" }]) {
      const b = base();
      expect(await runResultDraft("t2", { ...b, ...deps(t) })).toBe("test-tournament");
      expect(b.written).toHaveLength(0);
      expect(b.createMessage).not.toHaveBeenCalled();
    }
  });
  it("대회 문서가 없으면 만들지 않는다", async () => {
    const b = base();
    expect(await runResultDraft("gone", { ...b, ...deps(undefined) })).toBe("no-evidence");
  });
});

describe("runWeeklyDraft — 주간 초안", () => {
  const caches = [
    { id: "real1", data: cache },
    { id: "test1", data: cache },
    { id: "lab1", data: cache },
    { id: "gone1", data: cache },
  ];
  const tournaments = new Map<string, Record<string, unknown> | undefined>([
    ["real1", real],
    ["test1", { ...real, e2e: true }],
    ["lab1", { ...real, title: "E2E Tournament #9.1.0" }],
  ]);
  it("시험 대회 · 문서 없는 대회의 순위 기록은 빼고 진짜 대회만으로 쓴다", async () => {
    const b = base();
    const prompts: string[] = [];
    b.createMessage = vi.fn(async (p: string) => { prompts.push(p); return fakeAi(p); });
    const r = await runWeeklyDraft({
      ...b,
      weeklyDraftExistsToday: async () => false,
      loadRankingCaches: async () => caches,
      loadTournaments: async () => tournaments,
    });
    expect(r).toEqual({ outcome: "written", tournaments: 1 });
    expect(prompts[0]).toContain("real1");
    expect(b.written[0]).toMatchObject({ template: "weekly" });
    expect(prompts[0]).not.toContain("test1");
    expect(prompts[0]).not.toContain("lab1");
  });
  it("오늘 주간 초안이 이미 있으면 만들지 않는다(지금과 같음)", async () => {
    const b = base();
    const r = await runWeeklyDraft({ ...b, weeklyDraftExistsToday: async () => true, loadRankingCaches: async () => caches, loadTournaments: async () => tournaments });
    expect(r.outcome).toBe("exists");
  });
});
