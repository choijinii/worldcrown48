/**
 * bracket_seeds — the per-Voter, per-Tournament random seed (ADR-0007).
 *
 * doc id = `${uid}_${tournamentId}`, shape `{ seed: number, createdAt }`.
 * The seed is created ONCE on first Arena entry and is then immutable
 * (firestore.rules: owner read via doc-id prefix + create-once, no update/
 * delete). It is the third input to the pure bracket (contestants, votes,
 * seed) — making each Voter's pairing random yet refresh-stable, and letting
 * linkSessionVote carry it across a guest→login so the bracket never
 * reshuffles (§8 Edge #1).
 *
 * This is Firestore I/O glue (like voteStore.loadTournament) — exercised by
 * E2E; the determinism it feeds is unit-tested in matches.test.ts.
 */
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
  type Firestore,
} from "firebase/firestore";

export function bracketSeedDocId(uid: string, tournamentId: string): string {
  return `${uid}_${tournamentId}`;
}

/** A fresh unsigned 32-bit seed from the CSPRNG (mulberry32 masks with >>>0). */
export function randomSeed(): number {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return buf[0];
}

/**
 * Read the Voter's seed for this Tournament; create it once if absent. On a
 * two-tab create race the loser's create is rejected (create-once rule) — we
 * swallow it and re-read the winner's seed so both tabs converge on one value.
 */
export async function loadOrCreateBracketSeed(
  db: Firestore,
  uid: string,
  tournamentId: string,
): Promise<number> {
  const ref = doc(db, "bracket_seeds", bracketSeedDocId(uid, tournamentId));

  const snap = await getDoc(ref);
  if (snap.exists()) return snap.data().seed as number;

  const seed = randomSeed();
  try {
    await setDoc(ref, { seed, createdAt: serverTimestamp() });
    return seed;
  } catch {
    // Lost the create race (another tab created it first) → adopt theirs.
    const again = await getDoc(ref);
    if (again.exists()) return again.data().seed as number;
    throw new Error("bracket seed unavailable");
  }
}
