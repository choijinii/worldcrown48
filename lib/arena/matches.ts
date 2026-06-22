/**
 * Per-Voter bracket generation (Domain 3 · The Arena) — ADR-0001.
 *
 * The crux of C-1. Each Voter traverses their OWN binary tree; the `votes`
 * collection is the single source of truth for who they advanced, so the
 * bracket is a PURE function of (contestants, votes) and survives a refresh
 * (no in-memory bracket state).
 *
 *   - Round 1 participants = contestants sorted by `order` ascending.
 *   - Round N (N≥2) participants = the Voter's round-(N-1) winners, in match
 *     order — so adjacent match winners meet (classic single-elimination).
 *   - matchId = `${tournamentId}:r${round}:m${index}` (0-based, deterministic).
 *   - THE FINAL (round 5) = one match holding all 3 finalists (never 1v1).
 *
 * A round can only be built once the prior round is complete (its winner count
 * equals the prior round's matchCount) — advanceRound gates this; we throw a
 * clear error if asked too early.
 */
import {
  isFinalRound,
  matchCountForRound,
  type RoundIndex,
} from "./roundConfig";

export interface ArenaVote {
  round: number;
  matchId: string;
  /** The contestant the Voter picked = the winner of that match. */
  contestantId: string;
}

export interface ArenaMatch {
  matchId: string;
  round: RoundIndex;
  index: number;
  /** length 2 for rounds 1–4; length 3 for round 5 (THE FINAL). */
  contestantIds: string[];
}

type Seed = { id: string; order: number };

export function matchIdFor(
  tournamentId: string,
  round: number,
  index: number,
): string {
  return `${tournamentId}:r${round}:m${index}`;
}

export function matchIndexOf(matchId: string): number {
  const m = matchId.match(/:m(\d+)$/);
  if (!m) throw new Error(`Invalid matchId: ${matchId}`);
  return Number(m[1]);
}

/** Round 1 participants: contestant ids sorted by `order` ascending. */
export function round1OrderedIds(contestants: Seed[]): string[] {
  return [...contestants].sort((a, b) => a.order - b.order).map((c) => c.id);
}

/** The Voter's winners for a round, ordered by match index. */
export function winnerIdsForRound(votes: ArenaVote[], round: number): string[] {
  return votes
    .filter((v) => v.round === round)
    .sort((a, b) => matchIndexOf(a.matchId) - matchIndexOf(b.matchId))
    .map((v) => v.contestantId);
}

/** Participants competing in `round`, derived purely from votes (refresh-safe). */
export function contestantIdsForRound(
  contestants: Seed[],
  votes: ArenaVote[],
  round: RoundIndex,
): string[] {
  if (round === 1) return round1OrderedIds(contestants);

  const prev = (round - 1) as RoundIndex;
  const winners = winnerIdsForRound(votes, prev);
  const expected = matchCountForRound(prev);
  if (winners.length !== expected) {
    throw new Error(
      `Round ${round} not ready: round ${prev} has ${winners.length}/${expected} winners`,
    );
  }
  return winners;
}

/** Matches for a round given its participant ids. */
export function buildMatchesForRound(
  tournamentId: string,
  round: RoundIndex,
  contestantIds: string[],
): ArenaMatch[] {
  if (isFinalRound(round)) {
    // THE FINAL — one match, all 3 finalists shown together (never 1v1).
    return [
      {
        matchId: matchIdFor(tournamentId, round, 0),
        round,
        index: 0,
        contestantIds: [...contestantIds],
      },
    ];
  }

  const matches: ArenaMatch[] = [];
  for (let i = 0; i * 2 < contestantIds.length; i++) {
    matches.push({
      matchId: matchIdFor(tournamentId, round, i),
      round,
      index: i,
      contestantIds: [contestantIds[i * 2], contestantIds[i * 2 + 1]],
    });
  }
  return matches;
}

/** Convenience: the matches for `round`, derived from contestants + votes. */
export function matchesForRound(
  tournamentId: string,
  contestants: Seed[],
  votes: ArenaVote[],
  round: RoundIndex,
): ArenaMatch[] {
  return buildMatchesForRound(
    tournamentId,
    round,
    contestantIdsForRound(contestants, votes, round),
  );
}
