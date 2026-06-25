/**
 * lib/ranking/computeRankings — pure rank/rate computation (handoff §6.4).
 *
 * Input is one {@link ContestantTally} per contestant; output is the ordered
 * {@link RankingEntry}[] the cache persists and the UI renders. Pure & total —
 * no Firestore, no Date, no SDK — so it is node-env vitest TDD'd directly and
 * mirrored into functions/src/_ranking.
 *
 * Rules:
 *   - voteCount === 0 contestants are EXCLUDED (handoff §6.1 — empty state covers
 *     a 0-total Tournament).
 *   - rate = voteCount / totalVotes × 100, rounded to 1 decimal (share, not /100pt).
 *   - ties share a rank, the next rank is skipped (5/5/3 → ranks 1·1·3).
 *   - tie display order is contestantId ascending (deterministic).
 */
import type { ContestantTally, RankingEntry } from "./rankingTypes";

/** Round a percentage share to a single decimal place (33.34 → 33.3). */
export function roundRate(share: number): number {
  if (!Number.isFinite(share)) return 0;
  return Math.round(share * 10) / 10;
}

/** Sum of all non-negative tallies — the rate denominator. */
export function totalVotesOf(tallies: ContestantTally[]): number {
  return tallies.reduce((sum, t) => sum + Math.max(0, t.voteCount), 0);
}

export function computeRankings(tallies: ContestantTally[]): RankingEntry[] {
  const positive = tallies.filter((t) => t.voteCount > 0);
  const totalVotes = totalVotesOf(positive);
  if (totalVotes === 0) return [];

  const sorted = [...positive].sort(
    (a, b) =>
      b.voteCount - a.voteCount ||
      a.contestantId.localeCompare(b.contestantId),
  );

  const entries: RankingEntry[] = [];
  let prevCount = Number.NaN;
  let prevRank = 0;
  sorted.forEach((t, i) => {
    const rank = t.voteCount === prevCount ? prevRank : i + 1;
    prevCount = t.voteCount;
    prevRank = rank;
    entries.push({
      rank,
      contestantId: t.contestantId,
      name: t.name,
      imageUrl: t.imageUrl,
      voteCount: t.voteCount,
      rate: roundRate((t.voteCount / totalVotes) * 100),
    });
  });
  return entries;
}
