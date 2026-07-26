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
