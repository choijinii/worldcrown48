/**
 * A-1 TrendingFeed pure helpers (Domain 1 · The Pitch).
 *
 * The store's onSnapshot subscription is Firestore glue (E2E-covered); these
 * are the framework-free pieces: the query limit, empty detection, the card
 * meta line, and the status-pill variant.
 *
 * Status note: the typed contract (lib/types/tournament.ts) is the single
 * source of truth — TournamentStatus is `active | ended | draft`. There is no
 * "published" (handoff §5 says "published" but the contract — and LANGUAGE.md
 * — use `active`; published → active per 대표 decision 2026-06-29). The Pitch
 * feed shows ONLY `active` tournaments; drafts live in the Host's Lab.
 */

import type { TournamentStatus } from "@/lib/types/tournament";

/** Handoff §5 query limit: `where status == 'active' orderBy createdAt desc limit 12`. */
export const TRENDING_LIMIT = 12;

const closesFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: "Asia/Seoul",
  month: "short",
  day: "numeric",
});

export function isFeedEmpty(tournaments: readonly unknown[]): boolean {
  return tournaments.length === 0;
}

/**
 * Format a deadline as short "MMM D" (wireframe "Closes Jun 20"); "" if unset.
 * Accepts `unknown` because the typed contract stores `tournamentDeadline` as
 * `unknown` (a Firestore Timestamp at runtime); narrowed here.
 */
export function formatCloses(deadline: unknown): string {
  if (!deadline) return "";
  let date: Date | null = null;
  if (deadline instanceof Date) {
    date = deadline;
  } else if (
    typeof deadline === "object" &&
    "toDate" in deadline &&
    typeof (deadline as { toDate: unknown }).toDate === "function"
  ) {
    date = (deadline as { toDate: () => Date }).toDate();
  }
  if (!date) return "";
  return closesFormatter.format(date);
}

/**
 * The card meta line segments. Always leads with "48 Contestants" (every
 * Tournament has exactly 48 — TOTAL_CONTESTANTS); appends "Closes …" when a
 * deadline is set. Never Vote Count / Vote Rate / Round info (handoff §5).
 */
export function cardMeta(t: { tournamentDeadline?: unknown }): string[] {
  const segments = ["48 Contestants"];
  const closes = formatCloses(t.tournamentDeadline);
  if (closes) segments.push(`Closes ${closes}`);
  return segments;
}

/** Which status pill to render: gold for active, muted for everything else. */
export function statusPillVariant(status: TournamentStatus): "active" | "muted" {
  return status === "active" ? "active" : "muted";
}
