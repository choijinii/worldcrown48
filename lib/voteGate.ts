/**
 * Vote and share gates — client-side authorisation for The Arena.
 *
 * `useVoteGate().checkCanVote(tournamentId)` is what the VS Battle view
 * calls before opening a vote: it returns one of three statuses that the
 * caller maps to either "fire the onVote Cloud Function" or "open the
 * LoginModal with the right reason".
 *
 *   - `allowed`              → call onVote
 *   - `login_required`       → open <LoginModal reason={result.reason} />
 *   - `daily_limit_reached`  → open <LoginModal reason="daily_limit" />
 *
 * Step 1 (1-minute rate limit) is NOT checked here. That lives in the
 * onVote Cloud Function — see handoff §9 trap … and the function throws
 * `resource-exhausted`, which the caller surfaces as a cooldown toast.
 *
 * Daily Participation Limit (HF-1): a Voter may JOIN at most 5 NEW Tournaments
 * per KST day; voting inside an already-joined Tournament is unlimited. The
 * gate mirrors the server: one read of `daily_participation/${uid}_${kstDate}`
 * (no votes query, no composite index) yields the joined-Tournament set.
 */
import { useCallback } from "react";
import { doc, getDoc } from "firebase/firestore";
import type { User } from "firebase/auth";
import { getDb } from "./firebase";
import { useAuthStore } from "./authStore";
import { getTodayKST } from "./kst";

export type VoteGateResult =
  | { status: "allowed" }
  | { status: "login_required"; reason: "vote" | "share" }
  | { status: "daily_limit_reached" };

export const DAILY_PARTICIPATION_LIMIT = 5;

/**
 * Pure gate decision — exported separately so the branch logic can be
 * unit-tested without React or Firestore. The hook below is a thin wrapper
 * that supplies `user`/`isAnonymous`, the guest-run snapshot, and the
 * participation snapshot.
 *
 * Guest discriminator is `isAnonymous` (or a null user), NOT `!user`: the site
 * signs visitors in anonymously, so `user` is almost never null. HF-3 fixes the
 * spec pollution where the old `!user` branch never fired for anon uids.
 */
export function decideVoteGate(args: {
  user: User | null;
  isAnonymous: boolean;
  tournamentId: string;
  guestTournamentId: string | null;
  guestCompleted: boolean;
  participatedThisTournament: boolean;
  participationCount: number;
  limit?: number;
}): VoteGateResult {
  const {
    user,
    isAnonymous,
    tournamentId,
    guestTournamentId,
    guestCompleted,
    participatedThisTournament,
    participationCount,
    limit = DAILY_PARTICIPATION_LIMIT,
  } = args;

  // ── Guest Run (HF-3): anonymous uid (or the brief pre-anon null) ──────────
  // One Tournament, run to completion. Signing in migrates the run (W4).
  if (!user || isAnonymous) {
    // Already completed a Guest Run → sign in to keep going anywhere.
    if (guestCompleted) return { status: "login_required", reason: "vote" };
    // Entered one Tournament already and this is a different one → one run only.
    if (guestTournamentId !== null && guestTournamentId !== tournamentId) {
      return { status: "login_required", reason: "vote" };
    }
    // First Tournament, or the same one still in progress → run it.
    return { status: "allowed" };
  }

  // ── Signed-in (non-anonymous): HF-1 Daily Participation Limit (unchanged) ──
  // Already joined this Tournament today → unlimited within it.
  if (participatedThisTournament) return { status: "allowed" };
  // A new Tournament today, but the daily participation quota is exhausted.
  if (participationCount >= limit) return { status: "daily_limit_reached" };
  return { status: "allowed" };
}

/**
 * sessionStorage key for the guest's single Guest Run Tournament (HF-3, W2).
 *
 * §확인 필요 1 (emulator-verified 2026-07-08): the doc-id-prefix read rules on
 * bracket_seeds / roundProgress authorize a `get` but DENY a `list` (the wildcard
 * is null for a list op → `split('_')` throws). So the client cannot self-discover
 * which Tournament an anon uid entered by querying. We instead remember the
 * entered Tournament here — a per-tab, cleared-on-tab-close marker (same class as
 * PENDING_ANON_UID_KEY; NOT localStorage, per D-1 handoff §5 DON'T). This is a UX
 * optimisation for a proactive LoginModal; the onVote server guard (W3) is the
 * authoritative boundary, so a missing/stale marker only costs one round-trip.
 */
