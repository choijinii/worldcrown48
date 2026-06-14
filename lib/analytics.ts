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
 * Consent gate (handoff §8 trap — circular consent):
 *   The first four events above predate the consent system and are kept
 *   ungated for the launch waitlist. ALL E-1 / future-domain events MUST
 *   call trackWithConsent() which checks the analytics consent flag and
 *   no-ops when the user has not granted it. The cookie_* events are an
 *   intentional exception — they describe the consent transaction itself,
 *   so they fire even without consent (necessary for legal evidence).
 */

import { isSupported, getAnalytics, logEvent } from "firebase/analytics";
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

export async function track(event: string, params: EventParams = {}): Promise<void> {
  const a = await ensureAnalytics();
  if (!a) return;
  logEvent(a, event, params);
}

/**
 * Same as `track()`, but no-ops unless the user has granted analytics
 * consent. Use this for all events introduced after the E-1 Policy Hub
 * landed (handoff §8 circular-consent trap).
 *
 * Exceptions (events that bypass the gate by passing `bypassConsent: true`):
 *   - cookie_* events that describe the consent transaction itself
 *
 * The consent flag is read via a thunk so this module never imports React.
 * The provider wires it up at app boot via setAnalyticsConsentReader().
 */
let analyticsConsentReader: () => boolean = () => false;

export function setAnalyticsConsentReader(reader: () => boolean): void {
  analyticsConsentReader = reader;
}

export async function trackWithConsent(
  event: string,
  params: EventParams = {},
  opts: { bypassConsent?: boolean } = {},
): Promise<void> {
  if (!opts.bypassConsent && !analyticsConsentReader()) return;
  await track(event, params);
}

/** SHA-256 hex digest via Web Crypto. Empty string for non-browser contexts. */
export async function hashEmail(email: string): Promise<string> {
  if (typeof window === "undefined" || !window.crypto?.subtle) return "";
  const data = new TextEncoder().encode(email.trim().toLowerCase());
  const digest = await window.crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
