/**
 * PRESS-1 PR 1 · 3-2 · 3-3 — TIO 외신 초안 알맹이(주입식 deps · AI 는 가짜).
 * 분야마다 1건 · 두 번 돌아도 1건 · 깨진 응답 저장 0 · 한도면 AI 호출 0 · 출처 거름 · 사용량 기록.
 */
import { describe, expect, it } from "vitest";
import {
  generatePressDraft,
  pressDraftsEnabled,
  runDailyPress,
  type PressAiResponse,
  type PressDeps,
  type PressUsageRecord,
} from "../core/pressDraftCore";
import type { ArticleDoc } from "../_news/articleDoc";

const NOW = Date.parse("2026-11-27T06:40:00+09:00");

const lang = (t: string) => ({
  title: `${t} 제목`,
  subhead: `${t} 부제`,
  blocks: [
    { type: "lead", text: `${t} 훅` },
    { type: "paragraph", text: `${t} 사실` },
    { type: "closer", text: `${t} 끝` },
  ],
});

function reply(over: Record<string, unknown> = {}): string {
  return JSON.stringify({
    ko: lang("ko"),
    en: lang("en"),
    es: lang("es"),
    sources: [
      { outlet: "Billboard", title: "Hot 100", url: "https://www.billboard.com/a" },
      { outlet: "Fake", title: "가짜", url: "https://made-up.example/x" },
    ],
    photoKeyword: "chart",
    ...over,
  });
}

function aiResponse(text: string, over: Partial<PressAiResponse> = {}): PressAiResponse {
  return {
    content: [
      { type: "server_tool_use", id: "s1", name: "web_search", input: { query: "kpop" } },
      {
        type: "web_search_tool_result",
        tool_use_id: "s1",
        content: [{ type: "web_search_result", url: "https://www.billboard.com/a", title: "Hot 100" }],
      },
      { type: "text", text },
    ],
    usage: { input_tokens: 40_000, output_tokens: 3_000, server_tool_use: { web_search_requests: 4 } },
    stopReason: "end_turn",
    ...over,
  };
}

interface Fake {
  deps: PressDeps;
  saved: Omit<ArticleDoc, "createdAt">[];
  usage: PressUsageRecord[];
  prompts: string[];
  maxUses: number[];
  runs: Set<string>;
  errors: string[];
}

function fake(opts: { responses?: PressAiResponse[]; spent?: number; limit?: number; throwAi?: boolean } = {}): Fake {
  const saved: Fake["saved"] = [];
  const usage: PressUsageRecord[] = [];
  const prompts: string[] = [];
  const maxUses: number[] = [];
  const runs = new Set<string>();
  const errors: string[] = [];
  const queue = [...(opts.responses ?? [])];
  let spent = opts.spent ?? 0;
  let n = 0;
  const deps: PressDeps = {
    now: () => NOW,
    limitUsd: opts.limit ?? 15,
    newSlug: (day) => `${day.replace(/-/g, "")}-${(n++).toString(36).padStart(6, "0")}`,
    claimRun: async (id) => {
      if (runs.has(id)) return false;
      runs.add(id);
      return true;
    },
    monthSpentUsd: async () => spent,
    addUsage: async (_month, rec) => {
      usage.push(rec);
      spent += rec.usd;
    },
    request: async ({ prompt, maxUses: m }) => {
      prompts.push(prompt);
      maxUses.push(m);
      if (opts.throwAi) throw new Error("network down");
      return queue.shift() ?? aiResponse(reply());
    },
    saveDraft: async (doc) => {
      saved.push(doc);
    },
    logInfo: () => {},
    logError: (m) => errors.push(m),
  };
  return { deps, saved, usage, prompts, maxUses, runs, errors };
}

