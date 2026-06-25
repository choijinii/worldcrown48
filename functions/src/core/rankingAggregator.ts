/**
 * rankingAggregator — pure reduction of votes → per-contestant tallies (handoff
 * §3 / trap #2). The cron loads the `votes` for one Tournament ONCE and groups in
 * memory here (no per-contestant aggregation query), then joins contestant
 * metadata (name/imageUrl) so the cache is denormalized for the UI. Pure & total
 * — node-env vitest, no Firestore.
 */
import type { ContestantTally } from "../_ranking/rankingTypes";

/** One vote's only field we need to tally. */
export interface VoteLike {
  contestantId: string;
}

/** Minimal contestant metadata the cron joins (Contestant doc fields). */
export interface ContestantMeta {
  id: string;
  name: string;
  imageUrl: string;
}

/** Group raw votes into a contestantId → count map. */
export function tallyVotes(votes: VoteLike[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const v of votes) {
    if (!v.contestantId) continue;
    counts.set(v.contestantId, (counts.get(v.contestantId) ?? 0) + 1);
  }
  return counts;
}

/**
 * Join counts onto the Tournament's contestants. One tally per contestant
 * (0-vote ones included — computeRankings filters them out). Empty `imageUrl`
 * is normalized to null (RankingEntry.imageUrl is `string | null`).
 */
export function buildTallies(
  counts: Map<string, number>,
  contestants: ContestantMeta[],
): ContestantTally[] {
  return contestants.map((c) => ({
    contestantId: c.id,
    name: c.name,
    imageUrl: c.imageUrl ? c.imageUrl : null,
    voteCount: counts.get(c.id) ?? 0,
  }));
}
