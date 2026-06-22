import { describe, it, expect } from "vitest";
import {
  matchIdFor,
  matchIndexOf,
  round1OrderedIds,
  winnerIdsForRound,
  contestantIdsForRound,
  buildMatchesForRound,
  matchesForRound,
  type ArenaVote,
} from "@/lib/arena/matches";

const TID = "t1";

/** 48 contestants c1..c48 with order 1..48 (deliberately shuffled input). */
function contestants48() {
  const arr = Array.from({ length: 48 }, (_, i) => ({
    id: `c${i + 1}`,
    order: i + 1,
  }));
  // shuffle so tests prove we sort by `order`, not input position
  return [arr[5], arr[0], arr[47], ...arr.slice(1, 5), arr[6], ...arr.slice(7, 47)];
}

/** A Voter who always picks the lower-order (left) contestant, for `n` matches of `round`. */
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

describe("matches — round 1", () => {
  it("orders the 48 contestants by `order` ascending, ignoring input order", () => {
    const ids = round1OrderedIds(contestants48());
    expect(ids).toHaveLength(48);
    expect(ids.slice(0, 4)).toEqual(["c1", "c2", "c3", "c4"]);
    expect(ids[47]).toBe("c48");
  });

  it("pairs round 1 into 24 matches: m0=(c1,c2), m23=(c47,c48)", () => {
    const matches = matchesForRound(TID, contestants48(), [], 1);
    expect(matches).toHaveLength(24);
    expect(matches[0]).toMatchObject({
      matchId: "t1:r1:m0",
      round: 1,
      index: 0,
      contestantIds: ["c1", "c2"],
    });
    expect(matches[23].contestantIds).toEqual(["c47", "c48"]);
  });
});

describe("matches — winners carry forward (bracket adjacency)", () => {
  it("winnerIdsForRound returns the Voter's picks ordered by match index", () => {
    const votes: ArenaVote[] = [
      { round: 1, matchId: "t1:r1:m2", contestantId: "c5" },
      { round: 1, matchId: "t1:r1:m0", contestantId: "c1" },
      { round: 1, matchId: "t1:r1:m1", contestantId: "c3" },
      { round: 2, matchId: "t1:r2:m0", contestantId: "c1" }, // different round ignored
    ];
    expect(winnerIdsForRound(votes, 1)).toEqual(["c1", "c3", "c5"]);
  });

  it("round 2 participants are round-1 winners in match order, paired adjacently", () => {
    const c = contestants48();
    const r1ids = round1OrderedIds(c); // c1..c48
    const votes = leftPicks(1, r1ids, 24); // winners c1,c3,c5,...,c47
    expect(contestantIdsForRound(c, votes, 2)).toEqual(
      Array.from({ length: 24 }, (_, i) => `c${i * 2 + 1}`),
    );
    const r2 = matchesForRound(TID, c, votes, 2);
    expect(r2).toHaveLength(12);
    expect(r2[0].contestantIds).toEqual(["c1", "c3"]); // adjacent winners meet
    expect(r2[11].contestantIds).toEqual(["c45", "c47"]);
  });
});

describe("matches — THE FINAL", () => {
  it("round 5 is ONE match with all 3 finalists, never 1v1", () => {
    const finalists = ["cA", "cB", "cC"];
    const m = buildMatchesForRound(TID, 5, finalists);
    expect(m).toHaveLength(1);
    expect(m[0].contestantIds).toEqual(["cA", "cB", "cC"]);
    expect(m[0].matchId).toBe("t1:r5:m0");
  });
});

describe("matches — purity / refresh-safety", () => {
  it("is a pure function of (contestants, votes): same votes → same matches", () => {
    const c = contestants48();
    const votes = leftPicks(1, round1OrderedIds(c), 24);
    const a = matchesForRound(TID, c, votes, 2);
    const b = matchesForRound(TID, c, [...votes].reverse(), 2); // reorder votes
    expect(b).toEqual(a); // refresh / reorder → identical bracket
  });

  it("round 1 is buildable mid-round (partial votes don't change pairings)", () => {
    const c = contestants48();
    const partial = leftPicks(1, round1OrderedIds(c), 10); // 10/24 done
    expect(matchesForRound(TID, c, partial, 1)).toHaveLength(24);
  });

  it("refuses to build a round before the prior round is complete", () => {
    const c = contestants48();
    const partial = leftPicks(1, round1OrderedIds(c), 10); // round 1 incomplete
    expect(() => contestantIdsForRound(c, partial, 2)).toThrow(/not ready|10\/24/);
  });
});
