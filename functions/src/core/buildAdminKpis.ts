/**
 * buildAdminKpis — the Admin Dashboard's PURE KPI aggregation (G-1 §3, §6.5).
 *
 * Single decision node, node-env vitest TDD'd. The callable wrapper
 * (getAdminKpis.ts) is the ONLY place with Firestore I/O + Timestamps: it reads
 * `votes` / `tournaments` / `admin_alerts` once each, flattens them into the
 * plain `{ ...Ms }` shapes below, and passes an explicit `now` so every rolling
 * window is deterministic (no Date.now() here — same rule as scheduleRankingCacheCore).
 *
 * `dir` is the COLOUR semantic, not the numeric sign: "up" = good (turquoise),
 * "down" = bad (crimson), "flat" = grey. Polarity is per-metric — for
 * abuse_warnings, MORE is bad, so a rise maps to "down". The UI stays dumb.
 *
 * Vote Count rule (CLAUDE.md #8): `value` here is admin-internal only; the
 * client renders it solely inside the operator-only dashboard.
 */

export interface VoteLike {
  userId: string;
  createdAtMs: number;
}

export interface TournamentLike {
  status: string;
  currentRound: number;
  tournamentDeadlineMs: number | null;
}

export interface AlertLike {
  resolved: boolean;
  createdAtMs: number;
}

export type DeltaDir = "up" | "down" | "flat";

export interface KpiMetric {
  value: number;
  /** Signed percent vs the prior window; null when there is no baseline. */
  deltaPct: number | null;
  /** Signed absolute delta (used where percent is meaningless, e.g. abuse). */
  deltaAbs: number | null;
  dir: DeltaDir;
}

export interface RoundDistribution {
  round: number;
  count: number;
}

export interface RoundStatus {
  activeCount: number;
  distribution: RoundDistribution[];
  /** Nearest FUTURE Tournament Deadline among active Tournaments; null if none. */
  nextDeadlineMs: number | null;
}

export interface ChartPoint {
  /** Bucket START in ms (hour boundary). */
  hourMs: number;
  votes: number;
}

export interface VoteChart {
  series: ChartPoint[];
  total24h: number;
  peakHourMs: number | null;
  peakVotes: number;
  /** votes/hr in the most recent bucket. */
  nowRate: number;
}

export interface KpiSnapshot {
  totalVotes: KpiMetric;
  activeVoters: KpiMetric;
  voteSpeed: KpiMetric;
  abuseWarnings: KpiMetric;
  roundStatus: RoundStatus;
  chart: VoteChart;
  generatedAtMs: number;
}

export interface BuildAdminKpisInput {
  /** Votes within the windowed range the wrapper read (last ~48h). */
  votes: VoteLike[];
  tournaments: TournamentLike[];
  alerts: AlertLike[];
  now: number;
  /**
   * All-time vote count from a cheap Firestore count() aggregation. The wrapper
   * only reads the last ~48h of `votes` (cost — handoff §9 ethos), so the
   * all-time total comes in separately. Falls back to `votes.length` (tests).
   */
  totalVotesAllTime?: number;
}

const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;
const CHART_BUCKETS = 24;

/** Round a number to 1 decimal place. */
function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

/**
 * Good-polarity metric (more = up/good). `baseline === 0` → no percent baseline.
 */
function metricUp(current: number, baseline: number): KpiMetric {
  const dir: DeltaDir =
    current > baseline ? "up" : current < baseline ? "down" : "flat";
  const deltaPct = baseline > 0 ? round1(((current - baseline) / baseline) * 100) : null;
  return { value: current, deltaPct, deltaAbs: current - baseline, dir };
}

