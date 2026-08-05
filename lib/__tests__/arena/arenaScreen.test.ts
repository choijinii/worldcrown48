/**
 * arenaScreenState — which screen /arena/[tournamentId] shows.
 *
 * Extracted from the page's inline render guard, which had two defects the
 * 2026-08-05 production probe caught (verdict §10.1):
 *   - the store starts `loading:false, tournament:null` and the load effect is
 *     gated on `if (uid)`, so the FIRST paint fell through to the not-found
 *     branch → every Voter saw "토너먼트를 찾을 수 없어요" for ~0.3s
 *     (measured: not-found@282ms → loading@590ms → MATCH@996ms).
 *   - a genuine load failure was rendered as "not found", which is a different
 *     (and wrong) statement — no retry was offered.
 */
import { describe, it, expect } from "vitest";
import { arenaScreenState, type ArenaScreenInput } from "@/lib/arena/arenaScreen";

function input(over: Partial<ArenaScreenInput> = {}): ArenaScreenInput {
  return {
    authLoading: false,
    uid: "u1",
    loading: false,
    hasTournament: false,
    error: null,
    ...over,
  };
}

describe("arenaScreenState", () => {
  it("shows loading while auth is still resolving", () => {
    expect(arenaScreenState(input({ authLoading: true }))).toBe("loading");
  });

  // The not-found flash: auth is done, the effect has not run yet, so the store
  // is still at its initial (loading:false, tournament:null) state.
  it("shows loading — not not-found — before the load effect has run", () => {
    expect(arenaScreenState(input({ loading: false, hasTournament: false }))).toBe("loading");
  });

  it("shows loading while the load is in flight", () => {
    expect(arenaScreenState(input({ loading: true }))).toBe("loading");
  });

  it("shows not-found only when the tournament genuinely does not exist", () => {
    expect(arenaScreenState(input({ error: "not-found" }))).toBe("not-found");
  });

  it("distinguishes a load failure from not-found", () => {
    expect(arenaScreenState(input({ error: "load-failed" }))).toBe("load-failed");
  });

  it("treats auth resolved with no uid as a load failure, never an endless spinner", () => {
    expect(arenaScreenState(input({ uid: null }))).toBe("load-failed");
  });

  it("is ready once the tournament is loaded", () => {
    expect(arenaScreenState(input({ hasTournament: true }))).toBe("ready");
  });

  it("keeps showing the loaded tournament during a background refetch", () => {
    expect(arenaScreenState(input({ hasTournament: true, loading: true }))).toBe("ready");
  });

  it("prefers the error over a stale tournament", () => {
    expect(arenaScreenState(input({ hasTournament: true, error: "not-found" }))).toBe("not-found");
  });
});
