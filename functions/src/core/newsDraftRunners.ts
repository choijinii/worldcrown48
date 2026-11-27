/**
 * newsDraftRunners — 뉴스 초안 신호 셋(개막 onTournamentOpened · 결과 onChampionForNews · 주간 scheduleWeeklyNews)의
 * 몸통. 바깥 일(Firestore 읽기 · 쓰기 · AI)은 모두 주입한다 — 트리거 파일은 얇은 어댑터만 남는다.
 *
 * NEWS-0a(대표 2026-11-26 · 11-27): 시험 대회는 개막 · 결과 · 주간 초안을 만들지 않는다. 판정은 하나 —
 * `isTestTournament`(lib/ops/e2eLeftovers.ts · 공개 목록 isPublicTournament 와 같은 기준 · 빌드 때 _news 로 복사).
 * Lab 시험(b1)은 발행 뒤에 표식을 달아 개막 순간엔 표식이 없다 → 이름 머리 "E2E Tournament #" 로 거른다(대표 확정 11-27).
 * AI 를 부르기 **전에** 거른다 — 비용이 새지 않게.
 */
import { isTestTournament } from "../_news/e2eLeftovers";
import type { ArticleDoc } from "../_news/articleDoc";
import {
  buildOpenDigest,
  buildResultDigest,
  buildWeeklyDigest,
  nameGlossaryOf,
  rankingRowFromCache,
  runsTotalFromCache,
  type RankingRowLike,
} from "./newsDigestCore";
import { buildOpenPrompt, buildResultPrompt, buildWeeklyPrompt } from "./newsPrompts";
import { assembleLocalizedDraft } from "./newsDraftPipeline";
import { newsDraftExists, type ExistingDraftKey } from "./newsDraftAssembly";

type Doc = Record<string, unknown>;

export interface NewsRunnerBase {
  createMessage: (prompt: string) => Promise<string>;
  writeNewsDraft: (draft: Omit<ArticleDoc, "createdAt">) => Promise<void>;
  /** 새 기사 slug(그날 KST 날짜 + 임의 꼬리). */
  newSlug: (kstDay: string) => string;
  kstDay: () => string;
  /** 근거 줄의 시각 표시(kstStamp). */
  stamp: (ms: number) => string;
  nowMs: () => number;
  logError: (message: string, err?: unknown) => void;
  logInfo: (message: string) => void;
}

function rankingsOf(data: Doc | undefined): RankingRowLike[] {
  const rows = (data?.rankings ?? []) as Array<Record<string, unknown>>;
  // 행 읽기는 한 곳(rankingRowFromCache) — 공식 영어 이름(nameI18n.en)까지 읽는다.
  return rows.map(rankingRowFromCache);
}

const toMs = (v: unknown): number | null =>
  typeof v === "number" ? v : ((v as { toMillis?: () => number } | null)?.toMillis?.() ?? null);

export type OpenOutcome = "test-tournament" | "exists" | "written";

/** 개막 초안 — 대회가 'active' 로 만들어진 순간. */
export async function runOpenDraft(
  tournamentId: string,
  data: Doc,
  deps: NewsRunnerBase & { existingDraftKeys: (tid: string) => Promise<ExistingDraftKey[]> },
): Promise<OpenOutcome> {
  if (isTestTournament(data)) return "test-tournament";
  // 멱등 — 대회 하나에 개막 초안 하나(origin + tournamentId).
  if (newsDraftExists(await deps.existingDraftKeys(tournamentId), "event_open", tournamentId)) return "exists";

  const meta = {
    id: tournamentId,
    title: String(data.title ?? ""),
    category: String(data.category ?? ""),
    totalContestants: Number(data.totalContestants ?? 48),
    deadlineMs: toMs(data.tournamentDeadline),
  };
  const digest = buildOpenDigest(meta, deps.stamp(deps.nowMs()));
  const prompt = buildOpenPrompt({ title: meta.title, category: meta.category, digest });
  const draft = await assembleLocalizedDraft(
    {
      slug: deps.newSlug(deps.kstDay()),
      template: "open",
      origin: "event_open",
      sourceLang: "ko",
      prompt,
      evidence: { asOf: digest.asOf, stats: digest.stats, tournamentId },
      tournamentId,
    },
    { createMessage: deps.createMessage, logError: deps.logError },
  );
  await deps.writeNewsDraft(draft);
  deps.logInfo(`onTournamentOpened: open draft ${draft.slug} for ${tournamentId}`);
  return "written";
}

export type ResultOutcome = "exists" | "no-evidence" | "test-tournament" | "written";

