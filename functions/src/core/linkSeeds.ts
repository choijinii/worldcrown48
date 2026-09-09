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
 * **v2.1 (2026-09-06)**: 게스트 한도가 하루 3판이 되면서 한 대회에 회차가 여럿일 수 있다.
 * 씨앗은 판마다 다르므로(AC 3) 회차별로 옮긴다. 회차를 빼먹으면 2판째가 로그인 후 새 씨앗을
 * 뽑아 대진표가 다시 섞이고, 이미 이긴 Contestant가 되살아난다 — 이 파일이 막으려는 바로
 * 그 사고가 회차 단위로 재발한다.
 *
 * 이름은 언제나 `runDocId` 를 통과시킨다 — 어디서도 문자열을 직접 조합하지 않는다
 * (§3.0 B안 조건 1).
 */
import { runDocId } from "../_run/runDocId";

/** A guest bracket seed for one tournament run, or null if the guest had none. */
export type AnonSeed = { tournamentId: string; runIndex: number; seed: number } | null;

/** A create-once write to perform under the new uid. */
export interface SeedWrite {
  docId: string; // runDocId(newUid, tournamentId, runIndex)
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
      docId: runDocId(newUid, s.tournamentId, s.runIndex),
      seed: s.seed,
    });
  }
  return writes;
}
