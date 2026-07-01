/**
 * formatKpi — small pure helpers for the dashboard cards/alerts (handoff §4.2).
 *
 * i18n-clean: relativeAge returns a {unit,value} the component localizes, never
 * a baked English string. isStale drives the "STALE" badge (§4.2 — 90s with no
 * fresh response). Kept pure → node-env vitest.
 */
import type { Lang } from "@/lib/cookieConsent";
import type { DeltaDir } from "./types";

const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

/** Default: cards go stale 90s after the last successful fetch (handoff §3). */
export const DEFAULT_STALE_AFTER_MS = 90_000;

/**
 * True once `now` is more than `staleAfterMs` past the last OK fetch. A null
 * `lastOkMs` (never loaded yet) is NOT stale — it's still loading.
 */
export function isStale(
  lastOkMs: number | null,
  now: number,
  staleAfterMs: number = DEFAULT_STALE_AFTER_MS,
): boolean {
  if (lastOkMs === null) return false;
  return now - lastOkMs > staleAfterMs;
}

export type AgeUnit = "now" | "minute" | "hour" | "day";

export interface RelativeAge {
  unit: AgeUnit;
  value: number;
}

/** Coarse "x ago" bucket the alert key localizes (§4.4 elapsed time). */
export function relativeAge(fromMs: number, now: number): RelativeAge {
  const diff = Math.max(0, now - fromMs);
  if (diff < MIN) return { unit: "now", value: 0 };
  if (diff < HOUR) return { unit: "minute", value: Math.floor(diff / MIN) };
  if (diff < DAY) return { unit: "hour", value: Math.floor(diff / HOUR) };
  return { unit: "day", value: Math.floor(diff / DAY) };
}

/** Arrow glyph for a delta direction (▲ good · ▼ bad · ▬ flat). */
export function deltaArrow(dir: DeltaDir): string {
  return dir === "up" ? "▲" : dir === "down" ? "▼" : "▬";
}

/** Locale-aware integer formatting shared by the cards + chart stats. */
export function formatNumber(value: number, lang: Lang): string {
  return value.toLocaleString(lang === "ko" ? "ko-KR" : "en-US");
}
