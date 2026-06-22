import { describe, it, expect } from "vitest";
import { buildVoteDoc, VoteValidationError } from "../core/voteRecord";

const valid = {
  userId: "u1",
  tournamentId: "t1",
  round: 1,
  matchId: "t1:r1:m0",
  contestantId: "c1",
  date: "2026-06-22",
};

describe("buildVoteDoc", () => {
  it("builds a vote doc from a valid input", () => {
    expect(buildVoteDoc(valid)).toEqual(valid);
  });

  it("rejects a round outside 1..5", () => {
    expect(() => buildVoteDoc({ ...valid, round: 0 })).toThrow(
      VoteValidationError,
    );
    expect(() => buildVoteDoc({ ...valid, round: 6 })).toThrow();
  });

  it("rejects a matchId that doesn't belong to the tournament+round", () => {
    expect(() => buildVoteDoc({ ...valid, matchId: "t1:r2:m0" })).toThrow(); // round mismatch
    expect(() => buildVoteDoc({ ...valid, matchId: "other:r1:m0" })).toThrow(); // tid mismatch
    expect(() => buildVoteDoc({ ...valid, matchId: "garbage" })).toThrow();
  });

  it("rejects empty userId / contestantId", () => {
    expect(() => buildVoteDoc({ ...valid, userId: "" })).toThrow();
    expect(() => buildVoteDoc({ ...valid, contestantId: "" })).toThrow();
  });

  it("rejects a malformed KST date", () => {
    expect(() => buildVoteDoc({ ...valid, date: "2026/06/22" })).toThrow();
  });
});
