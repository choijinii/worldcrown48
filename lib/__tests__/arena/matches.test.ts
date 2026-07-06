import { describe, it, expect } from "vitest";
import {
  matchIdFor,
  matchIndexOf,
  mulberry32,
  seededShuffle,
  round1OrderedIds,
  winnerIdsForRound,
  contestantIdsForRound,
  buildMatchesForRound,
  matchesForRound,
  type ArenaVote,
} from "@/lib/arena/matches";

const TID = "t1";
const SEED_A = 12345;
const SEED_B = 99999;

/** 48 contestants c1..c48 with order 1..48 (deliberately shuffled input). */
function contestants48() {
  const arr = Array.from({ length: 48 }, (_, i) => ({
    id: `c${i + 1}`,
    order: i + 1,
  }));
  // shuffle so tests prove we sort by `order`, not input position
  return [arr[5], arr[0], arr[47], ...arr.slice(1, 5), arr[6], ...arr.slice(7, 47)];
}

/**
 * A Voter who always picks the LEFT contestant of each match, for `n` matches of
 * `round`, given that round's participant ids (already seed-ordered).
 */
function leftPicks(round: number, contestantIds: string[], n: number): ArenaVote[] {
  return Array.from({ length: n }, (_, i) => ({
    round,
    matchId: matchIdFor(TID, round, i),
    contestantId: contestantIds[i * 2], // left of pair i
  }));
}

describe("matches — matchId", () => {
  it("builds a deterministic ${tid}:r{round}:m{index} id", () => {
    expect(matchIdFor(TID, 2, 5)).toBe("t1:r2:m5");
    expect(matchIndexOf("t1:r2:m5")).toBe(5);
  });
});

describe("matches — seededShuffle (deterministic PRNG, HF-2)", () => {
  it("mulberry32 is deterministic: same seed → same stream", () => {
    const a = mulberry32(SEED_A);
    const b = mulberry32(SEED_A);
    const seqA = [a(), a(), a()];
    const seqB = [b(), b(), b()];
    expect(seqA).toEqual(seqB);
    seqA.forEach((n) => {
      expect(n).toBeGreaterThanOrEqual(0);
      expect(n).toBeLessThan(1);
    });
  });

  it("is a permutation — same multiset, no adds/drops", () => {
    const src = Array.from({ length: 20 }, (_, i) => i);
    const out = seededShuffle(src, SEED_A);
    expect(out).toHaveLength(20);
    expect([...out].sort((x, y) => x - y)).toEqual(src);
  });

  it("does not mutate its input", () => {
    const src = [1, 2, 3, 4, 5];
    const copy = [...src];
    seededShuffle(src, SEED_A);
    expect(src).toEqual(copy);
  });

  it("same seed → identical order; different seed → different order", () => {
    const src = Array.from({ length: 48 }, (_, i) => i);
    expect(seededShuffle(src, SEED_A)).toEqual(seededShuffle(src, SEED_A));
    expect(seededShuffle(src, SEED_A)).not.toEqual(seededShuffle(src, SEED_B));
  });
});

describe("matches — round 1 (seeded pairing)", () => {
  it("keeps all 48 contestants, unique, as a permutation of the order-sorted set", () => {
    const ids = round1OrderedIds(contestants48(), SEED_A);
    expect(ids).toHaveLength(48);
    expect(new Set(ids).size).toBe(48);
    expect([...ids].sort()).toEqual(
      Array.from({ length: 48 }, (_, i) => `c${i + 1}`).sort(),
    );
  });

  it("is SEEDED, not plain order — the bracket is shuffled away from c1..c48", () => {
    const ordered = Array.from({ length: 48 }, (_, i) => `c${i + 1}`);
    expect(round1OrderedIds(contestants48(), SEED_A)).not.toEqual(ordered);
  });

  it("is refresh-safe: same seed → identical order", () => {
    expect(round1OrderedIds(contestants48(), SEED_A)).toEqual(
      round1OrderedIds(contestants48(), SEED_A),
    );
  });

  it("is Voter-specific: different seeds → different pairings", () => {
    expect(round1OrderedIds(contestants48(), SEED_A)).not.toEqual(
      round1OrderedIds(contestants48(), SEED_B),
    );
  });

  it("pairs round 1 into 24 matches with all 48 contestants, none duplicated", () => {
    const matches = matchesForRound(TID, contestants48(), [], 1, SEED_A);
    expect(matches).toHaveLength(24);
    const flat = matches.flatMap((m) => m.contestantIds);
    expect(flat).toHaveLength(48);
    expect(new Set(flat).size).toBe(48);
    expect(matches[0].matchId).toBe("t1:r1:m0");
    expect(matches[23].matchId).toBe("t1:r1:m23");
  });
});

