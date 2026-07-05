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
 * that supplies `user`, `sessionVoteUsed`, and the participation snapshot.
 */
export function decideVoteGate(args: {
  user: User | null;
  sessionVoteUsed: boolean;
  participatedThisTournament: boolean;
  participationCount: number;
  limit?: number;
}): VoteGateResult {
  const {
    user,
    sessionVoteUsed,
    participatedThisTournament,
    participationCount,
    limit = DAILY_PARTICIPATION_LIMIT,
  } = args;
  if (!user) {
    if (!sessionVoteUsed) return { status: "allowed" };
    return { status: "login_required", reason: "vote" };
  }
  // Already joined this Tournament today → unlimited within it.
  if (participatedThisTournament) return { status: "allowed" };
  // A new Tournament today, but the daily participation quota is exhausted.
  if (participationCount >= limit) return { status: "daily_limit_reached" };
  return { status: "allowed" };
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
  const sessionVoteUsed = useAuthStore((s) => s.sessionVoteUsed);
  const markSessionVoteUsed = useAuthStore((s) => s.markSessionVoteUsed);

  const checkCanVote = useCallback(
    async (tournamentId: string): Promise<VoteGateResult> => {
      // Skip the Firestore round-trip for unauthenticated visitors —
      // their decision doesn't depend on the participation snapshot.
      if (!user) {
        return decideVoteGate({
          user: null,
          sessionVoteUsed,
          participatedThisTournament: false,
          participationCount: 0,
        });
      }
      const { participatedTournamentIds } = await getDailyParticipation(user.uid);
      return decideVoteGate({
        user,
        sessionVoteUsed,
        participatedThisTournament: participatedTournamentIds.includes(tournamentId),
        participationCount: participatedTournamentIds.length,
      });
    },
    [user, sessionVoteUsed],
  );

  const onVoteSuccess = useCallback(() => {
    if (!user) markSessionVoteUsed();
  }, [user, markSessionVoteUsed]);

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
