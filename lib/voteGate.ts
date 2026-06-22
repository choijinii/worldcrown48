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
import type { User } from "firebase/auth";
import { getDb } from "./firebase";
import { useAuthStore } from "./authStore";
import { getTodayKST } from "./kst";

export type VoteGateResult =
  | { status: "allowed" }
  | { status: "login_required"; reason: "vote" | "share" }
  | { status: "daily_limit_reached" };

export const DAILY_LIMIT = 5;

/**
 * Pure gate decision — exported separately so the three-branch logic can
 * be unit-tested without React or Firestore. The hook below is a thin
 * wrapper that supplies `user`, `sessionVoteUsed`, and the Firestore
 * count.
 */
export function decideVoteGate(args: {
  user: User | null;
  sessionVoteUsed: boolean;
  todayCount: number;
  dailyLimit?: number;
}): VoteGateResult {
  const { user, sessionVoteUsed, todayCount, dailyLimit = DAILY_LIMIT } = args;
  if (!user) {
    if (!sessionVoteUsed) return { status: "allowed" };
    return { status: "login_required", reason: "vote" };
  }
  if (todayCount >= dailyLimit) return { status: "daily_limit_reached" };
  return { status: "allowed" };
}

export async function getTodayVoteCount(
  userId: string,
  tournamentId: string,
): Promise<number> {
  const q = query(
    collection(getDb(), "votes"),
    where("userId", "==", userId),
    where("tournamentId", "==", tournamentId),
    where("date", "==", getTodayKST()),
  );
  // Retry on the transient "[code=unavailable] Could not reach Cloud Firestore
  // backend" — a single dropped connection here would otherwise throw out of
  // checkCanVote and silently skip the vote gate.
  for (let attempt = 0; ; attempt++) {
    try {
      return (await getDocs(q)).size;
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
      // their decision doesn't depend on `todayCount`.
      if (!user) {
        return decideVoteGate({ user: null, sessionVoteUsed, todayCount: 0 });
      }
      const todayCount = await getTodayVoteCount(user.uid, tournamentId);
      return decideVoteGate({ user, sessionVoteUsed, todayCount });
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
