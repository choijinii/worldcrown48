/**
 * locale — pure locale primitives for the global Language Toggle (ADR-0007).
 *
 * Kept dependency-free (no React, no next/navigation) so it unit-tests in the
 * repo's node-env Vitest, matching the convention of every other module:
 * pure logic in `lib/`, UI verified by Playwright E2E.
 *
 * Extensibility (ADR-0007): adding Español at MVP2 is `SUPPORTED_LOCALES`
 * + `LOCALE_META` edits only — the toggle component reads from these.
 */

import type { Lang } from "./cookieConsent";

/** Locales shipped, in display order. `'es'` joins at MVP2 (A1-i18n completion). */
export const SUPPORTED_LOCALES: readonly Lang[] = ["ko", "en", "es"] as const;

/** Display metadata for each locale. `label` = full name, `abbrev` = trigger glyph text. */
export const LOCALE_META: Record<Lang, { label: string; abbrev: string }> = {
  ko: { label: "한국어", abbrev: "KO" },
  en: { label: "English", abbrev: "EN" },
  es: { label: "Español", abbrev: "ES" },
};

/** Type guard for an unknown `?lang=` value (edge case: `?lang=xx` → falls back to default). */
export function isLang(value: unknown): value is Lang {
  return value === "ko" || value === "en" || value === "es";
}

/**
 * Return `href` with its `?lang=` query set to `lang`, replacing any existing
 * value and preserving the path, other query params, and the hash.
 *
 * Accepts both absolute and relative (path-only) hrefs.
 */
export function buildLangHref(href: string, lang: Lang): string {
  // A base lets URL parse relative hrefs; we strip it back off afterwards.
  const base = "http://_local_";
  const url = new URL(href, base);
  url.searchParams.set("lang", lang);
  const out = url.toString();
  return out.startsWith(base) ? out.slice(base.length) : out;
}
