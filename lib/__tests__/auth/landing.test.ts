import { describe, it, expect } from "vitest";
import { pickLanding, type LandingTournament } from "@/lib/auth/landing";

/**
 * pickLanding — where a guest lands after signing in (HF-3.1 W2).
 *
 * The acceptance table has two completion kinds and the landing MUST prefer the
 * fresh one:
 *   - `complete` + source `guest`    → the run the visitor JUST completed. Land
 *     here, no banner.
 *   - `complete` + source `existing` → a CONFLICT: the account already finished
 *     this Tournament in the past. Land on the old card, but raise the banner.
 *   - guest is preferred over existing when BOTH are complete in one link (a
 *     stale card must never masquerade as the just-finished run).
 *   - nothing complete → null (mid-progress stays put, AC5).
 *
 * Backward-compat: an OLD linkSessionVote (pre-HF-3.1, no `source`) still returns
 * `complete` entries — we land on the first one with NO banner (never invent a
 * "returning" banner we can't justify) so the deploy-lag window is safe.
 */
const t = (over: Partial<LandingTournament> = {}): LandingTournament => ({
  tournamentId: "t1",
  complete: false,
  ...over,
});

describe("pickLanding", () => {
  it("lands on a freshly completed guest run with NO banner", () => {
    expect(pickLanding([t({ tournamentId: "a", complete: true, source: "guest" })])).toEqual({
      tournamentId: "a",
      returning: false,
    });
  });

  it("lands on an existing (conflict) completion WITH the banner", () => {
    expect(pickLanding([t({ tournamentId: "a", complete: true, source: "existing" })])).toEqual({
      tournamentId: "a",
      returning: true,
    });
  });

  it("prefers a guest completion over an existing completion (fresh run wins)", () => {
    expect(
      pickLanding([
        t({ tournamentId: "old", complete: true, source: "existing" }),
        t({ tournamentId: "fresh", complete: true, source: "guest" }),
      ]),
    ).toEqual({ tournamentId: "fresh", returning: false });
  });

  it("returns null when nothing is complete (mid-progress stays put, AC5)", () => {
    expect(
      pickLanding([
        t({ tournamentId: "a", complete: false, source: "guest" }),
        t({ tournamentId: "b", complete: false, source: "existing" }),
      ]),
    ).toBeNull();
  });

  it("returns null for empty or undefined tournament lists", () => {
    expect(pickLanding([])).toBeNull();
    expect(pickLanding(undefined)).toBeNull();
  });

  it("backward-compat: an old response (no source) lands on the first complete, NO banner", () => {
    expect(
      pickLanding([
        t({ tournamentId: "a", complete: false }),
        t({ tournamentId: "b", complete: true }),
      ]),
    ).toEqual({ tournamentId: "b", returning: false });
  });
});