export function buildAdminKpis(input: BuildAdminKpisInput): KpiSnapshot {
  const { votes, tournaments, alerts, now } = input;

  // ── votes — ONE pass over the windowed array (the wrapper already trimmed it
  //    to ~48h). Avoids ~30 separate filter() scans on a hot 60s-poll path. ──
  let last24 = 0;
  let prior24 = 0;
  let speedNow = 0;
  let speedPrev = 0;
  const activeNowIds = new Set<string>();
  const activePrevIds = new Set<string>();
  // 24 hourly buckets, oldest→newest. series[23] = the most recent hour.
  const buckets = new Array<number>(CHART_BUCKETS).fill(0);

  for (const v of votes) {
    const ago = now - v.createdAtMs;
    if (ago < 0) continue; // future-dated row — ignore
    if (ago < DAY) {
      last24 += 1;
      const hoursAgo = Math.floor(ago / HOUR); // 0 = current hour
      if (hoursAgo < CHART_BUCKETS) buckets[CHART_BUCKETS - 1 - hoursAgo] += 1;
    } else if (ago < 2 * DAY) {
      prior24 += 1;
    }
    if (ago < HOUR) activeNowIds.add(v.userId);
    else if (ago < 2 * HOUR) activePrevIds.add(v.userId);
    if (ago < MIN) speedNow += 1;
    else if (ago < 2 * MIN) speedPrev += 1;
  }

  // ── total_votes — all-time count; delta = last 24h vs the 24h before. ──
  const totalVotes: KpiMetric = {
    ...metricUp(last24, prior24),
    // card shows the all-time total, delta describes the recent trend
    value: input.totalVotesAllTime ?? votes.length,
  };

  // ── active_voters (distinct, last 1h) · vote_speed (last 60s). ──
  const activeVoters = metricUp(activeNowIds.size, activePrevIds.size);
  const voteSpeed = metricUp(speedNow, speedPrev);

  // ── abuse_warnings — standing unresolved count; bad-polarity (more = down).
  //    `dir` reflects the STANDING danger (any open warning → crimson), not just
  //    the last hour, so a backlog never renders calm-grey. deltaAbs = new in 1h.
  const unresolved = alerts.filter((a) => !a.resolved);
  const abuseValue = unresolved.length;
  const abuseNew = unresolved.filter((a) => now - a.createdAtMs < HOUR).length;
  const abuseWarnings: KpiMetric = {
    value: abuseValue,
    deltaPct: null,
    deltaAbs: abuseNew,
    dir: abuseValue > 0 ? "down" : "flat",
  };

  // ── round_status — active Tournaments, per-round distribution, next Deadline. ──
  const active = tournaments.filter((t) => t.status === "active");
  const byRound = new Map<number, number>();
  for (const t of active) byRound.set(t.currentRound, (byRound.get(t.currentRound) ?? 0) + 1);
  const distribution: RoundDistribution[] = [...byRound.entries()]
    .map(([round, count]) => ({ round, count }))
    .sort((a, b) => a.round - b.round);
  const futureDeadlines = active
    .map((t) => t.tournamentDeadlineMs)
    .filter((ms): ms is number => ms !== null && ms > now);
  const nextDeadlineMs = futureDeadlines.length ? Math.min(...futureDeadlines) : null;

  // ── chart — materialize the 24 buckets (start ms + count). ──
  const series: ChartPoint[] = buckets.map((count, idx) => ({
    hourMs: now - (CHART_BUCKETS - idx) * HOUR,
    votes: count,
  }));
  const total24h = last24;
  let peakVotes = 0;
  let peakHourMs: number | null = null;
  for (const p of series) {
    if (p.votes > peakVotes) {
      peakVotes = p.votes;
      peakHourMs = p.hourMs;
    }
  }
  const nowRate = series[series.length - 1]?.votes ?? 0;

  return {
    totalVotes,
    activeVoters,
    voteSpeed,
    abuseWarnings,
    roundStatus: { activeCount: active.length, distribution, nextDeadlineMs },
    chart: { series, total24h, peakHourMs, peakVotes, nowRate },
    generatedAtMs: now,
  };
}
