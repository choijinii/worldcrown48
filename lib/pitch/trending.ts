/**
 * A-1 TrendingFeed pure helpers (Domain 1 · The Pitch).
 *
 * The store's onSnapshot subscription is Firestore glue (E2E-covered); these
 * are the framework-free pieces: the query limit, empty detection, the
 * "Closes …" date formatter, and the status-pill variant. The card meta line
 * itself is composed in TournamentCard via useT (`pitch.card.contestants` /
 * `pitch.card.closes`) so it localizes.
 *
 * Status note: the typed contract (lib/types/tournament.ts) is the single
 * source of truth — TournamentStatus is `active | ended | draft`. There is no
 * "published" (handoff §5 says "published" but the contract — and LANGUAGE.md
 * — use `active`; published → active per product-owner decision 2026-06-29). The Pitch
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

/** Which status pill to render: gold for active, muted for everything else. */
export function statusPillVariant(status: TournamentStatus): "active" | "muted" {
  return status === "active" ? "active" : "muted";
}
