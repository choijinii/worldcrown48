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
 * sessionVoteUsed lifecycle:
 *   - Flipped true by VoteGate after a guest's first vote lands.
 *   - Stays true across the sign-in modal (so the pending vote can be
 *     re-cast by VoteGate against the new uid without double-counting).
 *   - Reset to false on signOut so a returning guest starts fresh.
 */
import { create } from "zustand";
import {
  GoogleAuthProvider,
  browserLocalPersistence,
  setPersistence,
  signInWithPopup,
  signInWithRedirect,
  signOut as firebaseSignOut,
  type User,
} from "firebase/auth";
import { getAuthInstance } from "./firebase";

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

interface AuthState {
  user: User | null;
  loading: boolean;
  sessionVoteUsed: boolean;

  // Called by AuthProvider on every onAuthStateChanged tick.
  setUser: (user: User | null) => void;
  // Called by VoteGate after a guest vote succeeds.
  markSessionVoteUsed: () => void;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  loading: true,
  sessionVoteUsed: false,

  setUser: (user) => set({ user, loading: false }),
  markSessionVoteUsed: () => set({ sessionVoteUsed: true }),

  signInWithGoogle: async () => {
    const auth = getAuthInstance();
    await setPersistence(auth, browserLocalPersistence);

    // If the visitor cast their one guest vote, remember the anon uid so
    // AuthProvider can call linkSessionVote(anonUid → googleUid) the moment
    // onAuthStateChanged fires. This unifies the popup and redirect paths:
    // the redirect-return reload doesn't lose track of which anon uid to
    // link, because sessionStorage survives the navigation within the tab.
    if (
      typeof window !== "undefined" &&
      auth.currentUser?.isAnonymous &&
      get().sessionVoteUsed
    ) {
      sessionStorage.setItem(PENDING_ANON_UID_KEY, auth.currentUser.uid);
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
      }
      // Popup-closed / cancelled / network — surface to caller so the
      // LoginModal can show a "try again" toast.
      throw err;
    }
  },

  signOut: async () => {
    const auth = getAuthInstance();
    await firebaseSignOut(auth);
    set({ user: null, sessionVoteUsed: false });
  },
}));
