/**
 * Featured-tournament view resolution (A-0 Launch Pad · M2).
 *
 * FeaturedTournament renders whatever single doc matches
 * `tournaments where featured==true`. That doc can be authored by ANY domain
 * (the Lab, the A-1 seed, …) so it carries the CANONICAL Tournament schema
 * (lib/types/tournament.ts): `tournamentDeadline` + `totalContestants`.
 *
 * Hotfix-1: the component previously read the legacy names
 * `closesAt`/`contestantsCount` and called `closesAt.toDate()` unguarded — a
 * canonical featured doc (no `closesAt`) crashed /launch with
 * "Cannot read properties of undefined (reading 'toDate')". This resolver reads
 * the canonical fields (legacy names as fallback) and never returns an unsafe
 * closesAt, so the render can null-guard the "Closes …" segment.
 */

import type { LocalizedText } from "@/lib/types/tournament";

/** A Firestore Timestamp shape — only `.toDate()` is used. */
export interface TimestampLike {
  toDate: () => Date;
}

export interface FeaturedView {
  id: string;
  title: string;
  /** B-2.1: additive 3-language title, carried through so the hero can localize. */
  titleI18n?: Partial<LocalizedText>;
  contestantsCount: number | null;
  closesAt: TimestampLike | null;
}

function isTimestampLike(v: unknown): v is TimestampLike {
  return (
    typeof v === "object" &&
    v !== null &&
    typeof (v as TimestampLike).toDate === "function"
  );
}

export function resolveFeaturedView(
  id: string,
  data: Record<string, unknown>,
): FeaturedView {
  const rawCloses = data.tournamentDeadline ?? data.closesAt;
  const rawCount = data.totalContestants ?? data.contestantsCount;
  const rawI18n = data.titleI18n;
  return {
    id,
    title: typeof data.title === "string" ? data.title : "",
    titleI18n:
      typeof rawI18n === "object" && rawI18n !== null
        ? (rawI18n as Partial<LocalizedText>)
        : undefined,
    contestantsCount: typeof rawCount === "number" ? rawCount : null,
    closesAt: isTimestampLike(rawCloses) ? rawCloses : null,
  };
}

/** Short "MMM D"; "" for a null/absent deadline (the regression guard). */
export function formatClosesAt(ts: TimestampLike | null | undefined): string {
  if (!ts || typeof ts.toDate !== "function") return "";
  return ts.toDate().toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
