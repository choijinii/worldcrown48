/**
 * linkSeeds — pure seed-transfer planning for linkSessionVote (§8 Edge #1).
 *
 * When a guest signs in, their votes are re-parented from the anon uid to the
 * new uid. The per-Voter bracket seed (bracket_seeds, ADR-0007) must move too:
 * the bracket is a pure function of (contestants, votes, seed) and depends only
 * on the seed VALUE — not the uid — so copying the value to the new uid's run-1 doc
 * reproduces the identical bracket. Miss this and the new uid mints a fresh seed
 * → the bracket reshuffles → an already-won Contestant reappears downstream →
 * duplicate winners → the round transition breaks.
 *
 * These helpers are pure so the trap is unit-tested without Firestore.
 *
 * RUN-1: 게스트는 하루 통틀어 1판이므로 이관 대상은 **언제나 1회차**다(§5 DO 3).
 * 1회차는 접미사가 없어 결과 문자열이 현행과 같지만, 이름은 `runDocId` 를 통과시킨다 —
 * 어디서도 문자열을 직접 조합하지 않는다(§3.0 B안 조건 1).
 */
import { runDocId } from "../_run/runDocId";

/** 게스트 판의 회차. 하루 1판이라 정의상 1이다. */
const GUEST_RUN_INDEX = 1;

/** A guest bracket seed for one tournament, or null if the guest had none. */
export type AnonSeed = { tournamentId: string; seed: number } | null;

/** A create-once write to perform under the new uid. */
export interface SeedWrite {
  docId: string; // runDocId(newUid, tournamentId, 1)
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
    writes.push({
      docId: runDocId(newUid, s.tournamentId, GUEST_RUN_INDEX),
      seed: s.seed,
    });
  }
  return writes;
}
