/**
 * scheduleRankingCacheCore — the cron's pure decision (handoff §6, §7, §9 trap #8).
 *
 * Covers the three §11 Phase B scenarios via injected snapshots (no emulator):
 * first run · history1 present (T-4) · history24 present (T-3) · dedup (trap #8).
 */
import { describe, expect, it } from "vitest";
import { buildRankingUpdate } from "../core/scheduleRankingCacheCore";
import type { ContestantTally } from "../_ranking/rankingTypes";
import { computeRankings } from "../_ranking/computeRankings";

const tally = (id: string, voteCount: number, name = id): ContestantTally => ({
  contestantId: id,
  name,
  imageUrl: null,
  voteCount,
});

/** Build a RankingSnapshot from tallies (mirrors what the cron persisted before). */
const snapshotOf = (
  tournamentId: string,
  tallies: ContestantTally[],
  generationSequence: number,
) => {
  const rankings = computeRankings(tallies);
  return {
    tournamentId,
    rankings,
    totalVotes: rankings.reduce((s, e) => s + e.voteCount, 0),
    anomalies: [],
    generationSequence,
  };
};

describe("buildRankingUpdate — first run (no history)", () => {
  const update = buildRankingUpdate({
    tournamentId: "t1",
    tallies: [tally("a", 4), tally("b", 3), tally("c", 0)],
    prevCache: null,
    history24: null,
    existingUnresolvedTags: [],
  });

  it("starts generationSequence at 0", () => {
    expect(update.generationSequence).toBe(0);
  });
  it("ranks only >0-vote contestants by rate", () => {
    expect(update.rankings.map((e) => e.contestantId)).toEqual(["a", "b"]);
    expect(update.totalVotes).toBe(7);
  });
  it("skips T-3/T-4 with no history (intended, trap #5)", () => {
    // calm split → no T-1/T-2 either
    expect(update.anomalies).toEqual([]);
    expect(update.anomalyDetail).toBeNull();
    expect(update.alertActions).toEqual([]);
  });
});

describe("buildRankingUpdate — increments sequence from prevCache", () => {
  it("seq = prev + 1", () => {
    const prev = snapshotOf("t1", [tally("a", 10), tally("b", 8)], 5);
    const update = buildRankingUpdate({
      tournamentId: "t1",
      tallies: [tally("a", 11), tally("b", 9)],
      prevCache: prev,
      history24: null,
      existingUnresolvedTags: [],
    });
    expect(update.generationSequence).toBe(6);
  });
});

describe("buildRankingUpdate — T-4 (rank jump vs 1h-ago prevCache)", () => {
  it("flags T-4 when a contestant jumps 3 → 1, with detail", () => {
    const prev = snapshotOf("t1", [tally("a", 50), tally("b", 40), tally("c", 10)], 3);
    // c surges to the lead this hour
    const update = buildRankingUpdate({
      tournamentId: "t1",
      tallies: [tally("c", 90, "Neymar"), tally("a", 55), tally("b", 42)],
      prevCache: prev,
      history24: null,
      existingUnresolvedTags: [],
    });
    expect(update.anomalies).toContain("T-4");
    const t4 = update.alertActions.find((a) => a.type === "T-4");
    expect(t4?.create).toBe(true);
    expect(t4?.detail).toMatch(/Neymar jumped rank 3→1/);
  });
});

describe("buildRankingUpdate — T-3 (24h growth vs history24)", () => {
  it("flags T-3 when the leader's voteCount ≥ tripled in 24h", () => {
    const history24 = snapshotOf("t1", [tally("a", 10), tally("b", 8)], 0);
    const update = buildRankingUpdate({
      tournamentId: "t1",
      tallies: [tally("a", 30, "Messi"), tally("b", 9)],
      prevCache: snapshotOf("t1", [tally("a", 28), tally("b", 9)], 23),
      history24,
      existingUnresolvedTags: [],
    });
    expect(update.anomalies).toContain("T-3");
    expect(update.alertActions.find((a) => a.type === "T-3")?.detail).toMatch(
      /Messi \+200% in 24h/,
    );
  });
});

describe("buildRankingUpdate — dedup persistent alerts (trap #8)", () => {
  // a dominant leader → T-1 (≥60%) + T-2 (≥30%p gap)
  const dominant = [tally("a", 80), tally("b", 20)];

  it("creates T-1/T-2 alerts when none are open", () => {
    const update = buildRankingUpdate({
      tournamentId: "t1",
      tallies: dominant,
      prevCache: null,
      history24: null,
      existingUnresolvedTags: [],
    });
    expect(update.anomalies).toEqual(["T-1", "T-2"]);
    expect(update.alertActions.every((a) => a.create)).toBe(true);
  });

  it("refreshes (create=false) a T-1 that is already open & unresolved", () => {
    const update = buildRankingUpdate({
      tournamentId: "t1",
      tallies: dominant,
      prevCache: null,
      history24: null,
      existingUnresolvedTags: ["T-1"],
    });
    const t1 = update.alertActions.find((a) => a.type === "T-1");
    const t2 = update.alertActions.find((a) => a.type === "T-2");
    expect(t1?.create).toBe(false); // deduped — refresh, don't spam
    expect(t2?.create).toBe(true); // T-2 still new
    // the cache still records the anomaly state regardless of dedup
    expect(update.anomalies).toContain("T-1");
    expect(update.anomalyDetail).toMatch(/at 80% \(≥60% threshold\)/);
  });
});
