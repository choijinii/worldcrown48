/**
 * Cookie consent — domain layer.
 *
 * Single source of truth for what a consent record looks like, when it
 * expires, and how to save/load it. UI components never touch Firestore
 * directly — they call into this module.
 *
 * Storage:
 *   - Firestore `cookieConsents/{uid}` — per CLAUDE.md/LANGUAGE.md (the
 *     handoff brief writes "cookie_consents" but LANGUAGE.md §6 + the
 *     immutable terminology rule wins → camelCase).
 *   - No localStorage / sessionStorage (handoff §5 DON'T).
 *   - `wc48_consent` cookie name (industry standard, locked by CEO).
 *
 * Time injection:
 *   - All pure helpers accept an explicit `now: Date` so they can be
 *     tested without mocking Date.now(). Production callers pass `new
 *     Date()` at the call site.
 *
 * IP hashing:
 *   - Plaintext IP must never leave the client (handoff §9 trap 8 — GDPR).
 *   - The save path calls the Cloud Function `hashIp` via Callable
 *     Functions; the function returns the SHA-256 hex digest computed
 *     server-side. We store only the hash in `ipHash`.
 */

import {
  Timestamp,
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  type FieldValue,
} from "firebase/firestore";
import { getDb } from "./firebase";

// ── Types ──────────────────────────────────────────────────────────────

/** Four cookie categories per handoff §4. ESSENTIAL is always true. */
export type ConsentCategory =
  | "essential"
  | "functional"
  | "analytics"
  | "marketing";

export interface ConsentPreferences {
  /** Always true — locked by law. Stored explicitly for the audit trail. */
  readonly essential: true;
  functional: boolean;
  analytics: boolean;
  marketing: boolean;
}

export type Lang = "ko" | "en" | "es";

/** Shape persisted under cookieConsents/{uid} per handoff Appendix B. */
export interface CookieConsentDoc {
  uid: string;
  essential: true;
  functional: boolean;
  analytics: boolean;
  marketing: boolean;
  /** serverTimestamp() — when consent was last saved. */
  timestamp: Timestamp;
  /** timestamp + 12 months. UI uses this to know when to re-prompt. */
  expiresAt: Timestamp;
  /** SHA-256 hex of the visitor IP, computed server-side via Cloud Function. */
  ipHash: string;
  /** Locale the user consented in (kept for legal evidence). */
  lang: Lang;
  /** Policy version at consent time. */
  version: string;
}

// ── Constants ──────────────────────────────────────────────────────────

/** Browser cookie name — industry-standard, CEO-locked (handoff §5 DO). */
export const CONSENT_COOKIE_NAME = "wc48_consent";

/** Firestore collection name (LANGUAGE.md §6). */
export const CONSENT_COLLECTION = "cookieConsents";

/** Current policy version — bump when content/*.md frontmatter bumps. */
export const CURRENT_POLICY_VERSION = "1.0";

/** 12 months expressed in milliseconds (365 days, rounding error tolerated). */
export const CONSENT_VALIDITY_MS = 365 * 24 * 60 * 60 * 1000;

/**
 * Reject-all default = essential only. Used when the user clicks "Reject"
 * in the banner.
 */
export const REJECT_ALL_PREFERENCES: ConsentPreferences = Object.freeze({
  essential: true,
  functional: false,
  analytics: false,
  marketing: false,
}) as ConsentPreferences;

/**
 * Accept-all = every category true. Used when the user clicks "Accept all"
 * in the banner.
 */
export const ACCEPT_ALL_PREFERENCES: ConsentPreferences = Object.freeze({
  essential: true,
  functional: true,
  analytics: true,
  marketing: true,
}) as ConsentPreferences;

/**
 * Default modal state per handoff §9 trap 2: lite-spec says marketing is
 * forever false, but the design draft and the CEO say it should be a
 * user-toggleable category that *defaults* to OFF. We follow the handoff —
 * which means the modal starts with functional/analytics ON, marketing OFF.
 */
export const MODAL_DEFAULT_PREFERENCES: ConsentPreferences = Object.freeze({
  essential: true,
  functional: true,
  analytics: true,
  marketing: false,
}) as ConsentPreferences;

// ── Pure helpers (testable without Firebase) ───────────────────────────

/**
 * Returns true if the saved consent is still within its 12-month window.
 * Caller passes the current time explicitly — easier to test.
 *
 * Treats a missing/null record as expired so callers can branch on a
 * single boolean ("show the banner?").
 */
export function isConsentValid(
  doc: Pick<CookieConsentDoc, "expiresAt"> | null | undefined,
  now: Date,
): boolean {
  if (!doc) return false;
  // Firestore Timestamp → Date for the comparison
  const expiresAtMs = doc.expiresAt.toMillis();
  return expiresAtMs > now.getTime();
}

