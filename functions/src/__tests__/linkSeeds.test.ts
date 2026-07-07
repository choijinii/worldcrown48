/**
 * linkSeeds — the seed-transfer core for linkSessionVote (§8 Edge #1).
 *
 * THE hotfix trap: if the guest's bracket seed is NOT carried to the freshly
 * signed-in uid, the new uid has no seed → Arena entry mints a fresh one →
 * the bracket RESHUFFLES → a Contestant already recorded as a winner reappears
 * in a later match → duplicate winners → round transition breaks.
 *
 * These pure tests prove the transfer plan copies each seed VALUE to the new
 * uid's doc id. Combined with matches.test.ts ("same seed → identical bracket"),
 * they close the loop: transferring the value reproduces the exact bracket.
 */
import { describe, it, expect } from "vitest";
import {
  distinctTournamentIds,
  planSeedTransfer,
  type AnonSeed,
} from "../core/linkSeeds";

describe("distinctTournamentIds", () => {
  it("dedupes a Voter's many votes in one tournament down to one id", () => {
    const votes = [
      { tournamentId: "t1" },
      { tournamentId: "t1" },
      { tournamentId: "t1" },
    ];
    expect(distinctTournamentIds(votes)).toEqual(["t1"]);
  });

  it("lists every distinct tournament the guest played", () => {
    const votes = [
      { tournamentId: "t1" },
      { tournamentId: "t2" },
      { tournamentId: "t1" },
    ];
    expect(distinctTournamentIds(votes).sort()).toEqual(["t1", "t2"]);
  });

  it("ignores vote docs missing a tournamentId (defensive)", () => {
    const votes = [{ tournamentId: "t1" }, {}, { tournamentId: "" }];
    expect(distinctTournamentIds(votes)).toEqual(["t1"]);
  });
});

describe("planSeedTransfer (§8 Edge #1)", () => {
  const NEW_UID = "google-uid";

  it("copies each anon seed to `${newUid}_${tid}` preserving the seed VALUE", () => {
    const anon: AnonSeed[] = [{ tournamentId: "t1", seed: 4242 }];
    expect(planSeedTransfer(NEW_UID, anon)).toEqual([
      { docId: "google-uid_t1", seed: 4242 },
    ]);
  });

  it("carries the exact seed so the bracket does NOT reshuffle on login", () => {
    // The seed value must survive verbatim — a changed value would reshuffle.
    const anon: AnonSeed[] = [{ tournamentId: "t1", seed: 0xdeadbeef }];
    const [plan] = planSeedTransfer(NEW_UID, anon);
    expect(plan.seed).toBe(0xdeadbeef);
  });

  it("plans a write per tournament the guest had a seed for", () => {
    const anon: AnonSeed[] = [
      { tournamentId: "t1", seed: 1 },
      { tournamentId: "t2", seed: 2 },
    ];
    expect(planSeedTransfer(NEW_UID, anon)).toEqual([
      { docId: "google-uid_t1", seed: 1 },
      { docId: "google-uid_t2", seed: 2 },
    ]);
  });

  it("skips tournaments where the guest had no seed doc (null)", () => {
    const anon: AnonSeed[] = [
      { tournamentId: "t1", seed: 1 },
      null, // guest never entered Arena for t2 → nothing to copy
    ];
    expect(planSeedTransfer(NEW_UID, anon)).toEqual([
      { docId: "google-uid_t1", seed: 1 },
    ]);
  });

  it("returns nothing when the guest had no seeds at all", () => {
    expect(planSeedTransfer(NEW_UID, [])).toEqual([]);
    expect(planSeedTransfer(NEW_UID, [null, null])).toEqual([]);
  });
});
