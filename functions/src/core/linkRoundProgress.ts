/**
 * linkRoundProgress — pure planner for the Guest Run roundProgress transfer
 * (HF-3 W4, Phase 3.3). Sibling of linkSeeds.ts: keeps the transfer decision
 * table pure so it is unit-tested without Firestore. The impure linkSessionVote
 * fetches the facts + field snapshots and executes the writes.
 *
 * Per tournament the guest voted in:
 *   - Google already has a roundProgress → SKIP (Google data wins, §8 Edge #1).
 *     The response `complete` reflects the GOOGLE doc (landing follows it).
 *   - Guest has no roundProgress (mid round-1; re-parented votes carry the
 *     state, and advanceRound is onCreate so it won't re-fire) → SKIP.
 *   - Guest doc, incomplete → COPY (single create under the new uid).
 *   - Guest doc, complete   → REFIRE: a 2-stage create(complete=false) →
 *     update(complete=true + championId) so the onChampionConfirmed
 *     onDocumentUpdated trigger sees a false→true edge and regenerates the Crown
 *     Card under the new uid (Option A, §확인 필요 2). The two writes MUST be
 *     separate commits — a single create carrying complete=true fires only
 *     onDocumentCreated, never onDocumentUpdated.
 */
export interface RoundProgressFacts {
  tournamentId: string;
  guestExists: boolean;
  guestComplete: boolean;
  googleExists: boolean;
  googleComplete: boolean;
}

export type RoundProgressAction = "skip" | "copy" | "refire";

export interface RoundProgressDecision {
  tournamentId: string;
  action: RoundProgressAction;
  /** Resulting completion under the Google uid — drives the client landing (W6). */
  responseComplete: boolean;
}

export function planRoundProgressTransfer(
  facts: RoundProgressFacts[],
): RoundProgressDecision[] {
  return facts.map((f) => {
    if (f.googleExists) {
      return { tournamentId: f.tournamentId, action: "skip", responseComplete: f.googleComplete };
    }
    if (!f.guestExists) {
      return { tournamentId: f.tournamentId, action: "skip", responseComplete: false };
    }
    if (f.guestComplete) {
      return { tournamentId: f.tournamentId, action: "refire", responseComplete: true };
    }
    return { tournamentId: f.tournamentId, action: "copy", responseComplete: false };
  });
}

/** The linkSessionVote response payload — one entry per transferred tournament. */
export function transferredTournaments(
  plan: RoundProgressDecision[],
): Array<{ tournamentId: string; complete: boolean }> {
  return plan.map((d) => ({ tournamentId: d.tournamentId, complete: d.responseComplete }));
}
