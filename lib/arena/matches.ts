/**
 * Per-Voter bracket generation (Domain 3 · The Arena) — ADR-0001 / ADR-0007.
 *
 * The crux of C-1. Each Voter traverses their OWN binary tree; the `votes`
 * collection is the single source of truth for who they advanced, so the
 * bracket is a PURE function of (contestants, votes, bracketSeed) and survives
 * a refresh (no in-memory bracket state).
 *
 *   - Round 1 participants = contestants sorted by `order`, then SEED-shuffled
 *     (HF-2 / ADR-0007). Order-sort makes the input canonical; the seed makes
 *     the pairing per-Voter random yet refresh-stable.
 *   - Round N (N≥2) participants = the Voter's round-(N-1) winners, seed-shuffled
 *     with a per-round derived seed — so who-meets-whom is random each round but
 *     still deterministic for a given (seed, round).
 *   - matchId = `${tournamentId}:r${round}:m${index}` (0-based, deterministic).
 *   - THE FINAL (round 5) = one match holding all 3 finalists (never 1v1); the
 *     3-up display order is seed-shuffled too.
 *
 * The seed is a per-Voter, per-Tournament constant stored in `bracket_seeds`
 * (created once on Arena entry; carried across guest→login by linkSessionVote).
 * Because the bracket depends ONLY on (contestants, votes, seed) — never on the
 * uid — transferring the seed value on login reproduces the identical bracket.
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

// ── Deterministic PRNG (ADR-0007) ────────────────────────────────────────
// mulberry32: a tiny, dependency-free, well-distributed 32-bit PRNG. Math.random
// is FORBIDDEN here (non-deterministic → breaks refresh-safety). Public domain.

/** Returns a generator producing floats in [0,1) deterministically from `seed`. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Fisher–Yates shuffle driven by mulberry32(seed). Pure — never mutates input. */
export function seededShuffle<T>(items: T[], seed: number): T[] {
  const arr = [...items];
  const rand = mulberry32(seed >>> 0);
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Per-round seed derivation: mix the base seed with the round so each round
// shuffles differently, yet deterministically (ADR-0007). 0x9E3779B9 is the
// golden-ratio constant used for good bit diffusion.
const ROUND_MIX = 0x9e3779b9;
function roundSeed(seed: number, round: number): number {
  return (seed ^ Math.imul(round, ROUND_MIX)) >>> 0;
}

/**
 * Round 1 participants: contestant ids sorted by `order` (canonical), then
 * seed-shuffled so each Voter sees a different — but refresh-stable — pairing.
 */
export function round1OrderedIds(contestants: Seed[], seed: number): string[] {
  const ordered = [...contestants]
    .sort((a, b) => a.order - b.order)
    .map((c) => c.id);
  return seededShuffle(ordered, roundSeed(seed, 1));
}

/** The Voter's winners for a round, ordered by match index. */
export function winnerIdsForRound(votes: ArenaVote[], round: number): string[] {
  return votes
    .filter((v) => v.round === round)
    .sort((a, b) => matchIndexOf(a.matchId) - matchIndexOf(b.matchId))
    .map((v) => v.contestantId);
}

/**
 * Participants competing in `round`, derived purely from (votes, seed) —
 * refresh-safe. Round N≥2 winners are seed-shuffled with a per-round seed so
 * the pairing (and THE FINAL's 3-up order) is random yet deterministic.
 */
export function contestantIdsForRound(
  contestants: Seed[],
  votes: ArenaVote[],
  round: RoundIndex,
  seed: number,
): string[] {
  if (round === 1) return round1OrderedIds(contestants, seed);

  const prev = (round - 1) as RoundIndex;
  const winners = winnerIdsForRound(votes, prev);
  const expected = matchCountForRound(prev);
  if (winners.length !== expected) {
    throw new Error(
      `Round ${round} not ready: round ${prev} has ${winners.length}/${expected} winners`,
    );
  }
  return seededShuffle(winners, roundSeed(seed, round));
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

/** Convenience: the matches for `round`, derived from (contestants, votes, seed). */
export function matchesForRound(
  tournamentId: string,
  contestants: Seed[],
  votes: ArenaVote[],
  round: RoundIndex,
  seed: number,
): ArenaMatch[] {
  return buildMatchesForRound(
    tournamentId,
    round,
    contestantIdsForRound(contestants, votes, round, seed),
  );
}
