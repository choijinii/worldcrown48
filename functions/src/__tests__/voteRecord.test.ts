import { describe, it, expect } from "vitest";
import { buildVoteDoc, VoteValidationError } from "../core/voteRecord";

const valid = {
  userId: "u1",
  tournamentId: "t1",
  round: 1,
  matchId: "t1:r1:m0",
  contestantId: "c1",
  date: "2026-06-22",
  // RUN-1: 모든 vote는 어느 판의 선택인지 싣는다. onVote가 회차를 확정해 넘긴다.
  runIndex: 1,
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

describe("buildVoteDoc — runIndex (RUN-1)", () => {
  const valid = {
    userId: "u1",
    tournamentId: "gen4_idol_48",
    round: 1,
    matchId: "gen4_idol_48:r1:m0",
    contestantId: "c1",
    date: "2026-09-05",
  };

  it("① runIndex를 문서에 싣는다 — 회차의 정본은 필드다 (§5 DO 1)", () => {
    expect(buildVoteDoc({ ...valid, runIndex: 3 }).runIndex).toBe(3);
  });

  it("② 1..5 범위를 벗어나면 거부한다", () => {
    expect(() => buildVoteDoc({ ...valid, runIndex: 0 })).toThrow(VoteValidationError);
    expect(() => buildVoteDoc({ ...valid, runIndex: 6 })).toThrow(VoteValidationError);
  });

  it("③ 정수가 아니면 거부한다", () => {
    expect(() => buildVoteDoc({ ...valid, runIndex: 1.5 })).toThrow(VoteValidationError);
    expect(() => buildVoteDoc({ ...valid, runIndex: Number.NaN })).toThrow(VoteValidationError);
  });

  it("④ 1회차와 5회차 경계는 통과한다", () => {
    expect(buildVoteDoc({ ...valid, runIndex: 1 }).runIndex).toBe(1);
    expect(buildVoteDoc({ ...valid, runIndex: 5 }).runIndex).toBe(5);
  });
});
