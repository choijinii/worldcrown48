import { describe, it, expect } from "vitest";
import {
  planRoundProgressTransfer,
  transferredTournaments,
  type RoundProgressFacts,
} from "../core/linkRoundProgress";

/**
 * linkRoundProgress — pure planner for the Guest Run roundProgress transfer
 * (HF-3 W4, Phase 3.3). When a guest signs in, their per-Voter roundProgress
 * must move to the Google uid so the run's progress + Champion survive:
 *
 *   - Google already has a roundProgress for this tid  → SKIP (Google wins,
 *     §8 Edge #1); the response `complete` reflects the GOOGLE doc.
 *   - Guest has no roundProgress (mid round-1, votes carry it) → SKIP.
 *   - Guest doc, incomplete  → COPY (single create under the new uid).
 *   - Guest doc, complete    → REFIRE (Option A 2-stage create→update so the
 *     onChampionConfirmed onDocumentUpdated trigger regenerates the Crown Card).
 *
 * The impure linkSessionVote fetches these booleans + the field snapshot and
 * executes the writes; this core is pure so the decision table is unit-tested.
 */
const fact = (over: Partial<RoundProgressFacts> = {}): RoundProgressFacts => ({
  tournamentId: "t1",
  guestExists: true,
  guestComplete: false,
  googleExists: false,
  googleComplete: false,
  ...over,
});

describe("planRoundProgressTransfer", () => {
  it("SKIPs when Google already has the roundProgress (Google wins, §8 Edge 1)", () => {
    expect(planRoundProgressTransfer([fact({ googleExists: true, googleComplete: false })])).toEqual([
      { tournamentId: "t1", action: "skip", responseComplete: false },
    ]);
  });

  it("SKIP with responseComplete=true when Google already completed it", () => {
    expect(planRoundProgressTransfer([fact({ googleExists: true, googleComplete: true })])).toEqual([
      { tournamentId: "t1", action: "skip", responseComplete: true },
    ]);
  });

  it("SKIPs when the guest has no roundProgress (mid round-1 — votes carry it)", () => {
    expect(planRoundProgressTransfer([fact({ guestExists: false })])).toEqual([
      { tournamentId: "t1", action: "skip", responseComplete: false },
    ]);
  });

  it("COPYs an incomplete guest run (single create)", () => {
    expect(planRoundProgressTransfer([fact({ guestComplete: false })])).toEqual([
      { tournamentId: "t1", action: "copy", responseComplete: false },
    ]);
  });

  it("REFIREs a completed guest run (2-stage → Crown Card regen)", () => {
    expect(planRoundProgressTransfer([fact({ guestComplete: true })])).toEqual([
      { tournamentId: "t1", action: "refire", responseComplete: true },
    ]);
  });

  it("plans each tournament independently", () => {
    const plan = planRoundProgressTransfer([
      fact({ tournamentId: "a", guestComplete: true }),
      fact({ tournamentId: "b", googleExists: true, googleComplete: true }),
      fact({ tournamentId: "c", guestExists: false }),
    ]);
    expect(plan).toEqual([
      { tournamentId: "a", action: "refire", responseComplete: true },
      { tournamentId: "b", action: "skip", responseComplete: true },
      { tournamentId: "c", action: "skip", responseComplete: false },
    ]);
  });
});

describe("transferredTournaments (linkSessionVote response payload)", () => {
  it("maps the plan to { tournamentId, complete } for the landing decision", () => {
    const plan = planRoundProgressTransfer([
      fact({ tournamentId: "a", guestComplete: true }),
      fact({ tournamentId: "b", guestComplete: false }),
    ]);
    expect(transferredTournaments(plan)).toEqual([
      { tournamentId: "a", complete: true },
      { tournamentId: "b", complete: false },
    ]);
  });
});
