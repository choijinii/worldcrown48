/**
 * lib/voteGate — three-branch decision table.
 *
 * Branches (handoff §4-2 + lite-spec):
 *   - Guest, hasn't voted yet  → allowed (the "taster" vote)
 *   - Guest, already voted     → login_required(reason='vote')
 *   - Signed-in, hit 5/day cap → daily_limit_reached
 *
 * The hook itself depends on React + Firestore; testing just the pure
 * `decideVoteGate` keeps the unit small and fast while still covering the
 * branch logic that actually matters.
 */
import { describe, expect, it } from "vitest";
import type { User } from "firebase/auth";
import { DAILY_LIMIT, decideVoteGate } from "../voteGate";

const fakeUser = { uid: "u1" } as User;

describe("decideVoteGate", () => {
  it("guest, no session vote yet → allowed", () => {
    expect(
      decideVoteGate({
        user: null,
        sessionVoteUsed: false,
        todayCount: 0,
      }),
    ).toEqual({ status: "allowed" });
  });

  it("guest, session vote already used → login_required(vote)", () => {
    expect(
      decideVoteGate({
        user: null,
        sessionVoteUsed: true,
        todayCount: 0,
      }),
    ).toEqual({ status: "login_required", reason: "vote" });
  });

  it(`signed-in, todayCount === ${DAILY_LIMIT} → daily_limit_reached`, () => {
    expect(
      decideVoteGate({
        user: fakeUser,
        sessionVoteUsed: false,
        todayCount: DAILY_LIMIT,
      }),
    ).toEqual({ status: "daily_limit_reached" });
  });

  it("signed-in, todayCount < limit → allowed", () => {
    expect(
      decideVoteGate({
        user: fakeUser,
        sessionVoteUsed: false,
        todayCount: DAILY_LIMIT - 1,
      }),
    ).toEqual({ status: "allowed" });
  });
});
