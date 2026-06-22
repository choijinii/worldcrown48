/**
 * advanceRoundCore — pure decision for the advanceRound trigger (C-1).
 *
 * Given a round and the Voter's vote-count in that round, decide whether the
 * Voter has completed it and what happens next. Per-Voter (ADR-0001) — never
 * touches a global round. matchCount is duplicated here (functions can't import
 * the root lib; same boundary precedent as cors.ts / aiFillCore).
 */
export type AdvanceDecision = "noop" | "transition" | "champion";

const MATCH_COUNT: Record<number, number> = { 1: 24, 2: 12, 3: 6, 4: 3, 5: 1 };
const FINAL_ROUND = 5;

export function advanceRoundDecision(
  round: number,
  voterRoundVoteCount: number,
): AdvanceDecision {
  const need = MATCH_COUNT[round];
  if (!need || voterRoundVoteCount < need) return "noop";
  return round === FINAL_ROUND ? "champion" : "transition";
}

export function nextRound(round: number): number {
  return round + 1;
}
