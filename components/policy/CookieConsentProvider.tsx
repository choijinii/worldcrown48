/**
 * CookieConsentProvider — top-level state for Domain 5 consent surfaces.
 *
 * Responsibilities (handoff §3 / §9):
 *   - Look up an EXISTING visitor uid on boot — never create one there.
 *     ANON-1 (2026-10-04 대표 결정 · 제안 1): 익명 계정은 동의 버튼을 눌러 저장하는
 *     순간에만 만든다. 첫 화면 판단은 `planConsentBoot` (lib/cookieConsentBoot.ts).
 *   - Decide whether to show the banner on boot:
 *       1. wc48_consent breadcrumb cookie present + unexpired  → hide
 *       2. cookieConsents/{uid} Firestore doc unexpired         → hide
 *       3. otherwise                                            → show
 *   - Expose actions for the banner (accept / reject / customize)
 *     and modal (save with preferences)
 *   - Expose a `reopen()` action for the footer link
 *
 * State machine (banner):
 *   boot → resolving → (hidden | visible)
 *   visible → accept/reject → saving → saved → hidden
 *   visible → customize → modal opens
 *   any → reopen → visible
 *
 * The provider intentionally does not own the modal open/closed state —
 * that lives in this provider too, but is a separate flag so the modal
 * can be opened without the banner being visible (footer reopen path).
 *
 * Wrap once in app/layout.tsx. All policy surfaces below it call useCookieConsent().
 */

"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { httpsCallable } from "firebase/functions";
import { useI18n } from "@/lib/i18n";
import {
  ACCEPT_ALL_PREFERENCES,
  MODAL_DEFAULT_PREFERENCES,
  REJECT_ALL_PREFERENCES,
  clearConsentBreadcrumbCookie,
  loadConsent,
  readConsentBreadcrumbCookie,
  saveConsent,
  type ConsentPreferences,
  type CookieConsentDoc,
} from "@/lib/cookieConsent";
import {
  ensureAnonymousUid,
  getExistingUser,
  getFunctionsInstance,
} from "@/lib/firebase";
import { runConsentBoot } from "@/lib/cookieConsentBoot";
import { setAnalyticsConsent, track } from "@/lib/analytics";
import {
  commitConsentDecision,
  trackCustomizeOpen,
  type ConsentDecision,
} from "@/lib/policy/consentEvents";

// ── Public API ────────────────────────────────────────────────────────

export type BannerState = "resolving" | "visible" | "hidden";
export type ModalState = "closed" | "open" | "saving" | "saved";

export interface CookieConsentContextValue {
  bannerState: BannerState;
  /** The fan reopened the bar from the footer (not the automatic first bar). */
  bannerReopened: boolean;
  modalState: ModalState;
  preferences: ConsentPreferences;
  /** The record currently persisted in Firestore, or null if none. */
  savedRecord: CookieConsentDoc | null;
  /** Last-saved time, displayed in the modal "valid 12 months" footer. */
  lastSavedAt: Date | null;
  /** Analytics consent actually applied (saved this session or restored). */
  analyticsGranted: boolean;

  // Banner actions
  acceptAll: () => Promise<void>;
  rejectAll: () => Promise<void>;
  openModal: () => void;

  // Modal actions
  closeModal: () => void;
  /** Save the modal's current state to Firestore. */
  savePreferences: (next: ConsentPreferences) => Promise<void>;

  /** Footer "Reopen cookie preferences" — clears cookie + shows banner. */
  reopen: () => void;
}

const CookieConsentContext = createContext<CookieConsentContextValue | null>(null);

// ── Cloud Function callable ───────────────────────────────────────────

/**
 * hashIp — server-side SHA-256 of the visitor IP.
 *
 * The plaintext IP must never reach the client; the function reads
 * `context.rawRequest.ip` and returns only the hex digest.
 *
 * Failure modes — ALL fall back to an empty ipHash so the consent save
 * proceeds (the IP hash is for fraud-pattern detection, not consent
 * itself; the record is legally valid without it — handoff §9 trap 8):
 *   - Cloud Function not yet deployed (Cloud Build perms propagating
 *     after Blaze upgrade — can take 30 min ~ a few hours)
 *   - Cloud Function rate-limited the caller (resource-exhausted)
 *   - Network / CORS error
 *   - Function cold-start exceeding our short timeout
 *
 * We override the SDK's 70 s default with a 3 s timeout. During the
 * post-upgrade permission delay the function may simply not respond;
 * waiting 70 s for the consent save to complete would be terrible UX.
 * 3 s is enough for a warm callable round-trip (typically <300 ms) and
 * an acceptable wait when degrading to the fallback.
 */