describe("runDailyPress — 06:40 크론 한 번", () => {
  it("분야마다 초안 정확히 1건 · 3언어 · 출처는 검색 결과에 있던 주소만 · 키워드 · 초안 상태", async () => {
    const f = fake();
    const out = await runDailyPress(f.deps);
    expect(out).toEqual({ kpop: "created", creator: "created" });
    expect(f.saved.map((d) => d.category)).toEqual(["kpop", "creator"]);
    const d = f.saved[0];
    expect(d.status).toBe("draft");
    expect(d.publishedAt).toBeNull();
    expect(d.origin).toBe("cron_press");
    expect(d.template).toBe("column");
    expect(d.title).toEqual({ ko: "ko 제목", en: "en 제목", es: "es 제목" });
    expect(d.sources).toEqual([{ outlet: "Billboard", title: "Hot 100", url: "https://www.billboard.com/a", readAt: "2026-11-27" }]);
    expect(d.photoKeyword).toBe("chart");
    expect(d.rewriteCount).toBe(0);
    expect(d.slug.startsWith("20261127-")).toBe(true);
    // 검색 횟수와 비용이 근거 칸에 남는다(뉴스데스크에서 보임)
    expect(d.evidence.stats).toEqual([
      { label: "웹 검색", value: "4" },
      { label: "비용(USD)", value: "0.0455" },
    ]);
  });

  it("검색 상한 6 을 도구에 넘긴다", async () => {
    const f = fake();
    await runDailyPress(f.deps);
    expect(f.maxUses).toEqual([6, 6]);
  });

  it("두 번 돌아도 분야마다 1건(두 번째는 AI 를 부르지 않는다)", async () => {
    const f = fake();
    await runDailyPress(f.deps);
    const second = await runDailyPress(f.deps);
    expect(second).toEqual({ kpop: "skipped_exists", creator: "skipped_exists" });
    expect(f.saved).toHaveLength(2);
    expect(f.prompts).toHaveLength(2);
  });

  it("깨진 응답이면 저장 0 · 오류 기록 · 비용은 기록(돈은 이미 썼다) · 다른 분야는 계속", async () => {
    const f = fake({ responses: [aiResponse("JSON 아님"), aiResponse(reply())] });
    const out = await runDailyPress(f.deps);
    expect(out).toEqual({ kpop: "error", creator: "created" });
    expect(f.saved.map((d) => d.category)).toEqual(["creator"]);
    expect(f.usage).toHaveLength(2);
    expect(f.errors.some((e) => e.includes("kpop"))).toBe(true);
  });

  it("응답이 잘렸으면(max_tokens) 저장 0", async () => {
    const f = fake({ responses: [aiResponse(reply(), { stopReason: "max_tokens" })] });
    expect((await runDailyPress(f.deps)).kpop).toBe("error");
    expect(f.saved.filter((d) => d.category === "kpop")).toHaveLength(0);
  });

  it("검색 결과에 있던 출처가 하나도 없으면 저장 0(지어낸 출처만 있는 기사)", async () => {
    const f = fake({ responses: [aiResponse(reply({ sources: [{ outlet: "X", title: "x", url: "https://made-up.example/x" }] }))] });
    expect((await runDailyPress(f.deps)).kpop).toBe("error");
    expect(f.saved.filter((d) => d.category === "kpop")).toHaveLength(0);
  });

  it("AI 호출이 실패해도 멈추지 않고 그 분야만 error · 비용 기록 없음", async () => {
    const f = fake({ throwAi: true });
    expect(await runDailyPress(f.deps)).toEqual({ kpop: "error", creator: "error" });
    expect(f.saved).toHaveLength(0);
    expect(f.usage).toHaveLength(0);
  });

  it("한 달 한도에 닿았으면 AI 호출 0 · 그날 표지도 만들지 않는다(한도를 올리면 다시 돌릴 수 있게)", async () => {
    const f = fake({ spent: 15, limit: 15 });
    expect(await runDailyPress(f.deps)).toEqual({ kpop: "limit", creator: "limit" });
    expect(f.prompts).toHaveLength(0);
    expect(f.runs.size).toBe(0);
  });

  it("첫 분야가 한도를 넘기면 둘째 분야는 AI 를 부르지 않는다", async () => {
    const f = fake({ spent: 14.98, limit: 15 });
    const out = await runDailyPress(f.deps);
    expect(out).toEqual({ kpop: "created", creator: "limit" });
    expect(f.prompts).toHaveLength(1);
  });
});

describe("pause_turn 이어 부르기", () => {
  it("이어 부를 때 남은 검색 수만 넘기고 사용량은 요청마다 기록", async () => {
    const f = fake({
      responses: [
        aiResponse("", { stopReason: "pause_turn", usage: { input_tokens: 10_000, output_tokens: 100, server_tool_use: { web_search_requests: 4 } } }),
        aiResponse(reply(), { usage: { input_tokens: 30_000, output_tokens: 3_000, server_tool_use: { web_search_requests: 2 } } }),
      ],
    });
    const r = await generatePressDraft("kpop", f.deps);
    expect(r).toBe("created");
    expect(f.maxUses).toEqual([6, 2]);
    expect(f.usage.map((u) => u.searches)).toEqual([4, 2]);
  });

  it("10만 토큰 넘은 요청은 기록에 표시", async () => {
    const f = fake({ responses: [aiResponse(reply(), { usage: { input_tokens: 120_000, output_tokens: 1_000, server_tool_use: { web_search_requests: 6 } } })] });
    await generatePressDraft("kpop", f.deps);
    expect(f.usage[0].overLongContext).toBe(true);
  });
});

describe("다시 쓰기(PR 2 콜러블이 쓰는 길)", () => {
  it("표지를 만들지 않고 · 지시문에 고칠 점 · rewriteCount/rewriteOf 를 싣는다", async () => {
    const f = fake();
    const r = await generatePressDraft("creator", f.deps, {
      rewrite: { of: "20261127-aaaaaa", count: 1, note: "숫자를 더", oldTitle: "옛", oldText: "옛 본문", oldSources: [] },
    });
    expect(r).toBe("created");
    expect(f.runs.size).toBe(0);
    expect(f.prompts[0]).toContain("숫자를 더");
    expect(f.saved[0].rewriteCount).toBe(1);
    expect(f.saved[0].rewriteOf).toBe("20261127-aaaaaa");
    expect(f.saved[0].rewriteNote).toBe("숫자를 더");
  });
});

describe("pressDraftsEnabled — 켜고 끄는 한 곳", () => {
  it("실서비스는 켬 · PRESS_DRAFTS=off 면 끔", () => {
    expect(pressDraftsEnabled({})).toBe(true);
    expect(pressDraftsEnabled({ PRESS_DRAFTS: "off" })).toBe(false);
    expect(pressDraftsEnabled({ PRESS_DRAFTS: " OFF " })).toBe(false);
  });
  it("시험 서버(에뮬레이터)는 가짜 AI 주소(로컬)일 때만 켬 — 진짜 AI 를 부르지 않는다", () => {
    expect(pressDraftsEnabled({ FUNCTIONS_EMULATOR: "true" })).toBe(false);
    expect(pressDraftsEnabled({ FUNCTIONS_EMULATOR: "true", ANTHROPIC_BASE_URL: "https://api.anthropic.com" })).toBe(false);
    expect(pressDraftsEnabled({ FUNCTIONS_EMULATOR: "true", ANTHROPIC_BASE_URL: "http://127.0.0.1:9313" })).toBe(true);
  });
});
