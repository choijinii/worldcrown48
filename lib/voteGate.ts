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
 * Daily limit: 5 votes / Tournament / KST day. The KST boundary is what
 * makes `getTodayVoteCount` correct — see lib/kst.
 */
import { useCallback } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { getDb } from "./firebase";
import { useAuthStore } from "./authStore";
import { getTodayKST } from "./kst";

export type VoteGateResult =
  | { status: "allowed" }
  | { status: "login_required"; reason: "vote" | "share" }
  | { status: "daily_limit_reached" };

const DAILY_LIMIT = 5;

export async function getTodayVoteCount(
  userId: string,
  tournamentId: string,
): Promise<number> {
  const snapshot = await getDocs(
    query(
      collection(getDb(), "votes"),
      where("userId", "==", userId),
      where("tournamentId", "==", tournamentId),
      where("date", "==", getTodayKST()),
    ),
  );
  return snapshot.size;
}

export function useVoteGate() {
  const user = useAuthStore((s) => s.user);
  const sessionVoteUsed = useAuthStore((s) => s.sessionVoteUsed);
  const markSessionVoteUsed = useAuthStore((s) => s.markSessionVoteUsed);

  const checkCanVote = useCallback(
    async (tournamentId: string): Promise<VoteGateResult> => {
      // Unauthenticated visitor — first vote is allowed (the "taster"),
      // second hits the login modal.
      if (!user) {
        if (!sessionVoteUsed) return { status: "allowed" };
        return { status: "login_required", reason: "vote" };
      }

      const count = await getTodayVoteCount(user.uid, tournamentId);
      if (count >= DAILY_LIMIT) return { status: "daily_limit_reached" };

      return { status: "allowed" };
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
