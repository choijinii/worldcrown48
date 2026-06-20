/**
 * Plan the writes for a single-featured toggle (Domain 2 · The Lab, List #3).
 *
 * Exactly one Tournament may have featured=true at a time — Launch Pad's hero
 * queries `featured == true LIMIT 1` (handoff §9 trap #7). Given the ids that
 * are currently featured and the target the operator clicked, this returns the
 * minimal set of writes to make the target the sole featured Tournament. The
 * caller runs these in a Firestore transaction/batch.
 *
 * Pure + minimal: no write is emitted for documents already in the desired
 * state, so clicking the already-featured Tournament is a no-op.
 */
export interface FeaturedWrite {
  id: string;
  featured: boolean;
}

export function planFeaturedToggle(
  currentFeaturedIds: string[],
  targetId: string,
): FeaturedWrite[] {
  const writes: FeaturedWrite[] = [];

  for (const id of currentFeaturedIds) {
    if (id !== targetId) {
      writes.push({ id, featured: false });
    }
  }

  if (!currentFeaturedIds.includes(targetId)) {
    writes.push({ id: targetId, featured: true });
  }

  return writes;
}
