/**
 * computeRankings — pure rank/rate computation (handoff §6.4 edge cases).
 */
import { describe, expect, it } from "vitest";
import { computeRankings, roundRate, totalVotesOf } from "../../ranking/computeRankings";
import type { ContestantTally } from "../../ranking/rankingTypes";

const tally = (id: string, voteCount: number, name = id): ContestantTally => ({
  contestantId: id,
  name,
  imageUrl: null,
  voteCount,
});

describe("computeRankings", () => {
  it("empty input → []", () => {
    expect(computeRankings([])).toEqual([]);
  });

  it("all-zero votes → [] (empty state)", () => {
    expect(computeRankings([tally("a", 0), tally("b", 0)])).toEqual([]);
  });

  it("single contestant → rank 1, rate 100", () => {
    const r = computeRankings([tally("a", 7)]);
    expect(r).toHaveLength(1);
    expect(r[0]).toMatchObject({ rank: 1, contestantId: "a", rate: 100, voteCount: 7 });
  });

  it("excludes 0-vote contestants from rankings", () => {
    const r = computeRankings([tally("a", 5), tally("z", 0)]);
    expect(r.map((e) => e.contestantId)).toEqual(["a"]);
  });

  it("ties share a rank and skip the next (5/5/3 → 1·1·3)", () => {
    const r = computeRankings([tally("c", 3), tally("a", 5), tally("b", 5)]);
    expect(r.map((e) => e.rank)).toEqual([1, 1, 3]);
    // tie order is contestantId asc → a before b
    expect(r.map((e) => e.contestantId)).toEqual(["a", "b", "c"]);
    // tied contestants share the same rate
    expect(r[0].rate).toBe(r[1].rate);
  });

  it("rate is share of total, 1 decimal (33.3 / 33.3 / 33.3)", () => {
    const r = computeRankings([tally("a", 1), tally("b", 1), tally("c", 1)]);
    expect(r.every((e) => e.rate === 33.3)).toBe(true);
  });

  it("two-way split rounds to 1 decimal (2 of 3 → 66.7%)", () => {
    const r = computeRankings([tally("a", 2), tally("b", 1)]);
    expect(r[0].rate).toBe(66.7);
    expect(r[1].rate).toBe(33.3);
  });

  it("48 contestants → 48 entries, descending rate, ranks 1..48", () => {
    const tallies = Array.from({ length: 48 }, (_, i) =>
      tally(`c${String(i).padStart(2, "0")}`, 48 - i),
    );
    const r = computeRankings(tallies);
    expect(r).toHaveLength(48);
    expect(r[0].rank).toBe(1);
    expect(r[47].rank).toBe(48);
    for (let i = 1; i < r.length; i++) {
      expect(r[i].rate).toBeLessThanOrEqual(r[i - 1].rate);
    }
  });

  it("48-way tie → every rank is 1, every rate equal", () => {
    const tallies = Array.from({ length: 48 }, (_, i) => tally(`c${i}`, 10));
    const r = computeRankings(tallies);
    expect(r).toHaveLength(48);
    expect(r.every((e) => e.rank === 1)).toBe(true);
    expect(new Set(r.map((e) => e.rate)).size).toBe(1);
  });

  it("never emits voteCount fields outside the entry (carried, not dropped)", () => {
    const r = computeRankings([tally("a", 4)]);
    expect(r[0].voteCount).toBe(4); // internal-only; UI must not render it
  });
});

describe("roundRate", () => {
  it("rounds to 1 decimal", () => {
    expect(roundRate(33.34)).toBe(33.3);
    expect(roundRate(33.35)).toBe(33.4);
    expect(roundRate(100)).toBe(100);
  });
  it("NaN guard → 0", () => {
    expect(roundRate(Number.NaN)).toBe(0);
  });
});

describe("totalVotesOf", () => {
  it("sums non-negative counts", () => {
    expect(totalVotesOf([tally("a", 3), tally("b", 2)])).toBe(5);
  });
});
