/**
 * onChampionConfirmedCore — pure transition guard for the Crown Card trigger
 * (handoff §3, 부록 D, ADR-0005).
 *
 * The trigger fires on every roundProgress write. A Crown Card must be generated
 * exactly once, on the false→true edge of `complete`, and only when the doc
 * carries a real Champion (championId + userId + tournamentId). A redelivered
 * "already complete" event (before.complete === true) must be a no-op — that,
 * plus the crown_cards existence check in the trigger, gives idempotency.
 */
export interface RoundProgressData {
  /** RUN-1: 이 판의 회차. 옛 문서에는 없다 → 읽는 쪽에서 1로 본다. */
  runIndex?: number;
  userId?: string | null;
  tournamentId?: string | null;
  complete?: boolean;
  championId?: string | null;
}

export function shouldGenerateCrownCard(
  before: RoundProgressData | undefined,
  after: RoundProgressData | undefined,
): boolean {
  if (!after) return false;
  // Only the false→true edge — never a redelivered already-complete event.
  if (before?.complete === true) return false;
  if (after.complete !== true) return false;
  // Must carry a real Champion + identity.
  return Boolean(after.championId && after.userId && after.tournamentId);
}
