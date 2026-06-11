/**
 * Analytics events — A-0 Launch Pad.
 *
 * Events (per Handoff Brief §8):
 *   waitlist_submit             { email_hash: sha256 }
 *   waitlist_duplicate          { email_hash: sha256 }
 *   featured_tournament_click   { tournament_id: string }
 *   sns_link_click              { platform: string }
 *
 * Implementation is a thin wrapper over Firebase Analytics — falls back to
 * a console no-op if Analytics isn't configured (no measurementId, SSR, etc.),
 * so callers don't have to guard.
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

/** SHA-256 hex digest via Web Crypto. Empty string for non-browser contexts. */
export async function hashEmail(email: string): Promise<string> {
  if (typeof window === "undefined" || !window.crypto?.subtle) return "";
  const data = new TextEncoder().encode(email.trim().toLowerCase());
  const digest = await window.crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