const HASH_IP_TIMEOUT_MS = 3_000;

async function fetchIpHash(): Promise<string> {
  try {
    const callable = httpsCallable<unknown, { ipHash: string }>(
      getFunctionsInstance(),
      "hashIp",
      { timeout: HASH_IP_TIMEOUT_MS },
    );
    const res = await callable({});
    return res.data?.ipHash ?? "";
  } catch (err) {
    // Log but don't throw — fraud-detection is secondary to recording consent.
    if (process.env.NODE_ENV !== "production") {
      console.warn("[CookieConsent] hashIp callable failed (using empty fallback):", err);
    }
    return "";
  }
}

// ── Provider ──────────────────────────────────────────────────────────

export function CookieConsentProvider({
  children,
}: {
  children: ReactNode;
}): JSX.Element {
  const { lang } = useI18n();

  const [bannerState, setBannerState] = useState<BannerState>("resolving");
  const [bannerReopened, setBannerReopened] = useState(false);
  const [modalState, setModalState] = useState<ModalState>("closed");
  const [preferences, setPreferences] = useState<ConsentPreferences>(
    MODAL_DEFAULT_PREFERENCES,
  );
  const [savedRecord, setSavedRecord] = useState<CookieConsentDoc | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [analyticsGranted, setAnalyticsGranted] = useState(false);

  // Track the uid; refresh on auth state change. Refs avoid re-renders.
  const uidRef = useRef<string | null>(null);

  // ── Boot: breadcrumb cookie → existing user → Firestore record → set state ──
  // The order lives in runConsentBoot (lib/cookieConsentBoot.ts, unit-tested).
  // COOKIE-1 F-1: the breadcrumb hides the banner at once, then an EXISTING
  // user's record restores the categories (analytics consent included). Never
  // sign in anonymously here (ANON-1 · D-41) — getExistingUser only looks.
  // No "ran once" ref: under StrictMode the first run is cancelled and the
  // second one must be allowed to finish (a ref guard left the dev banner
  // stuck in "resolving" forever).
  useEffect(() => {
    let cancelled = false;
    const now = new Date();

    void runConsentBoot(
      {
        cookieSavedAt: readConsentBreadcrumbCookie(now),
        getExistingUid: async () => {
          try {
            const user = await getExistingUser();
            const uid = user?.uid ?? null;
            if (!cancelled) uidRef.current = uid;
            return uid;
          } catch (err) {
            if (process.env.NODE_ENV !== "production") {
              console.warn("[CookieConsent] auth state lookup failed:", err);
            }
            return null;
          }
        },
        loadConsent: async (uid) => {
          try {
            return await loadConsent(uid, now);
          } catch (err) {
            // Firestore error is logged; treated as no record.
            if (process.env.NODE_ENV !== "production") {
              console.warn("[CookieConsent] loadConsent failed:", err);
            }
            return null;
          }
        },
      },
      {
        hideBanner: (savedAt) => {
          if (cancelled) return;
          if (savedAt) setLastSavedAt(savedAt);
          setBannerState("hidden");
        },
        showBanner: () => {
          if (cancelled) return;
          setBannerState("visible");
        },
        applyRecord: (record: CookieConsentDoc) => {
          if (cancelled) return;
          // Analytics consent first, synchronously — the gate in lib/analytics.
          setAnalyticsConsent(record.analytics);
          setAnalyticsGranted(record.analytics);
          setSavedRecord(record);
          setLastSavedAt(record.timestamp.toDate());
          setPreferences({
            essential: true,
            functional: record.functional,
            analytics: record.analytics,
            marketing: record.marketing,
          });
        },
      },
    );

    return () => {
      cancelled = true;
    };
  }, []);

  // ── Persist helper used by all three save paths ──
  const persistAndHide = useCallback(
    async (
      next: ConsentPreferences,
      source: "banner" | "modal",
      decision: ConsentDecision,
    ) => {
      // Order lives in commitConsentDecision (lib/policy/consentEvents.ts,
      // unit-tested): a withdrawal of analytics is applied at once — even if
      // the save fails or no uid is available (review I-2 · R2); a grant is
      // applied only after the record is saved, then the cookie_* event is
      // sent under that consent (F-3 — "필수만" therefore never sends).
      const applyAnalyticsConsent = (granted: boolean) => {
        setAnalyticsConsent(granted);
        setAnalyticsGranted(granted);
      };
      const savedAt = new Date();
      try {
        const { saved } = await commitConsentDecision(decision, next, {
          // ANON-1: this is the moment an anonymous account may be created — the
          // visitor pressed a consent button. ensureAnonymousUid() returns the current
          // user if there is one (signed-in or an earlier anonymous account), so a
          // visitor who signed in after boot is saved under their real uid.
          resolveUid: async () => {
            try {
              const user = await ensureAnonymousUid();
              uidRef.current = user?.uid ?? null;
              return uidRef.current;
            } catch (err) {
              if (process.env.NODE_ENV !== "production") {
                console.warn("[CookieConsent] anonymous auth on save failed:", err);
              }
              return null;
            }
          },
          save: async (uid) => {
            if (source === "modal") setModalState("saving");
            const ipHash = await fetchIpHash();
            await saveConsent({ uid, preferences: next, ipHash, lang, savedAt });
          },
          applyAnalyticsConsent,
          track,
        });
        setPreferences(next);
        if (saved) setLastSavedAt(savedAt);
        // Auth never resolved → nothing recorded, but hide the UI so the user
        // isn't stuck. The save will be retried on next visit.
        if (source === "modal") setModalState("saved");
        // Banner hides on every save path — the modal stays open with
        // "✓ Saved" until the user closes it.
        setBannerState("hidden");
      } catch (err) {
        if (process.env.NODE_ENV !== "production") {
          console.warn("[CookieConsent] saveConsent failed:", err);
        }
        if (source === "modal") setModalState("open"); // back to editable
        throw err;
      }
    },
    [lang],
  );

  // ── Banner actions ──
  const acceptAll = useCallback(
    () => persistAndHide(ACCEPT_ALL_PREFERENCES, "banner", "accept_all"),
    [persistAndHide],
  );

  const rejectAll = useCallback(
    () => persistAndHide(REJECT_ALL_PREFERENCES, "banner", "reject"),
    [persistAndHide],
  );

  const openModal = useCallback(() => {
    setModalState("open");
    // Recorded only for a fan who already granted analytics (the gate decides).
    void trackCustomizeOpen(track);
  }, []);

  // ── Modal actions ──
  const closeModal = useCallback(() => {
    setModalState("closed");
  }, []);

  const savePreferences = useCallback(
    (next: ConsentPreferences) => persistAndHide(next, "modal", "save"),
    [persistAndHide],
  );

  // ── Footer reopen ──
  const reopen = useCallback(() => {
    clearConsentBreadcrumbCookie();
    setBannerReopened(true);
    setBannerState("visible");
    setModalState("closed");
  }, []);

  const value = useMemo<CookieConsentContextValue>(
    () => ({
      bannerState,
      bannerReopened,
      modalState,
      preferences,
      savedRecord,
      lastSavedAt,
      analyticsGranted,
      acceptAll,
      rejectAll,
      openModal,
      closeModal,
      savePreferences,
      reopen,
    }),
    [
      bannerState,
      bannerReopened,
      modalState,
      preferences,
      savedRecord,
      lastSavedAt,
      analyticsGranted,
      acceptAll,
      rejectAll,
      openModal,
      closeModal,
      savePreferences,
      reopen,
    ],
  );

  return (
    <CookieConsentContext.Provider value={value}>
      {children}
    </CookieConsentContext.Provider>
  );
}

/**
 * Read the consent context. Throws if used outside the provider, because
 * silently falling back to defaults would mask wiring bugs and leave the
 * banner permanently hidden in violation of the GDPR obligation. Surfaces
 * that need an opt-out (e.g. a marketing-only page that doesn't render
 * the banner) should still wrap with the provider.
 */
export function useCookieConsent(): CookieConsentContextValue {
  const ctx = useContext(CookieConsentContext);
  if (!ctx) {
    throw new Error(
      "useCookieConsent must be used inside <CookieConsentProvider>",
    );
  }
  return ctx;
}

/**
 * Read-only flag: did the user grant analytics consent? Used by
 * lib/analytics.ts to gate event emission. Exported separately so the
 * analytics module never has to call useContext.
 *
 * SSR-safe: returns false until the boot resolves.
 */
export function useAnalyticsConsent(): boolean {
  const ctx = useContext(CookieConsentContext);
  if (!ctx) return false;
  // Only the consent actually applied (saved or restored) counts. The default
  // ConsentPreferences object has analytics=true, but that's the modal's
  // *initial* state — not consent.
  return ctx.analyticsGranted;
}
