/**
 * AuthProvider — wires Firebase Auth into the Zustand authStore.
 *
 * Mounted once near the top of RootLayout (inside CookieConsentProvider so
 * the anonymous uid the cookie banner depends on is already resolved when
 * sign-in happens). The provider does three jobs:
 *
 *   1. Subscribe to `onAuthStateChanged` and push the User into authStore.
 *   2. On mount, call `getRedirectResult` once — this is what completes the
 *      iOS Safari / popup-blocked fallback (handoff §9 trap 1).
 *   3. When a non-anonymous user arrives AND sessionStorage has a pending
 *      anon uid, call `linkSessionVote` so the visitor's one guest vote is
 *      attributed to their new account before the LoginModal re-tries it.
 *
 * Render: returns children unchanged. It's a side-effect provider, not a
 * context provider — authStore is the shared state, accessed via the hook.
 */

"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  getRedirectResult,
  onAuthStateChanged,
} from "firebase/auth";
import { httpsCallable } from "firebase/functions";
import {
  getAuthInstance,
  getFunctionsInstance,
} from "@/lib/firebase";
import { PENDING_ANON_UID_KEY, useAuthStore } from "@/lib/authStore";
import { planAuthBoot } from "@/lib/auth/providerBoot";
import { pickLanding, RETURNING_CARD_TID_KEY, type Landing } from "@/lib/auth/landing";

// HF-3 §확인 필요 4: the transfer grew (votes + bracket_seeds + roundProgress +
// daily_participation), so widen the client timeout to 10s. Crown Card rendering
// stays async — it runs in the onChampionConfirmed trigger AFTER this resolves,
// and the Champion page's "카드 준비 중" state absorbs the lag.
const LINK_SESSION_VOTE_TIMEOUT_MS = 10_000;

interface LinkSessionVoteResult {
  linked: number;
  tournaments?: Array<{ tournamentId: string; complete: boolean; source?: "guest" | "existing" }>;
}

/**
 * Link the guest run to the new uid. Returns the Landing target — the run just
 * completed (W6, no banner) or, failing that, a conflict card (returning:true →
 * banner) — or null to stay on the current screen (AC5, a mid-progress transfer
 * just continues in place). The guest>existing priority lives in pickLanding.
 */
async function linkPendingVote(
  googleUid: string,
): Promise<{ landing: Landing | null }> {
  if (typeof window === "undefined") return { landing: null };
  const pendingAnonUid = sessionStorage.getItem(PENDING_ANON_UID_KEY);
  if (!pendingAnonUid || pendingAnonUid === googleUid) {
    return { landing: null };
  }

  try {
    const callable = httpsCallable<{ anonUid: string }, LinkSessionVoteResult>(
      getFunctionsInstance(),
      "linkSessionVote",
      { timeout: LINK_SESSION_VOTE_TIMEOUT_MS },
    );
    const res = await callable({ anonUid: pendingAnonUid });
    return { landing: pickLanding(res.data.tournaments) };
  } catch (err) {
    // Per acceptance §4-6 #4: the pending key is cleared below so a later
    // sign-in can't mis-link; surface a toast at a higher layer. Logging here
    // helps the next debugger see *why*.
    if (process.env.NODE_ENV !== "production") {
      console.warn("[Auth] linkSessionVote failed:", err);
    }
    return { landing: null };
  } finally {
    sessionStorage.removeItem(PENDING_ANON_UID_KEY);
  }
}

export function AuthProvider({ children }: { children: ReactNode }): JSX.Element {
  const setUser = useAuthStore((s) => s.setUser);
  const router = useRouter();
  // 페이지 로드당 1회인 일회성 호출만 기억한다. 재마운트를 넘어 살아남아야 하므로
  // state가 아니라 ref다 — 그리고 **그것만** 감싼다(providerBoot 머리주석).
  const redirectReadRef = useRef(false);

  useEffect(() => {
    const auth = getAuthInstance();
    const plan = planAuthBoot(redirectReadRef.current);

    // (2) Resolve any redirect-completed sign-in BEFORE attaching the
    // listener race. getRedirectResult itself triggers an onAuthStateChanged
    // emission, so the listener below will still see the resulting user.
    if (plan.readRedirect) {
      redirectReadRef.current = true;
      void (async () => {
        try {
          await getRedirectResult(auth);
        } catch (err) {
          if (process.env.NODE_ENV !== "production") {
            console.warn("[Auth] getRedirectResult failed:", err);
          }
        }
      })();
    }

    // (1) + (3) — listen for state changes and link any pending guest run.
    // plan.subscribe는 언제나 참이다. 이 구독을 ref로 잠그면 StrictMode 재마운트
    // 뒤 리스너가 0개가 되어 앱이 오류 없이 스피너에서 멈춘다 — providerBoot 참조.
    const unsub = onAuthStateChanged(auth, (user) => {
      setUser(user);
      if (user && !user.isAnonymous) {
        void linkPendingVote(user.uid).then(({ landing }) => {
          // W6: a completed Guest Run lands on the shareable Crown Card page;
          // a mid-progress transfer stays put and continues in place (AC5).
          if (!landing) return;
          // A conflict landing (returning) hands the tid to the Champion page so
          // it can raise the "already finished" banner once (HF-3.1 W3).
          if (landing.returning && typeof window !== "undefined") {
            sessionStorage.setItem(RETURNING_CARD_TID_KEY, landing.tournamentId);
          }
          router.push(`/arena/${landing.tournamentId}/champion`);
        });
      }
    });

    return unsub;
  }, [setUser, router]);

  return <>{children}</>;
}
