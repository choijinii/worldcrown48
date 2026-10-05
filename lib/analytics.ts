/**
 * Analytics events — A-0 Launch Pad + E-1 Policy Hub.
 *
 * Events (per Handoff Brief §8):
 *   waitlist_submit             { email_hash: sha256 }
 *   waitlist_duplicate          { email_hash: sha256 }
 *   featured_tournament_click   { tournament_id: string }
 *   sns_link_click              { platform: string }
 *
 *   E-1 events:
 *   cookie_banner_view          { variant: 'first' | 'reopened' }
 *   cookie_accept_all           { categories: 'all' }
 *   cookie_reject               { categories: 'essential_only' }
 *   cookie_customize_open       { }
 *   cookie_save                 { functional, analytics, marketing }
 *   cookie_lang_switch          { from, to, surface }
 *   policy_view                 { type, lang }
 *   policy_section_view         { section_id }
 *   policy_report_link_click    { source }
 *
 * Implementation is a thin wrapper over Firebase Analytics — falls back to
 * a console no-op if Analytics isn't configured (no measurementId, SSR, etc.),
 * so callers don't have to guard.
 *
 * Consent gate — COOKIE-1 (R8 · R9 · 대표 2026-10-05 "통계는 하나의 문으로"):
 *   EVERY event — launch pad, pitch, crown, admin and cookie_* alike — passes
 *   the analytics-consent gate inside track(). Before analytics consent we do
 *   not even call getAnalytics(), so no GA cookie (_ga…) is set (R2).
 *   There is no bypass: the legal record of consent is the Firestore
 *   `cookieConsents` doc, not an analytics event. (The old rule "cookie_*
 *   events fire without consent" is retired.)
 *   Withdrawing consent turns GA collection off (setAnalyticsCollectionEnabled).
 */

import {
  isSupported,
  getAnalytics,
  logEvent,
  setAnalyticsCollectionEnabled,
} from "firebase/analytics";
import { getFirebaseApp } from "./firebase";

type EventParams = Record<string, string | number | boolean>;

let analyticsReady: Promise<ReturnType<typeof getAnalytics> | null> | null = null;

function ensureAnalytics() {
  if (typeof window === "undefined") return Promise.resolve(null);
  if (analyticsReady) return analyticsReady;

  analyticsReady = isSupported()
    .then((ok) => {
      if (!ok) return null;
      if (!process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID) return null;
      try {
        return getAnalytics(getFirebaseApp());
      } catch {
        return null;
      }
    })
    .catch(() => null);
  return analyticsReady;
}

/**
 * Analytics consent — set synchronously by CookieConsentProvider the moment a
 * consent decision is applied (saved, or restored from the Firestore record).
 * A plain module value, not React state, so an event fired right after a save
 * sees the new decision in the same tick (COOKIE-1 Phase E ordering).
 */
let analyticsConsent = false;

export function setAnalyticsConsent(granted: boolean): void {
  analyticsConsent = granted;
  // Only flip the collection switch if GA was already woken — never wake it
  // just to say "off" (R9: no getAnalytics() before consent).
  if (analyticsReady) {
    void analyticsReady.then((a) => {
      if (a) setAnalyticsCollectionEnabled(a, granted);
    });
  }
}

/**
 * Send an analytics event — only with analytics consent (R9). Callers do not
 * need to guard; without consent this is a no-op and GA is never initialised.
 */
export async function track(event: string, params: EventParams = {}): Promise<void> {
  if (!analyticsConsent) return;
  const a = await ensureAnalytics();
  // Consent may have been withdrawn while GA was loading.
  if (!a || !analyticsConsent) return;
  logEvent(a, event, params);
}

/** Same gate as track() — kept so existing call sites read unchanged. */
export const trackWithConsent = track;

/** SHA-256 hex digest via Web Crypto. Empty string for non-browser contexts. */
export async function hashEmail(email: string): Promise<string> {
  if (typeof window === "undefined" || !window.crypto?.subtle) return "";
  const data = new TextEncoder().encode(email.trim().toLowerCase());
  const digest = await window.crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
