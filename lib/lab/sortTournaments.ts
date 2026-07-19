/**
 * Sort a host's Tournament list newest-first (Domain 2 · The Lab, TournamentList).
 *
 * Done client-side ON PURPOSE: the list query is `where(hostUid ==)` over an
 * operator's OWN Tournaments (a small, bounded set), so a `orderBy(createdAt)`
 * would only add a composite index the writer must remember to deploy — the exact
 * "index the writer never created" trap. A pure in-memory sort has zero index
 * cost and is node-testable.
 *
 * createdAt is a Firestore Timestamp (toMillis()); rows still pending a
 * serverTimestamp() resolve (createdAt absent) sort last.
 */
function millisOf(createdAt: unknown): number {
  if (createdAt && typeof createdAt === "object") {
    const c = createdAt as { toMillis?: () => number; seconds?: number };
    if (typeof c.toMillis === "function") return c.toMillis();
    if (typeof c.seconds === "number") return c.seconds * 1000;
  }
  return -Infinity; // missing → oldest, sorts last in a desc order
}

export function sortByCreatedAtDesc<T extends { createdAt?: unknown }>(
  rows: T[],
): T[] {
  return [...rows].sort((a, b) => millisOf(b.createdAt) - millisOf(a.createdAt));
}
