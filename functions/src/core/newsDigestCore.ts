/**
 * newsDigestCore — pure summary of the EXISTING ranking_cache into 기사 근거
 * 수치 (ND-1 §3 #2, AC 3·4). No new aggregation logic is invented: the cron already
 * wrote the chart into `ranking_cache`, and this module only picks the allowed
 * numbers out of it.
 *
 * 기사 숫자 허용 목록 (대표 확정 2026-11-25 · T5 PR 2 · 잠금 시험 newsNumberLock.test.ts):
 *   - 숫자 칸 라벨 = ALLOWED_STAT_LABELS 뿐(CONTESTANTS · DEADLINE · KST · LANGUAGES ·
 *     ACTIVE TOURNAMENTS · CROWN SCORE). 결과 기사의 CROWN SCORE = 차트 1위의 점수(정수).
 *   - 선두 행 = 순위 · 이름 · Crown Score · 순위점수율(placementRate) · 우승율(winRate) · 선택율(shareRate) — 세 비율 정본 이름(D-108)
 *     (LEADER_KEYS). 두 비율은 AI 재료에서 Crown Score 와 같은 줄에만 실린다.
 *   - 대회 전체 참여 횟수(runsTotal)는 결과 기사 AI 재료 줄에만 — 숫자 칸이 아니다.
 *   - 쓸 수 없는 것: 선택 수(voteCount) · 대회 전체 선택 수(totalVotes) · 옛 rate ·
 *     1등 횟수 · 결승 오른 횟수 · 대결에 나온 횟수 · 순위 점수 합계. 캐시에 있어도
 *     rankingRowFromCache 가 읽지 않는다. (순위점수율은 D-108 · 2026-11-28 부터 쓸 수 있다 —
 *     11/25 "기사에서 뺀다"가 바뀜.)
 */

/**
 * 차트가 점수를 보이는 기준 — 대회 전체 완주 판수 10 (CLAUDE.md 대진 흐름 #8).
 * `lib/ranking/rankState.ts` 의 MIN_RUNS_FOR_CHART 와 같은 값이어야 한다 — functions 는
 * lib 를 import 하지 않으므로 newsNumberLock.test.ts 가 그 파일을 글자로 읽어 대조한다.
 * 차트가 기다림 안내를 띄우는 동안 기사도 Crown Score · 두 비율을 쓰지 않는다.
 */
export const MIN_RUNS_FOR_CHART = 10;

/** runsTotal 이 기준에 닿았을 때만 점수를 싣는다(없으면 모름 → 싣지 않음). */
export function chartScoresShown(runsTotal: number | undefined): boolean {
  return runsTotal !== undefined && runsTotal >= MIN_RUNS_FOR_CHART;
}

/** 기사 숫자 칸에 쓸 수 있는 라벨 — 그 밖의 새 칸 이름은 만들지 않는다. */
export const ALLOWED_STAT_LABELS = [
  "CONTESTANTS",
  "DEADLINE · KST",
  "LANGUAGES",
  "ACTIVE TOURNAMENTS",
  "CROWN SCORE",
] as const;

/** 선두 행이 가질 수 있는 키 — 잠금 시험이 이 밖의 키를 막는다. */
export const LEADER_KEYS = [
  "rank",
  "contestantId",
  "name",
  "nameEn",
  "crownScore",
  "placementRate",
  "winRate",
  "shareRate",
  "isChampion",
  "tournamentTitle",
] as const;

/** One chart row as the news layer reads it (허용된 7개 칸만). */
export interface RankingRowLike {
  rank: number;
  contestantId: string;
  name: string;
  /** NAME-I18N-1 (원장 D-61) — 차트 캐시의 nameI18n.en. 옛 캐시엔 없다(빈칸). */
  nameEn?: string;
  /** Crown Score 0~1000 정수. */
  crownScore: number;
  /** 순위점수율 0~1 — 판마다 결승에 얼마나 가까이 올랐는지(D-108 · 2026-11-28부터 기사에 쓸 수 있다). */
  placementRate: number;
  /** 우승율 0~1. */
  winRate: number;
  /** 선택율 0~1 — Match마다 선택받은 비율. */
  shareRate: number;
}

export interface EvidenceStat {
  label: string;
  value: string;
}

