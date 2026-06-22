/**
 * Round/Tournament progress (Domain 3 · The Arena) — ALL derived from votes.
 *
 * No extra state (ADR-0001): votedMatchIds, the current match index, round
 * completion, the current round, and the Champion are all functions of the
 * Voter's `votes`. Combined with matches.ts this makes the entire Arena flow a
 * pure function of (contestants, votes) — refresh-safe by construction.
 *
 * "No skip" invariant: a Voter votes matches in order m0, m1, … so the count of
 * votes in a round IS the index of the next (current) match.
 */
import {
  FINAL_ROUND,
  matchCountForRound,
  type RoundIndex,
} from "./roundConfig";
import { winnerIdsForRound, type ArenaVote } from "./matches";

const ROUNDS: RoundIndex[] = [1, 2, 3, 4, 5];

function votesInRound(votes: ArenaVote[], round: RoundIndex): ArenaVote[] {
  return votes.filter((v) => v.round === round);
}

export function votedMatchIds(
  votes: ArenaVote[],
  round: RoundIndex,
): Set<string> {
  return new Set(votesInRound(votes, round).map((v) => v.matchId));
}

export function hasVoted(votes: ArenaVote[], matchId: string): boolean {
  return votes.some((v) => v.matchId === matchId);
}

/** Count of votes in the round = index of the next (current) match. */
export function currentMatchIndex(
  votes: ArenaVote[],
  round: RoundIndex,
): number {
  return votesInRound(votes, round).length;
}

export function isRoundComplete(
  votes: ArenaVote[],
  round: RoundIndex,
): boolean {
  return votesInRound(votes, round).length >= matchCountForRound(round);
}

/** First round not yet complete; FINAL_ROUND when the whole run is done. */
export function currentRound(votes: ArenaVote[]): RoundIndex {
  for (const r of ROUNDS) {
    if (!isRoundComplete(votes, r)) return r;
  }
  return FINAL_ROUND;
}

export function isTournamentComplete(votes: ArenaVote[]): boolean {
  return isRoundComplete(votes, FINAL_ROUND);
}

/** The Voter's THE FINAL pick once complete, else null. */
export function championId(votes: ArenaVote[]): string | null {
  if (!isTournamentComplete(votes)) return null;
  return winnerIdsForRound(votes, FINAL_ROUND)[0] ?? null;
}
