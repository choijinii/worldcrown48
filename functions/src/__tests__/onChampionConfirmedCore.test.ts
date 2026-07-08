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

  // HF-3 §확인 필요 2 (Guest Run Crown Card transfer, Option A) — VERIFIED here.
  // linkSessionVote re-parents a COMPLETED guest run to the Google uid by a
  // 2-stage write on roundProgress/{googleUid}_{tid}: (1) create complete=false,
  // then (2) update complete=true + championId. The onDocumentUpdated trigger
  // then sees before.complete=false / after.complete=true → this guard must
  // return true so the Crown Card regenerates under the new uid.
  // IMPLEMENTATION CAVEAT (enforced in linkSessionVote, not provable here): the
  // two writes MUST be separate commits — a single create carrying complete=true
  // fires only onDocumentCreated, never onDocumentUpdated, so the card trigger
  // would never run.
  it("fires on the linkSessionVote 2-stage transfer edge (Option A)", () => {
    const created = { userId: "googleUid", tournamentId: "t1", complete: false };
    const updated = {
      userId: "googleUid",
      tournamentId: "t1",
      complete: true,
      championId: "c7",
    };
    expect(shouldGenerateCrownCard(created, updated)).toBe(true);
  });
});
