/**
 * lib/voteGate — decision table for the Guest Run policy (HF-3) layered over
 * the Daily Participation Limit (HF-1).
 *
 * The site signs every visitor in with `signInAnonymously` (lib/firebase.ts), so
 * `user` is almost never null — the guest discriminator is `isAnonymous`, NOT
 * `!user` (that was the HF-3 spec-pollution root cause: the `!user` branch never
 * fired, so anon uids took the signed-in path). Branches:
 *
 *   Guest (anonymous / no user) — Guest Run = one Tournament, run to completion:
 *     - first Tournament, not completed        → allowed (the whole run)
 *     - the SAME Tournament, still in progress  → allowed (continue)
 *     - a DIFFERENT Tournament than they entered → login_required(vote)
 *     - already completed a run                 → login_required(vote)
 *
 *   Signed-in (non-anonymous) — HF-1 Daily Participation Limit, unchanged:
 *     - joined this Tournament                  → allowed (unlimited within it)
 *     - new Tournament, quota exhausted         → daily_limit_reached
 *     - new Tournament, room                    → allowed
 *
 * The hook depends on React + Firestore; testing pure `decideVoteGate` keeps the
 * unit small while covering the branch logic that matters. HOW the guest fields
 * (guestTournamentId, guestCompleted) are sourced is W2 (see voteGate.ts).
 */
import { describe, expect, it } from "vitest";
import type { User } from "firebase/auth";
import { DAILY_PARTICIPATION_LIMIT, decideVoteGate } from "../voteGate";

const anonUser = { uid: "anon1", isAnonymous: true } as User;
const googleUser = { uid: "g1", isAnonymous: false } as User;

/** Defaults for the signed-in HF-1 fields (irrelevant on the guest path). */
const base = {
  guestTournamentId: null as string | null,
  guestCompleted: false,
  participatedThisTournament: false,
  participationCount: 0,
};

describe("decideVoteGate — Guest Run (HF-3)", () => {
  it("guest, first Tournament, not completed → allowed", () => {
    expect(
      decideVoteGate({
        ...base,
        user: anonUser,
        isAnonymous: true,
        tournamentId: "t1",
      }),
    ).toEqual({ status: "allowed" });
  });

  it("guest, SAME Tournament still in progress → allowed", () => {
    expect(
      decideVoteGate({
        ...base,
        user: anonUser,
        isAnonymous: true,
        tournamentId: "t1",
        guestTournamentId: "t1",
      }),
    ).toEqual({ status: "allowed" });
  });

  it("guest, DIFFERENT Tournament than the one entered → login_required(vote)", () => {
    expect(
      decideVoteGate({
        ...base,
        user: anonUser,
        isAnonymous: true,
        tournamentId: "t2",
        guestTournamentId: "t1",
      }),
    ).toEqual({ status: "login_required", reason: "vote" });
  });

  it("guest, already completed a run → login_required(vote)", () => {
    expect(
      decideVoteGate({
        ...base,
        user: anonUser,
        isAnonymous: true,
        tournamentId: "t1",
        guestTournamentId: "t1",
        guestCompleted: true,
      }),
    ).toEqual({ status: "login_required", reason: "vote" });
  });

  it("null user (pre-anon race) is treated as a guest first vote → allowed", () => {
    expect(
      decideVoteGate({
        ...base,
        user: null,
        isAnonymous: false,
        tournamentId: "t1",
      }),
    ).toEqual({ status: "allowed" });
  });
});

describe("decideVoteGate — signed-in Daily Participation Limit (HF-1, unchanged)", () => {
  it("signed-in, already joined this Tournament → allowed even at full quota", () => {
    expect(
      decideVoteGate({
        ...base,
        user: googleUser,
        isAnonymous: false,
        tournamentId: "t1",
        participatedThisTournament: true,
        participationCount: DAILY_PARTICIPATION_LIMIT,
      }),
    ).toEqual({ status: "allowed" });
  });

  it(`signed-in, NEW Tournament at ${DAILY_PARTICIPATION_LIMIT} joins → daily_limit_reached`, () => {
    expect(
      decideVoteGate({
        ...base,
        user: googleUser,
        isAnonymous: false,
        tournamentId: "t1",
        participationCount: DAILY_PARTICIPATION_LIMIT,
      }),
    ).toEqual({ status: "daily_limit_reached" });
  });

  it("signed-in, NEW Tournament under the limit → allowed", () => {
    expect(
      decideVoteGate({
        ...base,
        user: googleUser,
        isAnonymous: false,
        tournamentId: "t1",
        participationCount: DAILY_PARTICIPATION_LIMIT - 1,
      }),
    ).toEqual({ status: "allowed" });
  });

  it("signed-in path ignores leftover guest fields (no accidental login gate)", () => {
    // A freshly-linked Google user may still carry a guestTournamentId/completed
    // from their guest run; the signed-in branch must NOT gate on them.
    expect(
      decideVoteGate({
        ...base,
        user: googleUser,
        isAnonymous: false,
        tournamentId: "t2",
        guestTournamentId: "t1",
        guestCompleted: true,
        participatedThisTournament: true,
        participationCount: DAILY_PARTICIPATION_LIMIT,
      }),
    ).toEqual({ status: "allowed" });
  });
});
