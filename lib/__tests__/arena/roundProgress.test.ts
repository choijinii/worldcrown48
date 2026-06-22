import { describe, it, expect } from "vitest";
import { matchIdFor, type ArenaVote } from "@/lib/arena/matches";
import {
  votedMatchIds,
  currentMatchIndex,
  isRoundComplete,
  currentRound,
  isTournamentComplete,
  hasVoted,
  championId,
} from "@/lib/arena/roundProgress";

const TID = "t1";

/** n sequential votes (m0..m{n-1}) in `round`, picking the given winners. */
function votesFor(round: number, n: number): ArenaVote[] {
  return Array.from({ length: n }, (_, i) => ({
    round,
    matchId: matchIdFor(TID, round, i),
    contestantId: `w${round}-${i}`,
  }));
}

/** A complete run: every round fully voted, round 5 = 1 final pick. */
function completeRun(finalPick = "champ"): ArenaVote[] {
  const v = [
    ...votesFor(1, 24),
    ...votesFor(2, 12),
    ...votesFor(3, 6),
    ...votesFor(4, 3),
  ];
  v.push({ round: 5, matchId: matchIdFor(TID, 5, 0), contestantId: finalPick });
  return v;
}

describe("roundProgress", () => {
  it("starts at round 1, match 0, with nothing voted", () => {
    expect(currentRound([])).toBe(1);
    expect(currentMatchIndex([], 1)).toBe(0);
    expect(isRoundComplete([], 1)).toBe(false);
  });

  it("currentMatchIndex equals the count of votes in the round (no skip)", () => {
    expect(currentMatchIndex(votesFor(1, 10), 1)).toBe(10);
  });

  it("marks a round complete when votes reach its matchCount", () => {
    expect(isRoundComplete(votesFor(1, 23), 1)).toBe(false);
    expect(isRoundComplete(votesFor(1, 24), 1)).toBe(true);
  });

  it("advances currentRound to the first incomplete round", () => {
    expect(currentRound(votesFor(1, 24))).toBe(2);
    expect(currentRound([...votesFor(1, 24), ...votesFor(2, 12)])).toBe(3);
  });

  it("tracks votedMatchIds and dedupe via hasVoted", () => {
    const v = votesFor(1, 3);
    expect(votedMatchIds(v, 1)).toEqual(
      new Set(["t1:r1:m0", "t1:r1:m1", "t1:r1:m2"]),
    );
    expect(hasVoted(v, "t1:r1:m1")).toBe(true);
    expect(hasVoted(v, "t1:r1:m9")).toBe(false);
  });

  it("is complete only after THE FINAL pick; exposes the championId", () => {
    const almost = completeRun().slice(0, -1); // everything but the final pick
    expect(isTournamentComplete(almost)).toBe(false);
    expect(championId(almost)).toBe(null);

    const done = completeRun("M. Adeyemi");
    expect(isTournamentComplete(done)).toBe(true);
    expect(championId(done)).toBe("M. Adeyemi");
    expect(currentRound(done)).toBe(5); // stays at THE FINAL when done
  });
});