export interface DigestTournamentMeta {
  id: string;
  title: string;
  category: string;
  totalContestants: number;
  /** deadline epoch ms — MM-DD (KST) is derived; null → TBD. */
  deadlineMs?: number | null;
  /** default ["ko","en","es"]. */
  languages?: string[];
}

export interface DigestLeader {
  rank: number;
  contestantId: string;
  name: string;
  /** 공식 영어 이름 — 초안·번역 프롬프트가 한글 이름과 함께 쓴다(NAME-I18N-1). */
  nameEn?: string;
  /** 차트가 점수를 보일 때만(chartScoresShown) — 아니면 칸 자체가 없다. */
  crownScore?: number;
  placementRate?: number;
  winRate?: number;
  shareRate?: number;
  isChampion?: boolean;
  /** weekly digest cross-tournament label. */
  tournamentTitle?: string;
}

export interface NewsDigest {
  asOf: string;
  stats: EvidenceStat[];
  leaders: DigestLeader[];
  tournamentId?: string;
  /** 결과 기사만 — 대회 전체 참여 횟수(캐시 runsTotal). AI 재료 줄에만 실린다. */
  runsTotal?: number;
  /** 결과 기사 — 차트가 아직 점수를 감추는 중(runsTotal 10 미만 · 모름). */
  scoresWaiting?: boolean;
}

function num(v: unknown): number {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
}

/**
 * ranking_cache 의 한 행 → 기사 근거 행(순수). 허용된 7개 칸만 읽는다 — 캐시에
 * voteCount · rate · placementRate · 횟수 칸이 있어도 여기서 버린다(허용 목록).
 * 결과 기사 트리거 · 관리자 콜러블 · 주간 크론이 같은 읽기를 쓴다.
 */
export function rankingRowFromCache(r: Record<string, unknown>): RankingRowLike {
  const en = (r.nameI18n as { en?: unknown } | undefined)?.en;
  return {
    rank: num(r.rank),
    contestantId: String(r.contestantId ?? ""),
    name: String(r.name ?? ""),
    nameEn: typeof en === "string" ? en.trim() : "",
    crownScore: Math.round(num(r.crownScore)),
    placementRate: num(r.placementRate),
    winRate: num(r.winRate),
    shareRate: num(r.shareRate),
  };
}

/** 캐시 문서의 대회 전체 참여 횟수 — 0 이상 정수일 때만, 아니면 undefined. */
export function runsTotalFromCache(
  data: Record<string, unknown> | undefined,
): number | undefined {
  const v = data?.runsTotal;
  return typeof v === "number" && Number.isInteger(v) && v >= 0 ? v : undefined;
}

/** 한글 이름과 영어 이름이 따로 있는 선두만 — 번역 프롬프트의 이름 표(NAME-I18N-1). */
export function nameGlossaryOf(digest: NewsDigest): { ko: string; en: string }[] {
  return digest.leaders
    .filter((l) => l.nameEn && l.nameEn !== l.name)
    .map((l) => ({ ko: l.name, en: l.nameEn as string }));
}

const kstMonthDay = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Seoul",
  month: "2-digit",
  day: "2-digit",
});

/** Epoch ms → "MM-DD" in KST (matches the sample's DEADLINE tile). */
export function formatKstMonthDay(ms: number): string {
  // en-CA month/day yields "MM-DD".
  return kstMonthDay.format(new Date(ms));
}

function langsLabel(langs: string[]): string {
  return langs.map((l) => l.toUpperCase()).join("·");
}

/** 오픈 기사 근거 — no votes yet, so pure Tournament facts. */
export function buildOpenDigest(
  meta: DigestTournamentMeta,
  asOf: string,
): NewsDigest {
  const langs = meta.languages ?? ["ko", "en", "es"];
  return {
    asOf,
    tournamentId: meta.id,
    leaders: [],
    stats: [
      { label: "CONTESTANTS", value: String(meta.totalContestants) },
      {
        label: "DEADLINE · KST",
        value:
          meta.deadlineMs != null ? formatKstMonthDay(meta.deadlineMs) : "TBD",
      },
      { label: "LANGUAGES", value: langsLabel(langs) },
    ],
  };
}

const TOP_N = 3;

