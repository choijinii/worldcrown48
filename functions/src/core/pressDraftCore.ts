/**
 * pressDraftCore — TIO 외신 종합 초안 알맹이 (PRESS-1 PR 1 · 지시서 3-2 · 3-3). 주입식 deps · SDK · Firestore 무의존.
 *
 * 분야 하나의 순서:
 *   ① 이번 달 쓴 금액 ≥ 한도 → AI 호출 0 · "limit" (그날 표지도 만들지 않는다 — 한도를 올리면 다시 돌릴 수 있게)
 *   ② (크론만) 그날 표지 `press_runs/{YYYY-MM-DD}_{분야}` 만들기 — 이미 있으면 "skipped_exists"(두 번 돌아도 1건)
 *   ③ AI 1번(웹 검색 max_uses 6) · pause_turn 이면 남은 검색 수로 이어 부름 — 요청마다 사용량을 달 문서에 더함
 *   ④ 응답 읽기 — 깨짐 · 잘림(max_tokens) · 검색 결과에 있던 출처 0 → 저장 0 · "error"
 *   ⑤ 초안 저장(buildLocalizedArticleDraft — status 'draft' 고정 · 자동 발행 없음)
 * 한 분야의 실패는 다른 분야를 멈추지 않는다.
 */
import { buildLocalizedArticleDraft, type ArticleCategory, type ArticleDoc, type ArticleSource } from "../_news/articleDoc";
import { PRESS_MAX_SEARCHES, decidePressCall, pressMonthDocId, pressRequestCost } from "./pressBudget";
import { buildPressPrompt } from "./pressPrompt";
import { PressReplyError, collectSearchResults, filterSources, parsePressReply, replyText, usageOf } from "./pressReply";

/** 크론이 도는 분야 순서. */
export const PRESS_CATEGORIES: readonly ArticleCategory[] = ["kpop", "creator"];

/** pause_turn 이어 부르기 상한(검색 6번을 다 쓰면 그 전에 끝난다). */
const MAX_REQUESTS = 3;

/** SDK 응답에서 필요한 것만. */
export interface PressAiResponse {
  content: unknown[];
  usage: unknown;
  stopReason: string | null;
}

/** 요청 1번의 기록 — 달 문서에 더한다. */
export interface PressUsageRecord {
  usd: number;
  searches: number;
  inputTokens: number;
  outputTokens: number;
  overLongContext: boolean;
  unknown: boolean;
}

export interface PressDeps {
  now: () => number;
  limitUsd: number;
  newSlug: (dayKst: string) => string;
  /** 표지 만들기 — 새로 만들었으면 true, 이미 있으면 false. */
  claimRun: (runId: string) => Promise<boolean>;
  monthSpentUsd: (monthId: string) => Promise<number>;
  addUsage: (monthId: string, rec: PressUsageRecord) => Promise<void>;
  /** AI 1번. priorContent = pause_turn 이어 부르기 때 앞 응답의 content. */
  request: (args: { prompt: string; maxUses: number; priorContent?: unknown[] }) => Promise<PressAiResponse>;
  saveDraft: (doc: Omit<ArticleDoc, "createdAt">) => Promise<void>;
  logInfo: (m: string, data?: Record<string, unknown>) => void;
  logError: (m: string, e?: unknown) => void;
}

export type PressOutcome = "created" | "skipped_exists" | "limit" | "error";

export interface PressRewrite {
  of: string;
  count: number;
  note: string;
  oldTitle: string;
  oldText: string;
  oldSources: ArticleSource[];
}

