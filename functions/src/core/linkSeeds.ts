/**
 * linkSeeds — pure seed-transfer planning for linkSessionVote (§8 Edge #1).
 *
 * When a guest signs in, their votes are re-parented from the anon uid to the
 * new uid. The per-Voter bracket seed (bracket_seeds, ADR-0007) must move too:
 * the bracket is a pure function of (contestants, votes, seed) and depends only
 * on the seed VALUE — not the uid — so copying the value to `${newUid}_${tid}`
 * reproduces the identical bracket. Miss this and the new uid mints a fresh seed
 * → the bracket reshuffles → an already-won Contestant reappears downstream →
 * duplicate winners → the round transition breaks.
 *
 * These helpers are pure so the trap is unit-tested without Firestore.
 */

/** A guest bracket seed for one tournament, or null if the guest had none. */
export type AnonSeed = { tournamentId: string; seed: number } | null;

/** A create-once write to perform under the new uid. */
export interface SeedWrite {
  docId: string; // `${newUid}_${tournamentId}`
  seed: number;
}

/** Distinct, non-empty tournamentIds across the guest's re-parented votes. */
export function distinctTournamentIds(
  votes: Array<{ tournamentId?: string }>,
): string[] {
  const seen = new Set<string>();
  for (const v of votes) {
    if (v.tournamentId) seen.add(v.tournamentId);
  }
  return [...seen];
}

/**
 * The seed docs to create under `newUid`, one per tournament the guest actually
 * had a seed for. Anon seeds that are null (guest never entered Arena) are
 * skipped — there is nothing to preserve.
 */
export function planSeedTransfer(
  newUid: string,
  anonSeeds: AnonSeed[],
): SeedWrite[] {
  const writes: SeedWrite[] = [];
  for (const s of anonSeeds) {
    if (!s) continue;
    writes.push({ docId: `${newUid}_${s.tournamentId}`, seed: s.seed });
  }
  return writes;
}