describe("matches — winners carry forward (seeded re-pairing)", () => {
  it("winnerIdsForRound returns the Voter's picks ordered by match index", () => {
    const votes: ArenaVote[] = [
      { round: 1, matchId: "t1:r1:m2", contestantId: "c5" },
      { round: 1, matchId: "t1:r1:m0", contestantId: "c1" },
      { round: 1, matchId: "t1:r1:m1", contestantId: "c3" },
      { round: 2, matchId: "t1:r2:m0", contestantId: "c1" }, // different round ignored
    ];
    expect(winnerIdsForRound(votes, 1)).toEqual(["c1", "c3", "c5"]);
  });

  it("round 2 participants are exactly round-1 winners (as a set), seed-shuffled", () => {
    const c = contestants48();
    const r1ids = round1OrderedIds(c, SEED_A);
    const votes = leftPicks(1, r1ids, 24); // 24 winners = every left pick
    const winners = winnerIdsForRound(votes, 1);
    const r2participants = contestantIdsForRound(c, votes, 2, SEED_A);

    // Same set — no winner dropped, no stranger introduced, no duplicate.
    expect(r2participants).toHaveLength(24);
    expect(new Set(r2participants).size).toBe(24);
    expect([...r2participants].sort()).toEqual([...winners].sort());

    const r2 = matchesForRound(TID, c, votes, 2, SEED_A);
    expect(r2).toHaveLength(12);
    const flat = r2.flatMap((m) => m.contestantIds);
    expect(new Set(flat).size).toBe(24); // no duplicate participant across matches
  });

  it("re-pairs winners by seed — round 2 differs between two Voters with the same winners", () => {
    const c = contestants48();
    // Voter A and Voter B each win their own round-1 left picks. To compare the
    // round-2 PAIRING independent of round-1 order, feed both the same winners.
    const winners = Array.from({ length: 24 }, (_, i) => `w${i + 1}`);
    const votes: ArenaVote[] = winners.map((id, i) => ({
      round: 1,
      matchId: matchIdFor(TID, 1, i),
      contestantId: id,
    }));
    const a = contestantIdsForRound(c, votes, 2, SEED_A);
    const b = contestantIdsForRound(c, votes, 2, SEED_B);
    expect([...a].sort()).toEqual([...b].sort()); // same participants
    expect(a).not.toEqual(b); // different pairing order
  });
});

describe("matches — THE FINAL (seeded display order)", () => {
  it("round 5 is ONE match with all 3 finalists, never 1v1", () => {
    const finalists = ["cA", "cB", "cC"];
    const m = buildMatchesForRound(TID, 5, finalists);
    expect(m).toHaveLength(1);
    expect([...m[0].contestantIds].sort()).toEqual(["cA", "cB", "cC"]);
    expect(m[0].matchId).toBe("t1:r5:m0");
  });

  it("THE FINAL display order is seed-shuffled but preserves the 3 finalists", () => {
    const c = contestants48();
    // round-4 winners = 3 finalists f1,f2,f3 (3 matches in round 4)
    const votes: ArenaVote[] = ["f1", "f2", "f3"].map((id, i) => ({
      round: 4,
      matchId: matchIdFor(TID, 4, i),
      contestantId: id,
    }));
    const finalists = contestantIdsForRound(c, votes, 5, SEED_A);
    expect([...finalists].sort()).toEqual(["f1", "f2", "f3"]);
    // deterministic for a given seed
    expect(contestantIdsForRound(c, votes, 5, SEED_A)).toEqual(finalists);
  });
});

describe("matches — purity / refresh-safety", () => {
  it("is a pure function of (contestants, votes, seed): reorder votes → identical bracket", () => {
    const c = contestants48();
    const votes = leftPicks(1, round1OrderedIds(c, SEED_A), 24);
    const a = matchesForRound(TID, c, votes, 2, SEED_A);
    const b = matchesForRound(TID, c, [...votes].reverse(), 2, SEED_A);
    expect(b).toEqual(a); // refresh / reorder → identical bracket
  });

  it("round 1 is buildable mid-round (partial votes don't change pairings)", () => {
    const c = contestants48();
    const r1 = round1OrderedIds(c, SEED_A);
    const partial = leftPicks(1, r1, 10); // 10/24 done
    const full = matchesForRound(TID, c, partial, 1, SEED_A);
    expect(full).toHaveLength(24);
    // pairing is stable regardless of how many votes are in
    expect(matchesForRound(TID, c, [], 1, SEED_A)).toEqual(full);
  });

  it("refuses to build a round before the prior round is complete", () => {
    const c = contestants48();
    const partial = leftPicks(1, round1OrderedIds(c, SEED_A), 10); // round 1 incomplete
    expect(() => contestantIdsForRound(c, partial, 2, SEED_A)).toThrow(
      /not ready|10\/24/,
    );
  });
});
