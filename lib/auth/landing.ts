/**
 * landing — pure decision for where a guest lands after signing in (HF-3.1 W2).
 *
 * linkSessionVote returns one entry per Tournament the guest run touched. This
 * picks the landing target from the acceptance table's two completion kinds:
 *
 *   - `complete` + source `guest`    → the run JUST completed → land, no banner.
 *   - `complete` + source `existing` → a CONFLICT (the account already finished
 *     this Tournament) → land on the old card WITH the "already finished" banner.
 *   - guest beats existing when both complete in one link (a stale card must
 *     never masquerade as the just-finished run).
 *   - nothing complete → null (mid-progress stays put, AC5).
 *
 * Kept pure (no React, no sessionStorage) so it unit-tests in node-env vitest;
 * AuthProvider is the thin impure shell that stores the banner flag + navigates.
 */
export interface LandingTournament {
  tournamentId: string;
  complete: boolean;
  /** Absent on responses from an OLD linkSessionVote (pre-HF-3.1 deploy lag). */
  source?: "guest" | "existing";
}

export interface Landing {
  tournamentId: string;
  /** true → show the "you already finished this" banner (conflict card). */
  returning: boolean;
}

/**
 * sessionStorage key carrying the conflict tid from AuthProvider (which decides
 * the landing) to the Champion page (which renders the banner). sessionStorage —
 * not a query param — so the banner shows exactly ONCE: the Champion page clears
 * it on read, and a refresh (no re-navigation) finds nothing (HF-3.1 W2).
 */
export const RETURNING_CARD_TID_KEY = "wc48_returning_card_tid";

export function pickLanding(
  tournaments: LandingTournament[] | undefined,
): Landing | null {
  if (!tournaments || tournaments.length === 0) return null;

  const guest = tournaments.find((t) => t.complete && t.source === "guest");
  if (guest) return { tournamentId: guest.tournamentId, returning: false };

  const existing = tournaments.find((t) => t.complete && t.source === "existing");
  if (existing) return { tournamentId: existing.tournamentId, returning: true };

  // Backward-compat: an old response carries no `source`. Land on the first
  // complete entry with NO banner — never invent a "returning" claim we can't
  // substantiate during the deploy-lag window.
  const anyComplete = tournaments.find((t) => t.complete);
  if (anyComplete) return { tournamentId: anyComplete.tournamentId, returning: false };

  return null;
}
