/**
 * linkRoundProgress — pure planner for the Guest Run roundProgress transfer
 * (HF-3 W4, Phase 3.3). Sibling of linkSeeds.ts: keeps the transfer decision
 * table pure so it is unit-tested without Firestore. The impure linkSessionVote
 * fetches the facts + field snapshots and executes the writes.
 *
 * HF-3.1 (2026-07-08): the decision now also carries `source` — `guest` for the
 * run just completed (refire/copy) vs `existing` for a doc that already lived
 * under the Google uid (a CONFLICT, case 2). The client uses it to land on the
 * fresh run first and to raise the "already finished" banner on the fallback.
 * `conflictTournamentIds` exposes the googleExists set so the caller can DELETE
 * (not re-parent) the guest votes on those conflicting tournaments.
 *
 * Per tournament the guest voted in:
 *   - Google already has a roundProgress → SKIP (Google data wins, §8 Edge #1),
 *     source=`existing`, votes DELETED (HF-3.1). The response `complete` reflects
 *     the GOOGLE doc (landing follows it, with a banner).
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

/**
 * Provenance of the landing target (HF-3.1). `guest` = this very guest run
 * (refire/copy of the guest's own doc); `existing` = a doc that already lived
 * under the Google uid, i.e. a CONFLICT (case 2). The client lands on a `guest`
 * completion first and only falls back to an `existing` completion — with a
 * "you already finished this" banner — so a stale old card never masquerades as
 * the run the visitor just completed.
 */
export type RoundProgressSource = "guest" | "existing";

export interface RoundProgressDecision {
  tournamentId: string;
  action: RoundProgressAction;
  /** Resulting completion under the Google uid — drives the client landing (W6). */
  responseComplete: boolean;
  /** Where the landing card came from (HF-3.1 W2 priority + banner). */
  source: RoundProgressSource;
}

export function planRoundProgressTransfer(
  facts: RoundProgressFacts[],
): RoundProgressDecision[] {
  return facts.map((f) => {
    // Google already owns a doc for this tid → conflict (case 2). We keep the
    // existing doc (Google wins) and mark the landing `existing`.
    if (f.googleExists) {
      return { tournamentId: f.tournamentId, action: "skip", responseComplete: f.googleComplete, source: "existing" };
    }
    // Guest never wrote a roundProgress (mid round-1) → nothing to land on.
    if (!f.guestExists) {
      return { tournamentId: f.tournamentId, action: "skip", responseComplete: false, source: "existing" };
    }
    if (f.guestComplete) {
      return { tournamentId: f.tournamentId, action: "refire", responseComplete: true, source: "guest" };
    }
    return { tournamentId: f.tournamentId, action: "copy", responseComplete: false, source: "guest" };
  });
}

/**
 * HF-3.1 conflict judgement — the tids where the Google uid ALREADY has a
 * roundProgress (case 2). The guest's votes on these tournaments are DELETED,
 * not re-parented, so a single account can't double-vote and skew Vote Rate
 * (§8 Edge #1 design flaw). Pure so the impure caller reads facts ONCE (before
 * touching any votes) and branches the write phase on this list.
 */
export function conflictTournamentIds(facts: RoundProgressFacts[]): string[] {
  return facts.filter((f) => f.googleExists).map((f) => f.tournamentId);
}

/** The linkSessionVote response payload — one entry per transferred tournament. */
export function transferredTournaments(
  plan: RoundProgressDecision[],
): Array<{ tournamentId: string; complete: boolean; source: RoundProgressSource }> {
  return plan.map((d) => ({ tournamentId: d.tournamentId, complete: d.responseComplete, source: d.source }));
}