/**
 * Build the expiresAt Timestamp from a save time. Pure — no SDK calls.
 */
export function computeExpiresAt(savedAt: Date): Timestamp {
  return Timestamp.fromMillis(savedAt.getTime() + CONSENT_VALIDITY_MS);
}

/**
 * Sanitize raw modal toggle state into a guaranteed-shape preferences
 * object. Defensive against missing/extra keys at the JS boundary.
 */
export function normalizePreferences(
  raw: Partial<Omit<ConsentPreferences, "essential">>,
): ConsentPreferences {
  return {
    essential: true,
    functional: Boolean(raw.functional ?? false),
    analytics: Boolean(raw.analytics ?? false),
    marketing: Boolean(raw.marketing ?? false),
  };
}

// ── Cookie helpers ─────────────────────────────────────────────────────

/**
 * Write the breadcrumb cookie that lets the banner stay hidden across
 * reloads without a Firestore round-trip. Stores only the version + saved
 * date — full state lives in Firestore.
 *
 * No-ops on the server (typeof document === "undefined").
 */
export function writeConsentBreadcrumbCookie(savedAt: Date): void {
  if (typeof document === "undefined") return;
  const expires = new Date(savedAt.getTime() + CONSENT_VALIDITY_MS).toUTCString();
  const value = `${CURRENT_POLICY_VERSION}.${savedAt.getTime()}`;
  // SameSite=Lax + Secure-when-https. No HttpOnly because we need the
  // browser to read it for the boot decision.
  document.cookie =
    `${CONSENT_COOKIE_NAME}=${value}; expires=${expires}; path=/; SameSite=Lax`;
}

/**
 * Read the breadcrumb cookie if it exists. Returns the saved date or null.
 * Used as the *first* check in the boot path; if present and unexpired we
 * skip Firestore.
 */
export function readConsentBreadcrumbCookie(now: Date): Date | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${CONSENT_COOKIE_NAME}=`));
  if (!match) return null;
  const raw = match.slice(CONSENT_COOKIE_NAME.length + 1);
  const [version, savedAtMs] = raw.split(".");
  if (version !== CURRENT_POLICY_VERSION) return null; // policy bumped → re-prompt
  const ms = Number(savedAtMs);
  if (!Number.isFinite(ms)) return null;
  const savedAt = new Date(ms);
  if (savedAt.getTime() + CONSENT_VALIDITY_MS <= now.getTime()) return null;
  return savedAt;
}

/**
 * Delete the breadcrumb cookie. Used by the "Reopen cookie preferences"
 * footer link so the banner appears again.
 */
export function clearConsentBreadcrumbCookie(): void {
  if (typeof document === "undefined") return;
  document.cookie =
    `${CONSENT_COOKIE_NAME}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax`;
}

// ── Firestore I/O ──────────────────────────────────────────────────────

/**
 * Read the user's existing consent doc (if any). Returns null when:
 *   - the document doesn't exist, OR
 *   - it has expired (caller treats both the same — re-prompt).
 *
 * `now` is injected so callers in a test can drive expiry.
 */
export async function loadConsent(
  uid: string,
  now: Date,
): Promise<CookieConsentDoc | null> {
  if (!uid) return null;
  const snap = await getDoc(doc(getDb(), CONSENT_COLLECTION, uid));
  if (!snap.exists()) return null;
  const data = snap.data() as CookieConsentDoc;
  if (!isConsentValid(data, now)) return null;
  return data;
}

/**
 * Persist a consent decision. Caller has already obtained the IP hash
 * from the Cloud Function — this function is intentionally I/O-only.
 *
 * Firestore's `timestamp` field uses serverTimestamp() so the saved
 * moment is the server's clock, but `expiresAt` is computed from the
 * client-side `savedAt` so we don't need a Cloud Function to set it.
 * The handoff treats 12 months as approximate (±client clock skew), and
 * the rules don't enforce expiresAt = timestamp + 12mo.
 */
export async function saveConsent(args: {
  uid: string;
  preferences: ConsentPreferences;
  ipHash: string;
  lang: Lang;
  savedAt: Date;
}): Promise<void> {
  const { uid, preferences, ipHash, lang, savedAt } = args;
  if (!uid) throw new Error("saveConsent: uid is required");

  const payload: Omit<CookieConsentDoc, "timestamp"> & {
    timestamp: FieldValue;
  } = {
    uid,
    essential: true,
    functional: preferences.functional,
    analytics: preferences.analytics,
    marketing: preferences.marketing,
    timestamp: serverTimestamp(),
    expiresAt: computeExpiresAt(savedAt),
    ipHash,
    lang,
    version: CURRENT_POLICY_VERSION,
  };

  await setDoc(doc(getDb(), CONSENT_COLLECTION, uid), payload);
  writeConsentBreadcrumbCookie(savedAt);
}
