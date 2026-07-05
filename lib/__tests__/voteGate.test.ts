/**
 * lib/voteGate — decision table under the Daily Participation Limit (HF-1).
 *
 * Branches:
 *   - Guest, hasn't voted yet            → allowed (the "taster" vote)
 *   - Guest, already voted               → login_required(reason='vote')
 *   - Signed-in, joined this Tournament  → allowed (unlimited within it)
 *   - Signed-in, new Tournament, quota   → daily_limit_reached (6th new join)
 *   - Signed-in, new Tournament, room    → allowed (consumes a slot server-side)
 *
 * The hook depends on React + Firestore; testing the pure `decideVoteGate`
 * keeps the unit small while covering the branch logic that matters.
 */
import { describe, expect, it } from "vitest";
import type { User } from "firebase/auth";
import { DAILY_PARTICIPATION_LIMIT, decideVoteGate } from "../voteGate";

const fakeUser = { uid: "u1" } as User;

describe("decideVoteGate", () => {
  it("guest, no session vote yet → allowed", () => {
    expect(
      decideVoteGate({
        user: null,
        sessionVoteUsed: false,
        participatedThisTournament: false,
        participationCount: 0,
      }),
    ).toEqual({ status: "allowed" });
  });

  it("guest, session vote already used → login_required(vote)", () => {
    expect(
      decideVoteGate({
        user: null,
        sessionVoteUsed: true,
        participatedThisTournament: false,
        participationCount: 0,
      }),
    ).toEqual({ status: "login_required", reason: "vote" });
  });

  it("signed-in, already joined this Tournament → allowed even at full quota", () => {
    expect(
      decideVoteGate({
        user: fakeUser,
        sessionVoteUsed: false,
        participatedThisTournament: true,
        participationCount: DAILY_PARTICIPATION_LIMIT,
      }),
    ).toEqual({ status: "allowed" });
  });

  it(`signed-in, NEW Tournament at ${DAILY_PARTICIPATION_LIMIT} joins → daily_limit_reached`, () => {
    expect(
      decideVoteGate({
        user: fakeUser,
        sessionVoteUsed: false,
        participatedThisTournament: false,
        participationCount: DAILY_PARTICIPATION_LIMIT,
      }),
    ).toEqual({ status: "daily_limit_reached" });
  });

  it("signed-in, NEW Tournament under the limit → allowed", () => {
    expect(
      decideVoteGate({
        user: fakeUser,
        sessionVoteUsed: false,
        participatedThisTournament: false,
        participationCount: DAILY_PARTICIPATION_LIMIT - 1,
      }),
    ).toEqual({ status: "allowed" });
  });
});
