/**
 * Auth state — Zustand store.
 *
 * Holds the current Firebase user + a "the visitor already used their one
 * pre-signin vote this session" flag. The actual `onAuthStateChanged`
 * subscription lives in components/auth/AuthProvider so this module stays
 * SSR-safe (Zustand stores are evaluated at import time).
 *
 * Sign-in flow (handoff §9 traps 1 and 7):
 *   - Persistence is set to browserLocalPersistence BEFORE the popup call —
 *     otherwise the session doesn't survive a tab close.
 *   - We try popup first (desktop). On `popup-blocked` /
 *     `operation-not-supported-in-this-environment` (iOS Safari) we fall
 *     back to a full-page redirect. `getRedirectResult` is read once by
 *     AuthProvider on next load.
 *
 * Guest link trigger (HF-3 W5): when an anonymous visitor signs in, we always
 * stash their anon uid in PENDING_ANON_UID_KEY so AuthProvider can call
 * linkSessionVote — gated on `currentUser.isAnonymous` ALONE, not a
 * "voted this session" flag. If the guest cast zero votes, linkSessionVote is a
 * safe no-op (linked 0, tournaments []), so unconditionally arming the link is
 * correct and removes the sessionVoteUsed flag that HF-3 replaced.
 */
import { create } from "zustand";
import {
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  signOut as firebaseSignOut,
  type User,
} from "firebase/auth";
import { ensureAuthReady, getAuthInstance } from "./firebase";

/**
 * sessionStorage key for the pre-signin anonymous uid.
 *
 * Handoff §5 DON'T forbids *localStorage* for auth/session markers. This is
 * sessionStorage — a per-tab, cleared-on-tab-close store that survives the
 * one redirect round-trip we care about (popup-blocked → signInWithRedirect
 * → return to the same tab). We set the key just before invoking the auth
 * call and AuthProvider clears it the moment the link callable resolves
 * (success OR failure). It is NOT used as a persistent auth-state cache.
 */
export const PENDING_ANON_UID_KEY = "wc48_pending_anon_uid";

/**
 * 계측 소킥 A (2026-08-30): guest_signin_convert의 trigger_point 파라미터.
 * "어느 화면에서 로그인을 눌렀는지"를 signInWithGoogle 호출 시점에 함께
 * sessionStorage에 적어두고, AuthProvider의 linkPendingVote가 성공한 뒤
 * 그대로 읽어 이벤트에 실어 보낸다 (EVENT_SPEC.md §6).
 */
export type SignInTriggerPoint = "card_modal" | "quota_limit" | "header" | "other";
export const PENDING_TRIGGER_POINT_KEY = "wc48_pending_trigger_point";

interface AuthState {
  user: User | null;
  loading: boolean;

  // Called by AuthProvider on every onAuthStateChanged tick.
  setUser: (user: User | null) => void;
  signInWithGoogle: (triggerPoint?: SignInTriggerPoint) => Promise<void>;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: true,

  setUser: (user) => set({ user, loading: false }),

  signInWithGoogle: async (triggerPoint: SignInTriggerPoint = "other") => {
    const auth = getAuthInstance();
    // Handoff §9 trap 7 — persistence is set inside getAuthInstance() once
    // and cached as a promise; await it here so the popup call is gated on
    // the local-persistence assignment having landed.
    await ensureAuthReady();

    // Whenever an anonymous visitor signs in, remember the anon uid so
    // AuthProvider can call linkSessionVote(anonUid → googleUid) the moment
    // onAuthStateChanged fires — migrating the whole Guest Run (votes +
    // bracket_seeds + roundProgress + Crown Card). Armed on isAnonymous ALONE
    // (HF-3 W5): a zero-vote guest just makes linkSessionVote a no-op. This
    // unifies the popup and redirect paths: the redirect-return reload keeps the
    // anon uid because sessionStorage survives the navigation within the tab.
    if (typeof window !== "undefined" && auth.currentUser?.isAnonymous) {
      sessionStorage.setItem(PENDING_ANON_UID_KEY, auth.currentUser.uid);
      sessionStorage.setItem(PENDING_TRIGGER_POINT_KEY, triggerPoint);
    }

    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (err) {
      const code = (err as { code?: string }).code;
      // Popup couldn't open at all — fall back to redirect. The page
      // navigates away here; resolution happens in AuthProvider via
      // getRedirectResult on the next mount.
      if (
        code === "auth/popup-blocked" ||
        code === "auth/operation-not-supported-in-this-environment"
      ) {
        await signInWithRedirect(auth, provider);
        return;
      }
      // Other failure — clean up the marker so a later sign-in attempt by
      // a different (possibly non-anon) visitor doesn't accidentally link.
      if (typeof window !== "undefined") {
        sessionStorage.removeItem(PENDING_ANON_UID_KEY);
        sessionStorage.removeItem(PENDING_TRIGGER_POINT_KEY);
      }
      // Popup-closed / cancelled / network — surface to caller so the
      // LoginModal can show a "try again" toast.
      throw err;
    }
  },

  signOut: async () => {
    const auth = getAuthInstance();
    await firebaseSignOut(auth);
    set({ user: null });
  },
}));
