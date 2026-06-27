/**
 * rankingAggregator — votes → counts → tallies (handoff §3 / trap #2).
 */
import { describe, expect, it } from "vitest";
import {
  buildTallies,
  tallyVotes,
  type ContestantMeta,
} from "../core/rankingAggregator";

const meta = (id: string, name = id, imageUrl = ""): ContestantMeta => ({
  id,
  name,
  imageUrl,
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
      { contestantId: "a", name: "Alpha", imageUrl: null, voteCount: 2 },
      { contestantId: "b", name: "Bravo", imageUrl: null, voteCount: 0 },
    ]);
  });

  it("normalizes empty imageUrl to null, keeps a real url", () => {
    const tallies = buildTallies(new Map(), [
      meta("a", "Alpha", ""),
      meta("b", "Bravo", "https://cdn/b.png"),
    ]);
    expect(tallies[0].imageUrl).toBeNull();
    expect(tallies[1].imageUrl).toBe("https://cdn/b.png");
  });
});
