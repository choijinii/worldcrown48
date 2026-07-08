import { describe, it, expect } from "vitest";
import { decideGuestVoteGuard } from "../core/guestVoteGuard";

/**
 * guestVoteGuard — server-side defense-in-depth for the Guest Run policy (HF-3
 * W3, AC7). The client gate (decideVoteGate) can be bypassed; onVote must refuse
 * a policy-violating anonymous vote with permission-denied. This pure core
 * mirrors the client branches so the two can't drift.
 *
 * Anonymous is detected upstream via
 * `req.auth.token.firebase.sign_in_provider === 'anonymous'`; the facts
 * (completedCurrentTournament, enteredOtherTournament) are fetched with the
 * admin SDK (which bypasses the doc-id-prefix `list` denial that blocked the
 * client — §확인 필요 1) and passed in here.
 */
const facts = (over: Record<string, unknown> = {}) => ({
  isAnonymous: true,
  completedCurrentTournament: false,
  enteredOtherTournament: false,
  ...over,
});

describe("decideGuestVoteGuard", () => {
  it("allows any non-anonymous caller (never guest-guarded)", () => {
    expect(
      decideGuestVoteGuard(
        facts({
          isAnonymous: false,
          completedCurrentTournament: true,
          enteredOtherTournament: true,
        }),
      ),
    ).toEqual({ status: "allow" });
  });

  it("allows an anon guest in their first / same in-progress Tournament", () => {
    expect(decideGuestVoteGuard(facts())).toEqual({ status: "allow" });
  });

  it("denies an anon guest re-voting in a Tournament they already completed", () => {
    const d = decideGuestVoteGuard(facts({ completedCurrentTournament: true }));
    expect(d.status).toBe("deny");
  });

  it("denies an anon guest voting in a second (different) Tournament", () => {
    const d = decideGuestVoteGuard(facts({ enteredOtherTournament: true }));
    expect(d.status).toBe("deny");
  });

  it("denies when both violations hold", () => {
    const d = decideGuestVoteGuard(
      facts({ completedCurrentTournament: true, enteredOtherTournament: true }),
    );
    expect(d.status).toBe("deny");
  });
});
