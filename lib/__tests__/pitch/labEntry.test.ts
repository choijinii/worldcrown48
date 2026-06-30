import { describe, it, expect } from "vitest";
import { resolveLabState, LAB_COPY } from "@/lib/pitch/labEntry";

/**
 * A-1 LabEntryCard state logic (handoff §11.2 → AC-9).
 *
 * The card is `locked` for ordinary Voters and `active` only for a Tournament
 * Host. The DOM transition + tooltip reveal are verified in Playwright E2E;
 * here we pin the pure state resolution and the copy each state shows.
 */

describe("resolveLabState", () => {
  it("is 'active' when the current Voter is a Tournament Host", () => {
    expect(resolveLabState({ isTournamentHost: true })).toBe("active");
  });

  it("is 'locked' for an ordinary Voter", () => {
    expect(resolveLabState({ isTournamentHost: false })).toBe("locked");
  });

  it("defaults to 'locked' when host status is unknown", () => {
    expect(resolveLabState({})).toBe("locked");
  });
});

describe("LAB_COPY", () => {
  it("exposes the 'Coming Soon' tooltip for the locked state", () => {
    expect(LAB_COPY.locked.tooltip).toMatch(/Coming Soon/i);
  });

  it("invites the Host to open The Lab in the active state", () => {
    expect(LAB_COPY.active.cta).toMatch(/Open The Lab/i);
  });
});
