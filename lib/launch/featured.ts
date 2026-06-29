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

/** A Firestore Timestamp shape — only `.toDate()` is used. */
export interface TimestampLike {
  toDate: () => Date;
}

export interface FeaturedView {
  id: string;
  title: string;
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
  return {
    id,
    title: typeof data.title === "string" ? data.title : "",
    contestantsCount: typeof rawCount === "number" ? rawCount : null,
    closesAt: isTimestampLike(rawCloses) ? rawCloses : null,
  };
}

/** Short "MMM D"; "" for a null/absent deadline (the regression guard). */
export function formatClosesAt(ts: TimestampLike | null | undefined): string {
  if (!ts || typeof ts.toDate !== "function") return "";
  return ts.toDate().toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