const kstDayFmt = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit" });
const kstStampFmt = new Intl.DateTimeFormat("sv-SE", {
  timeZone: "Asia/Seoul",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

/**
 * 켜고 끄는 한 곳(LAB-FIX-6 `entryWebSearchEnabled` 와 같은 모양).
 * 실서비스: 켬 · `PRESS_DRAFTS=off` 면 끔.
 * 시험 서버(에뮬레이터): 가짜 AI 주소(로컬 ANTHROPIC_BASE_URL)일 때만 켬 — 진짜 AI 를 부르지 않는다.
 */
export function pressDraftsEnabled(env: Readonly<Record<string, string | undefined>>): boolean {
  if ((env.PRESS_DRAFTS ?? "").trim().toLowerCase() === "off") return false;
  if (env.FUNCTIONS_EMULATOR === "true") {
    return /^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?/.test(env.ANTHROPIC_BASE_URL ?? "");
  }
  return true;
}

/** 분야 하나의 초안. 크론은 claim 을 켜고, 다시 쓰기(PR 2)는 rewrite 를 넘긴다. */
export async function generatePressDraft(
  category: ArticleCategory,
  deps: PressDeps,
  opts: { claim?: boolean; rewrite?: PressRewrite } = {},
): Promise<PressOutcome> {
  const now = deps.now();
  const day = kstDayFmt.format(new Date(now));
  const month = pressMonthDocId(now);

  // ① 한도 — 호출 전에.
  if (decidePressCall(await deps.monthSpentUsd(month), deps.limitUsd).status === "limit_reached") {
    deps.logInfo(`press: ${category} — monthly limit reached, no AI call`, { month, limitUsd: deps.limitUsd });
    return "limit";
  }

  // ② 그날 표지(크론만).
  if (opts.claim && !(await deps.claimRun(`${day}_${category}`))) {
    deps.logInfo(`press: ${category} — draft already made today, skip`, { day });
    return "skipped_exists";
  }

  const prompt = buildPressPrompt({
    category,
    todayKst: day,
    rewrite: opts.rewrite
      ? { oldTitle: opts.rewrite.oldTitle, oldText: opts.rewrite.oldText, oldSources: opts.rewrite.oldSources, note: opts.rewrite.note }
      : undefined,
  });

  // ③ AI — 요청마다 사용량 기록.
  const content: unknown[] = [];
  let searches = 0;
  let usd = 0;
  let stopReason: string | null = null;
  try {
    for (let i = 0; i < MAX_REQUESTS; i++) {
      const resp = await deps.request({ prompt, maxUses: PRESS_MAX_SEARCHES - searches, priorContent: i > 0 ? [...content] : undefined });
      const usage = usageOf(resp.usage);
      const cost = pressRequestCost(usage);
      const rec: PressUsageRecord = {
        usd: cost.usd,
        searches: usage?.searches ?? PRESS_MAX_SEARCHES,
        inputTokens: usage?.inputTokens ?? 0,
        outputTokens: usage?.outputTokens ?? 0,
        overLongContext: cost.overLongContext,
        unknown: cost.unknown,
      };
      await deps.addUsage(month, rec);
      if (rec.overLongContext) deps.logError(`press: ${category} — request over 100K input tokens (5x price)`, rec);
      content.push(...resp.content);
      searches += rec.searches;
      usd += rec.usd;
      stopReason = resp.stopReason;
      if (stopReason !== "pause_turn" || searches >= PRESS_MAX_SEARCHES) break;
    }
  } catch (e) {
    deps.logError(`press: ${category} — AI call failed`, e);
    return "error";
  }

  // ④ 읽기.
  try {
    if (stopReason === "max_tokens") throw new PressReplyError("reply truncated (max_tokens)");
    if (stopReason === "pause_turn") throw new PressReplyError("reply still paused after search cap");
    const parsed = parsePressReply(replyText(content));
    const sources = filterSources(parsed.sources, collectSearchResults(content), day);
    if (sources.length === 0) throw new PressReplyError("no source from the actual search results");

    // ⑤ 저장 — 초안만.
    const draft = buildLocalizedArticleDraft({
      slug: deps.newSlug(day),
      template: "column",
      origin: "cron_press",
      sourceLang: "ko",
      title: parsed.title,
      subhead: parsed.subhead,
      body: parsed.body,
      evidence: {
        asOf: `${kstStampFmt.format(new Date(now))} KST`,
        stats: [
          { label: "웹 검색", value: String(searches) },
          { label: "비용(USD)", value: usd.toFixed(4) },
        ],
      },
      press: {
        category,
        sources,
        photoKeyword: parsed.photoKeyword,
        rewriteCount: opts.rewrite?.count ?? 0,
        ...(opts.rewrite ? { rewriteOf: opts.rewrite.of, rewriteNote: opts.rewrite.note } : {}),
      },
    });
    await deps.saveDraft(draft);
    deps.logInfo(`press: ${category} — draft ${draft.slug}`, { searches, usd, sources: sources.length });
    return "created";
  } catch (e) {
    deps.logError(`press: ${category} — reply rejected, nothing saved`, e);
    return "error";
  }
}

/** 06:40 크론 한 번 — 분야마다 1건. */
export async function runDailyPress(deps: PressDeps): Promise<Record<ArticleCategory, PressOutcome>> {
  const out = {} as Record<ArticleCategory, PressOutcome>;
  for (const c of PRESS_CATEGORIES) {
    try {
      out[c] = await generatePressDraft(c, deps, { claim: true });
    } catch (e) {
      deps.logError(`press: ${c} — unexpected failure`, e);
      out[c] = "error";
    }
  }
  return out;
}
