import { describe, it, expect } from "vitest";
import {
  advanceRoundDecision,
  nextRound,
} from "../core/advanceRoundCore";

describe("advanceRoundCore", () => {
  it("is noop until the Voter completes the round's matchCount", () => {
    expect(advanceRoundDecision(1, 23)).toBe("noop");
    expect(advanceRoundDecision(1, 24)).toBe("transition");
    expect(advanceRoundDecision(4, 2)).toBe("noop");
    expect(advanceRoundDecision(4, 3)).toBe("transition");
  });

  it("a completed THE FINAL (round 5, 1 vote) confirms the Champion", () => {
    expect(advanceRoundDecision(5, 0)).toBe("noop");
    expect(advanceRoundDecision(5, 1)).toBe("champion");
  });

  it("treats unknown rounds as noop (defensive)", () => {
    expect(advanceRoundDecision(0, 5)).toBe("noop");
    expect(advanceRoundDecision(6, 5)).toBe("noop");
  });

  it("nextRound advances 1→2 … 4→5", () => {
    expect([1, 2, 3, 4].map(nextRound)).toEqual([2, 3, 4, 5]);
  });
});