export const GUEST_RUN_TID_KEY = "wc48_guest_run_tid";

/** Record the guest's Guest Run Tournament once (their first vote joins it). */
export function markGuestRunTournament(tournamentId: string): void {
  if (typeof window === "undefined") return;
  if (!sessionStorage.getItem(GUEST_RUN_TID_KEY)) {
    sessionStorage.setItem(GUEST_RUN_TID_KEY, tournamentId);
  }
}

/**
 * Guest Run snapshot for the gate (HF-3, W2). `guestTournamentId` comes from the
 * marker above; `guestCompleted` is a DIRECT get of the tournament-in-view's
 * roundProgress (rules-allowed even before the doc exists — HF-1.6). A read error
 * never blocks the gate (returns not-completed) — the server guard still holds.
 */
export async function getGuestRunState(
  uid: string,
  tournamentId: string,
): Promise<{ guestTournamentId: string | null; guestCompleted: boolean }> {
  const guestTournamentId =
    typeof window !== "undefined"
      ? sessionStorage.getItem(GUEST_RUN_TID_KEY)
      : null;
  let guestCompleted = false;
  try {
    const ref = doc(getDb(), "roundProgress", `${uid}_${tournamentId}`);
    const snap = await getDoc(ref);
    guestCompleted = snap.exists() && snap.data().complete === true;
  } catch {
    guestCompleted = false;
  }
  return { guestTournamentId, guestCompleted };
}

/**
 * Reads today's Daily Participation doc (`${userId}_${kstDate}`) and returns
 * the set of Tournaments this Voter has already joined today. A single doc
 * read — cheaper than the old 3-where votes query and needs no index.
 */
export async function getDailyParticipation(
  userId: string,
): Promise<{ participatedTournamentIds: string[] }> {
  const ref = doc(getDb(), "daily_participation", `${userId}_${getTodayKST()}`);
  // Retry on the transient "[code=unavailable] Could not reach Cloud Firestore
  // backend" — a single dropped connection here would otherwise throw out of
  // checkCanVote and silently skip the vote gate.
  for (let attempt = 0; ; attempt++) {
    try {
      const snap = await getDoc(ref);
      const ids = snap.exists()
        ? ((snap.data().tournamentIds as string[] | undefined) ?? [])
        : [];
      return { participatedTournamentIds: ids };
    } catch (e) {
      const code = (e as { code?: string }).code;
      if (attempt < 2 && code === "unavailable") {
        await new Promise((r) => setTimeout(r, 400));
        continue;
      }
      throw e;
    }
  }
}

export function useVoteGate() {
  const user = useAuthStore((s) => s.user);

  const checkCanVote = useCallback(
    async (tournamentId: string): Promise<VoteGateResult> => {
      const isAnonymous = Boolean(user?.isAnonymous);

      // Guest Run path (anonymous, or the brief pre-anon null): read the guest
      // snapshot (marker + current-tournament completion), not participation.
      if (!user || isAnonymous) {
        const { guestTournamentId, guestCompleted } = user
          ? await getGuestRunState(user.uid, tournamentId)
          : { guestTournamentId: null, guestCompleted: false };
        return decideVoteGate({
          user,
          isAnonymous,
          tournamentId,
          guestTournamentId,
          guestCompleted,
          participatedThisTournament: false,
          participationCount: 0,
        });
      }

      // Signed-in path — HF-1 Daily Participation snapshot (single doc read).
      const { participatedTournamentIds } = await getDailyParticipation(user.uid);
      return decideVoteGate({
        user,
        isAnonymous: false,
        tournamentId,
        guestTournamentId: null,
        guestCompleted: false,
        participatedThisTournament: participatedTournamentIds.includes(tournamentId),
        participationCount: participatedTournamentIds.length,
      });
    },
    [user],
  );

  const onVoteSuccess = useCallback(
    (tournamentId: string) => {
      // A guest's first vote joins their one Guest Run — remember it so the gate
      // can proactively block a second Tournament (W2 marker; set-once).
      if (user?.isAnonymous) markGuestRunTournament(tournamentId);
    },
    [user],
  );

  return { checkCanVote, onVoteSuccess };
}

export function useShareGate() {
  const user = useAuthStore((s) => s.user);

  const checkCanShare = useCallback((): VoteGateResult => {
    return user
      ? { status: "allowed" }
      : { status: "login_required", reason: "share" };
  }, [user]);

  return { checkCanShare };
}
