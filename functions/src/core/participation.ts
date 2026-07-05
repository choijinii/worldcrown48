/**
 * participation — pure Daily Participation Limit decision (HF-1).
 *
 * Rule (대표 결정 2026-07-05): a Voter may JOIN at most 5 NEW Tournaments per
 * KST day. Voting inside an already-joined Tournament is unlimited — the 48-
 * bracket's 46-vote path (24+12+6+3+1) is the natural cap, so no per-vote
 * counting remains. This replaces the retired "Daily Vote Limit" concept.
 *
 * The decision is pure so the onVote transaction stays a thin adapter over it.
 * The KST-day reset is expressed entirely through `participationDocId` — a new
 * day yields a new doc id, hence an empty set, hence a fresh quota.
 */
export const DAILY_PARTICIPATION_LIMIT = 5;

export type ParticipationDecision =
  | { status: "allowed"; consumesQuota: boolean }
  | { status: "limit_reached" };

/**
 * @param participatedTournamentIds Tournaments this Voter already joined today.
 * @param tournamentId              The Tournament this vote belongs to.
 * @param limit                     Overridable for tests; defaults to 5.
 */
export function decideParticipation(args: {
  participatedTournamentIds: string[];
  tournamentId: string;
  limit?: number;
}): ParticipationDecision {
  const {
    participatedTournamentIds,
    tournamentId,
    limit = DAILY_PARTICIPATION_LIMIT,
  } = args;

  // Already joined this Tournament today → unlimited within it, no quota spent.
  if (participatedTournamentIds.includes(tournamentId)) {
    return { status: "allowed", consumesQuota: false };
  }
  // A new Tournament, but the daily participation quota is exhausted.
  if (participatedTournamentIds.length >= limit) {
    return { status: "limit_reached" };
  }
  // A new Tournament under the limit → allowed, consumes one participation slot.
  return { status: "allowed", consumesQuota: true };
}

/** Per-uid, per-KST-day document id: `${uid}_${date}` (date = YYYY-MM-DD KST). */
export function participationDocId(uid: string, date: string): string {
  return `${uid}_${date}`;
}
