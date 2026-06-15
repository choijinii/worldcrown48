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

const LINK_SESSION_VOTE_TIMEOUT_MS = 5_000;

async function linkPendingVote(googleUid: string): Promise<void> {
  if (typeof window === "undefined") return;
  const pendingAnonUid = sessionStorage.getItem(PENDING_ANON_UID_KEY);
  if (!pendingAnonUid || pendingAnonUid === googleUid) return;

  try {
    const callable = httpsCallable<{ anonUid: string }, { linked: number }>(
      getFunctionsInstance(),
      "linkSessionVote",
      { timeout: LINK_SESSION_VOTE_TIMEOUT_MS },
    );
    await callable({ anonUid: pendingAnonUid });
  } catch (err) {
    // Per acceptance §4-6 #4: keep sessionVoteUsed=true (already true) so
    // the visitor can't double-vote, and surface a toast at a higher
    // layer. Logging here helps the next debugger see *why*.
    if (process.env.NODE_ENV !== "production") {
      console.warn("[Auth] linkSessionVote failed:", err);
    }
  } finally {
    sessionStorage.removeItem(PENDING_ANON_UID_KEY);
  }
}

export function AuthProvider({ children }: { children: ReactNode }): JSX.Element {
  const setUser = useAuthStore((s) => s.setUser);
  const bootRanRef = useRef(false);

  useEffect(() => {
    if (bootRanRef.current) return;
    bootRanRef.current = true;

    const auth = getAuthInstance();

    // (2) Resolve any redirect-completed sign-in BEFORE attaching the
    // listener race. getRedirectResult itself triggers an onAuthStateChanged
    // emission, so the listener below will still see the resulting user.
    void (async () => {
      try {
        await getRedirectResult(auth);
      } catch (err) {
        if (process.env.NODE_ENV !== "production") {
          console.warn("[Auth] getRedirectResult failed:", err);
        }
      }
    })();

    // (1) + (3) — listen for state changes and link any pending guest vote.
    const unsub = onAuthStateChanged(auth, (user) => {
      setUser(user);
      if (user && !user.isAnonymous) {
        void linkPendingVote(user.uid);
      }
    });

    return unsub;
  }, [setUser]);

  return <>{children}</>;
}
