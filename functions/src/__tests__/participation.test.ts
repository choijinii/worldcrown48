/**
 * participation — pure Daily Participation Limit decision (HF-1).
 *
 * The rule (대표 결정 2026-07-05): a Voter may JOIN at most 5 new Tournaments
 * per KST day. Voting inside a Tournament they've already joined is unlimited
 * (the 48-bracket's 46-vote path is the natural cap). This tests the pure
 * decision — the onVote transaction is a thin adapter over it, and the KST
 * boundary is expressed purely through the per-day document id.
 */
import { describe, expect, it } from "vitest";
import {
  DAILY_PARTICIPATION_LIMIT,
  decideParticipation,
  participationDocId,
} from "../core/participation";

describe("decideParticipation", () => {
  it("① rejects the 6th NEW Tournament of the day", () => {
    const result = decideParticipation({
      participatedTournamentIds: ["t1", "t2", "t3", "t4", "t5"],
      tournamentId: "t6",
    });
    expect(result).toEqual({ status: "limit_reached" });
  });

  it("② allows every vote in an ALREADY-JOINED Tournament (46-vote bracket path)", () => {
    // Voter has joined 5 tournaments (quota full) but is voting inside one of them.
    const result = decideParticipation({
      participatedTournamentIds: ["t1", "t2", "t3", "t4", "t5"],
      tournamentId: "t3",
    });
    expect(result).toEqual({ status: "allowed", consumesQuota: false });
  });

  it("③ a re-vote in a joined Tournament consumes NO quota", () => {
    const result = decideParticipation({
      participatedTournamentIds: ["t1"],
      tournamentId: "t1",
    });
    expect(result.status).toBe("allowed");
    expect(result).toEqual({ status: "allowed", consumesQuota: false });
  });

  it("a NEW Tournament under the limit is allowed and consumes one slot", () => {
    const result = decideParticipation({
      participatedTournamentIds: ["t1", "t2"],
      tournamentId: "t3",
    });
    expect(result).toEqual({ status: "allowed", consumesQuota: true });
  });

  it("the very first join of the day is allowed and consumes a slot", () => {
    const result = decideParticipation({
      participatedTournamentIds: [],
      tournamentId: "t1",
    });
    expect(result).toEqual({ status: "allowed", consumesQuota: true });
  });

  it("exports the limit as 5", () => {
    expect(DAILY_PARTICIPATION_LIMIT).toBe(5);
  });
});

describe("participationDocId (④ KST midnight boundary)", () => {
  it("scopes the doc per uid + KST day so a new day starts a fresh empty doc", () => {
    expect(participationDocId("abc123", "2026-07-05")).toBe("abc123_2026-07-05");
    // Crossing KST midnight → different date → different doc id → the read
    // returns an empty tournamentIds set, so the quota naturally resets.
    expect(participationDocId("abc123", "2026-07-06")).not.toBe(
      participationDocId("abc123", "2026-07-05"),
    );
  });

  it("the doc id starts with `${uid}_` so the rules can gate own-read", () => {
    expect(participationDocId("abc123", "2026-07-05").startsWith("abc123_")).toBe(
      true,
    );
  });
});
