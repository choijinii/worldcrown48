import { describe, it, expect } from "vitest";
import { shouldGenerateCrownCard } from "../core/onChampionConfirmedCore";

/**
 * onChampionConfirmedCore — pure transition guard for the Crown Card trigger
 * (handoff §3, 부록 D, ADR-0005). Fires only on the false→true `complete`
 * edge of a per-Voter roundProgress doc that carries a real Champion. Idempotent
 * by design: a redelivered "already complete" update must NOT re-fire.
 */
const complete = (over: Record<string, unknown> = {}) => ({
  userId: "voter1",
  tournamentId: "t1",
  complete: true,
  championId: "c7",
  ...over,
});

describe("shouldGenerateCrownCard", () => {
  it("fires on the false→true complete edge with a Champion", () => {
    expect(shouldGenerateCrownCard({ complete: false }, complete())).toBe(true);
    expect(shouldGenerateCrownCard(undefined, complete())).toBe(true);
  });

  it("does NOT fire when before was already complete (redelivered event)", () => {
    expect(shouldGenerateCrownCard(complete(), complete())).toBe(false);
  });

  it("does NOT fire on a round-transition write (no complete flag)", () => {
    const transition = { userId: "voter1", tournamentId: "t1", fromRound: 1, toRound: 2 };
    expect(shouldGenerateCrownCard(undefined, transition)).toBe(false);
  });

  it("does NOT fire when after is missing required fields", () => {
    expect(shouldGenerateCrownCard({ complete: false }, complete({ championId: null }))).toBe(false);
    expect(shouldGenerateCrownCard({ complete: false }, complete({ userId: undefined }))).toBe(false);
    expect(shouldGenerateCrownCard({ complete: false }, complete({ tournamentId: "" }))).toBe(false);
  });

  it("does NOT fire when after is undefined (doc deleted)", () => {
    expect(shouldGenerateCrownCard({ complete: false }, undefined)).toBe(false);
  });
});