function toLeaders(
  rankings: RankingRowLike[],
  championId: string | undefined,
  withScores: boolean,
): DigestLeader[] {
  return [...rankings]
    .sort((a, b) => a.rank - b.rank)
    .slice(0, TOP_N)
    .map((r) => ({
      rank: r.rank,
      contestantId: r.contestantId,
      name: r.name,
      ...(r.nameEn ? { nameEn: r.nameEn } : {}),
      ...(withScores
        ? { crownScore: r.crownScore, placementRate: r.placementRate, winRate: r.winRate, shareRate: r.shareRate }
        : {}),
      isChampion: championId ? r.contestantId === championId : false,
    }));
}

/**
 * 결과 기사 근거 — 차트 rank 순 상위 3 + 숫자 칸 [CONTESTANTS, CROWN SCORE].
 * CROWN SCORE = 차트 rank 1 행의 점수(행이 없으면 칸 없음). runsTotal 이 10 미만이거나
 * 없으면 차트처럼 점수를 감춘다 — CROWN SCORE 칸 없음 · 선두는 이름만(순위 없음 · AI 재료에서).
 */
export function buildResultDigest(args: {
  meta: DigestTournamentMeta;
  rankings: RankingRowLike[];
  championId?: string;
  asOf: string;
  /** 캐시 runsTotal — 트리거·콜러블이 넘긴다. */
  runsTotal?: number;
}): NewsDigest {
  const shown = chartScoresShown(args.runsTotal);
  const leaders = toLeaders(args.rankings, args.championId, shown);
  const stats: EvidenceStat[] = [
    { label: "CONTESTANTS", value: String(args.meta.totalContestants) },
  ];
  const top = leaders.find((l) => l.rank === 1);
  if (shown && top && top.crownScore !== undefined) {
    stats.push({ label: "CROWN SCORE", value: String(top.crownScore) });
  }
  return {
    asOf: args.asOf,
    tournamentId: args.meta.id,
    leaders,
    stats,
    ...(args.runsTotal !== undefined ? { runsTotal: args.runsTotal } : {}),
    ...(!shown && leaders.length > 0 ? { scoresWaiting: true } : {}),
  };
}

/** 글자 코드 순 — 실행 환경의 언어 설정에 따라 순서가 바뀌지 않게. */
function cmpStr(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

export interface WeeklyCacheLike {
  tournamentId: string;
  title: string;
  rankings: RankingRowLike[];
  /** 캐시 runsTotal — 10 미만이거나 없으면 그 대회는 선두에서 빠진다. */
  runsTotal?: number;
}

/**
 * 주간 랭킹 동향 — 대회마다 차트 rank 1 행 → Crown Score 큰 순 · 같으면 대회 제목 순 ·
 * 상위 3 (대표 결정 2026-11-25). runsTotal 10 미만 대회는 선두에서 빠지되 ACTIVE
 * TOURNAMENTS 에는 센다. 숫자 칸 = [ACTIVE TOURNAMENTS]. Empty field yields
 * 0 active + no leaders, no throw.
 */
export function buildWeeklyDigest(args: {
  caches: WeeklyCacheLike[];
  asOf: string;
  /** 진행 중인 대회 수(공개된 진행 중 대회만 — NEWS-2). 없으면 옛 방식(대회 수 그대로). */
  activeCount?: number;
}): NewsDigest {
  const leaders: DigestLeader[] = args.caches
    .filter((c) => chartScoresShown(c.runsTotal))
    .map((c): DigestLeader | null => {
      const top = c.rankings.find((r) => r.rank === 1);
      return top
        ? {
            rank: top.rank,
            contestantId: top.contestantId,
            name: top.name,
            ...(top.nameEn ? { nameEn: top.nameEn } : {}),
            crownScore: top.crownScore,
            placementRate: top.placementRate,
            winRate: top.winRate,
            shareRate: top.shareRate,
            tournamentTitle: c.title,
          }
        : null;
    })
    .filter((l): l is DigestLeader => l !== null)
    .sort(
      (a, b) =>
        (b.crownScore ?? 0) - (a.crownScore ?? 0) ||
        cmpStr(a.tournamentTitle ?? "", b.tournamentTitle ?? ""),
    )
    .slice(0, TOP_N);

  const stats: EvidenceStat[] = [
    { label: "ACTIVE TOURNAMENTS", value: String(args.activeCount ?? args.caches.length) },
  ];
  return { asOf: args.asOf, leaders, stats };
}