/** 결과 초안 — Champion 이 정해진 판(roundProgress false→true). */
export async function runResultDraft(
  tournamentId: string,
  deps: NewsRunnerBase & {
    existingDraftKeys: (tid: string) => Promise<ExistingDraftKey[]>;
    loadTournament: (tid: string) => Promise<Doc | undefined>;
    loadRankingCache: (tid: string) => Promise<Doc | undefined>;
  },
): Promise<ResultOutcome> {
  if (newsDraftExists(await deps.existingDraftKeys(tournamentId), "event_champion", tournamentId)) return "exists";
  const [t, cacheData] = await Promise.all([deps.loadTournament(tournamentId), deps.loadRankingCache(tournamentId)]);
  if (t && isTestTournament(t)) return "test-tournament";
  const rankings = rankingsOf(cacheData);
  // evidence 0건 (아직 집계 없음 · 대회 문서 없음) → 결과 기사 무의미, 조용히 skip.
  if (!t || rankings.length === 0) {
    deps.logInfo(`onChampionForNews: no evidence yet for ${tournamentId} — skip`);
    return "no-evidence";
  }

  const meta = {
    id: tournamentId,
    title: String(t.title ?? ""),
    category: String(t.category ?? ""),
    totalContestants: Number(t.totalContestants ?? 48),
  };
  const championId = rankings[0]?.contestantId;
  // 대회 전체 참여 횟수 — AI 재료 줄에만(기사 숫자 허용 목록 · 2026-11-25).
  const runsTotal = runsTotalFromCache(cacheData);
  const digest = buildResultDigest({ meta, rankings, championId, asOf: deps.stamp(deps.nowMs()), runsTotal });
  const prompt = buildResultPrompt({
    title: meta.title,
    championName: digest.leaders[0]?.name ?? "",
    championNameEn: digest.leaders[0]?.nameEn,
    digest,
  });
  const draft = await assembleLocalizedDraft(
    {
      slug: deps.newSlug(deps.kstDay()),
      template: "result",
      origin: "event_champion",
      sourceLang: "ko",
      prompt,
      evidence: { asOf: digest.asOf, stats: digest.stats, tournamentId },
      tournamentId,
      names: nameGlossaryOf(digest),
    },
    { createMessage: deps.createMessage, logError: deps.logError },
  );
  await deps.writeNewsDraft(draft);
  deps.logInfo(`onChampionForNews: result draft ${draft.slug} for ${tournamentId}`);
  return "written";
}

/** 주간 초안 — 진짜 대회의 순위 기록만 센다(시험 대회 · 문서가 없는 대회는 뺀다). */
export async function runWeeklyDraft(
  deps: NewsRunnerBase & {
    weeklyDraftExistsToday: (kstDay: string) => Promise<boolean>;
    loadRankingCaches: () => Promise<{ id: string; data: Doc }[]>;
    loadTournaments: (ids: string[]) => Promise<Map<string, Doc | undefined>>;
  },
): Promise<{ outcome: "exists" | "written"; tournaments: number }> {
  const day = deps.kstDay();
  if (await deps.weeklyDraftExistsToday(day)) return { outcome: "exists", tournaments: 0 };

  const all = await deps.loadRankingCaches();
  const docs = await deps.loadTournaments(all.map((c) => c.id));
  const real = all.filter((c) => {
    const t = docs.get(c.id);
    return t !== undefined && !isTestTournament(t);
  });
  const caches = real.map((c) => ({
    tournamentId: c.id,
    title: String(c.data.tournamentId ?? c.id),
    rankings: rankingsOf(c.data),
    // 차트 기준(10) 미만 대회는 선두에서 빠진다(ACTIVE TOURNAMENTS 에는 센다).
    runsTotal: runsTotalFromCache(c.data),
  }));
  const digest = buildWeeklyDigest({ caches, asOf: deps.stamp(deps.nowMs()) });
  const prompt = buildWeeklyPrompt({ digest });
  const draft = await assembleLocalizedDraft(
    {
      slug: deps.newSlug(day),
      template: "weekly",
      origin: "cron_weekly",
      sourceLang: "ko",
      prompt,
      evidence: { asOf: digest.asOf, stats: digest.stats },
      names: nameGlossaryOf(digest),
    },
    { createMessage: deps.createMessage, logError: deps.logError },
  );
  await deps.writeNewsDraft(draft);
  deps.logInfo(`scheduleWeeklyNews: weekly draft ${draft.slug} (real tournaments ${caches.length})`);
  return { outcome: "written", tournaments: caches.length };
}
