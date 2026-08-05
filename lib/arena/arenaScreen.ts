/**
 * arenaScreen — which screen /arena/[tournamentId] should render.
 *
 * Pure decision extracted from the page so it can be unit-tested. It replaces
 * an inline guard that conflated three different states:
 *
 *   if (loading && !tournament)                    → "불러오는 중…"
 *   if (error === "not-found" || (!loading && !tournament)) → "찾을 수 없어요"
 *
 * The store starts at `loading:false, tournament:null` and the page's load
 * effect is gated on `if (uid)`, so on the FIRST paint — and for as long as
 * auth takes to resolve — the second branch was true and every Voter was told
 * the Tournament does not exist. Measured on production 2026-08-05:
 * `not-found@282ms → loading@590ms → MATCH@996ms` (verdict §10.1).
 *
 * It also rendered a genuine load failure as "not found", which is a different
 * claim and offers the Voter no way forward.
 */

export type ArenaScreen = "loading" | "not-found" | "load-failed" | "ready";

export interface ArenaScreenInput {
  /** authStore.loading — true until the first onAuthStateChanged tick. */
  authLoading: boolean;
  /** The resolved uid, or null/undefined when there is no signed-in user. */
  uid: string | null | undefined;
  /** voteStore.loading — a load is in flight. */
  loading: boolean;
  /** voteStore.tournament !== null. */
  hasTournament: boolean;
  /** voteStore.error — "not-found" | "load-failed" | null. */
  error: string | null;
}

export function arenaScreenState(input: ArenaScreenInput): ArenaScreen {
  // Auth first: without a resolved uid the load effect cannot even start, so
  // "we don't know yet" must read as loading, never as not-found.
  if (input.authLoading) return "loading";

  // A concrete answer from the server outranks anything else, including a
  // tournament left over from a previous load.
  if (input.error === "not-found") return "not-found";
  if (input.error) return "load-failed";

  // Auth settled with no user at all: the load can never run. Say so instead of
  // spinning forever — the surface offers a retry.
  if (!input.uid) return "load-failed";

  // Already have data — keep showing it through any background refetch.
  if (input.hasTournament) return "ready";

  // Effect not run yet, or in flight. Both are "loading".
  return "loading";
}
