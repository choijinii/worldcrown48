/**
 * guestVoteGuard — pure server-side Guest Run policy decision (HF-3 W3, AC7).
 *
 * Defense-in-depth: the client gate (lib/voteGate.decideVoteGate) is bypassable,
 * so onVote independently refuses a policy-violating anonymous vote. This core is
 * pure so the branch logic is unit-tested without Firestore; onVote fetches the
 * facts with the admin SDK and maps a `deny` to HttpsError('permission-denied').
 *
 * Mirrors the client's guest branches exactly (they must not drift):
 *   - re-voting in a Tournament the guest already completed → deny
 *   - voting in a second (different) Tournament             → deny (one run only)
 *   - first Tournament, or the same one in progress         → allow
 */
export interface GuestVoteFacts {
  isAnonymous: boolean;
  /** roundProgress/{anonUid}_{currentTid}.complete === true. */
  completedCurrentTournament: boolean;
  /** The anon uid has a bracket seed for some tid !== the current one. */
  enteredOtherTournament: boolean;
}

export type GuestGuardDecision =
  | { status: "allow" }
  | { status: "deny"; reason: string };

export function decideGuestVoteGuard(facts: GuestVoteFacts): GuestGuardDecision {
  // Signed-in (non-anonymous) callers are never guest-guarded — HF-1 rules apply.
  if (!facts.isAnonymous) return { status: "allow" };
  if (facts.completedCurrentTournament) {
    return {
      status: "deny",
      reason: "Guest Run already completed — sign in to keep voting.",
    };
  }
  if (facts.enteredOtherTournament) {
    return {
      status: "deny",
      reason: "A Guest Run is one Tournament — sign in to enter another.",
    };
  }
  return { status: "allow" };
}
