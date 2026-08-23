/**
 * rankingAggregator — votes → counts → tallies (handoff §3 / trap #2).
 */
import { describe, expect, it } from "vitest";
import {
  buildTallies,
  tallyVotes,
  type ContestantMeta,
} from "../core/rankingAggregator";

const meta = (id: string, name = id, videoId = ""): ContestantMeta => ({
  id,
  name,
  videoId,
});

describe("tallyVotes", () => {
  it("groups votes by contestantId", () => {
    const counts = tallyVotes([
      { contestantId: "a" },
      { contestantId: "b" },
      { contestantId: "a" },
      { contestantId: "a" },
    ]);
    expect(counts.get("a")).toBe(3);
    expect(counts.get("b")).toBe(1);
  });

  it("empty votes → empty map", () => {
    expect(tallyVotes([]).size).toBe(0);
  });

  it("ignores votes with a blank contestantId (defensive)", () => {
    const counts = tallyVotes([{ contestantId: "" }, { contestantId: "a" }]);
    expect(counts.size).toBe(1);
    expect(counts.get("a")).toBe(1);
  });
});

describe("buildTallies", () => {
  it("joins counts onto contestants, 0-vote included", () => {
    const counts = tallyVotes([{ contestantId: "a" }, { contestantId: "a" }]);
    const tallies = buildTallies(counts, [meta("a", "Alpha"), meta("b", "Bravo")]);
    expect(tallies).toEqual([
      { contestantId: "a", name: "Alpha", videoId: null, voteCount: 2 },
      { contestantId: "b", name: "Bravo", videoId: null, voteCount: 0 },
    ]);
  });

  it("normalizes empty videoId to null, keeps a real one (LAB-UX-1 PR-2)", () => {
    const tallies = buildTallies(new Map(), [
      meta("a", "Alpha", ""),
      meta("b", "Bravo", "9bZkp7q19f0"),
    ]);
    expect(tallies[0].videoId).toBeNull();
    expect(tallies[1].videoId).toBe("9bZkp7q19f0");
  });
});
