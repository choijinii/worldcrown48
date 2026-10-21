/**
 * newsDigestCore — pure aggregation of the EXISTING ranking_cache into 기사 근거
 * 수치 (ND-1 §3 #2, AC 3·4). No new aggregation logic is invented: the C-3 cron
 * already tallied votes into `ranking_cache` (rankingAggregator · computeRankings),
 * and this module only summarizes that output into evidence stats + leaders.
 *
 * CLAUDE.md 원칙 #8 / LANGUAGE.md — VOTE COUNT NEVER LEAVES THIS MODULE. The cache
 * carries an internal `voteCount` for the cron's rate math; a digest exposes ONLY
 * rate (%), rank, name, and counts-of-things (Contestants·Tournaments)·dates. The
 * raw tally is dropped on the way in.
 *
 * TODO(ND-CROWN-SCORE): 랭킹 개편(대개편) 시 데이터 소스 스왑 — the weekly digest
 * currently ranks by the누적 ranking_cache rate; Crown Score(우승비율×50%+점유율×50%)
 * replaces the source here without touching the article/prompt layers.
 */

/** One ranking row as stored in ranking_cache (voteCount is dropped on read). */
export interface RankingRowLike {
  rank: number;
  contestantId: string;
  name: string;
  /** NAME-I18N-1 (원장 D-61) — 차트 캐시의 nameI18n.en. 옛 캐시엔 없다(빈칸). */
  nameEn?: string;
  rate: number;
  /** INTERNAL — present in the cache, NEVER surfaced by a digest. */
  voteCount?: number;
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
  rate: number;
  isChampion?: boolean;
  /** weekly digest cross-tournament label. */
  tournamentTitle?: string;
}

export interface NewsDigest {
  asOf: string;
  stats: EvidenceStat[];
  leaders: DigestLeader[];
  tournamentId?: string;
}

/**
 * ranking_cache 의 한 행 → 기사 근거 행(순수). voteCount 는 여기서 버린다(원칙 #8).
 * 결과 기사 트리거 · 관리자 콜러블 · 주간 크론이 같은 읽기를 쓴다.
 */
export function rankingRowFromCache(r: Record<string, unknown>): RankingRowLike {
  const en = (r.nameI18n as { en?: unknown } | undefined)?.en;
  return {
    rank: Number(r.rank ?? 0),
    contestantId: String(r.contestantId ?? ""),
    name: String(r.name ?? ""),
    nameEn: typeof en === "string" ? en.trim() : "",
    rate: Number(r.rate ?? 0),
  };
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

function rateStr(rate: number): string {
  return `${rate.toFixed(1)}%`;
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
  championId?: string,
): DigestLeader[] {
  return [...rankings]
    .sort((a, b) => a.rank - b.rank)
    .slice(0, TOP_N)
    .map((r) => ({
      rank: r.rank,
      contestantId: r.contestantId,
      name: r.name,
      ...(r.nameEn ? { nameEn: r.nameEn } : {}),
      rate: r.rate,
      isChampion: championId ? r.contestantId === championId : false,
    }));
}

/** 결과 기사 근거 — Champion + 상위 rate. Vote Count 금지: rate/rank/name만. */
export function buildResultDigest(args: {
  meta: DigestTournamentMeta;
  rankings: RankingRowLike[];
  championId?: string;
  asOf: string;
}): NewsDigest {
  const leaders = toLeaders(args.rankings, args.championId);
  const champion = leaders.find((l) => l.isChampion) ?? leaders[0];
  const stats: EvidenceStat[] = [
    { label: "CONTESTANTS", value: String(args.meta.totalContestants) },
  ];
  if (champion) {
    stats.push({ label: "TOP RATE", value: rateStr(champion.rate) });
  }
  if (leaders[1]) {
    stats.push({ label: "RUNNER-UP RATE", value: rateStr(leaders[1].rate) });
  }
  return { asOf: args.asOf, tournamentId: args.meta.id, leaders, stats };
}

export interface WeeklyCacheLike {
  tournamentId: string;
  title: string;
  rankings: RankingRowLike[];
}

/**
 * 주간 랭킹 동향 — ranks active Tournaments by their leader's rate (누적 기반, 현행
 * ranking_cache). Empty field (참가 직후 크론) yields 0 active + no leaders, no throw.
 */
export function buildWeeklyDigest(args: {
  caches: WeeklyCacheLike[];
  asOf: string;
}): NewsDigest {
  const leaders: DigestLeader[] = args.caches
    .map((c): DigestLeader | null => {
      const top = [...c.rankings].sort((a, b) => a.rank - b.rank)[0];
      return top
        ? {
            rank: top.rank,
            contestantId: top.contestantId,
            name: top.name,
            ...(top.nameEn ? { nameEn: top.nameEn } : {}),
            rate: top.rate,
            tournamentTitle: c.title,
          }
        : null;
    })
    .filter((l): l is DigestLeader => l !== null)
    .sort((a, b) => b.rate - a.rate)
    .slice(0, TOP_N);

  const stats: EvidenceStat[] = [
    { label: "ACTIVE TOURNAMENTS", value: String(args.caches.length) },
  ];
  if (leaders[0]) {
    stats.push({ label: "TOP MOMENTUM", value: rateStr(leaders[0].rate) });
  }
  return { asOf: args.asOf, leaders, stats };
}
