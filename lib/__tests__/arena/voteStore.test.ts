import { describe, it, expect, beforeEach } from "vitest";
import { matchIdFor, type ArenaVote } from "@/lib/arena/matches";
import {
  useVoteStore,
  selectCurrentRound,
  selectCurrentMatch,
  selectIsComplete,
} from "@/lib/arena/voteStore";
import type { Contestant, Tournament } from "@/lib/types/tournament";

const TID = "t1";

function tournament(): Tournament {
  return { id: TID } as Tournament;
}
function contestants48(): Contestant[] {
  return Array.from(
    { length: 48 },
    (_, i) => ({ id: `c${i + 1}`, order: i + 1 }) as Contestant,
  );
}
function leftPicks(round: number, ids: string[], n: number): ArenaVote[] {
  return Array.from({ length: n }, (_, i) => ({
    round,
    matchId: matchIdFor(TID, round, i),
    contestantId: ids[i * 2],
  }));
}

beforeEach(() => useVoteStore.getState().reset());

describe("voteStore", () => {
  it("starts empty (no tournament, no votes)", () => {
    const s = useVoteStore.getState();
    expect(s.votes).toEqual([]);
    expect(s.tournament).toBeNull();
  });

  it("setData populates the votes cache + tournament + contestants", () => {
    useVoteStore.getState().setData(tournament(), contestants48(), []);
    expect(useVoteStore.getState().contestants).toHaveLength(48);
  });

  it("addVote appends, and dedupes a repeat for the same matchId", () => {
    const v: ArenaVote = { round: 1, matchId: "t1:r1:m0", contestantId: "c1" };
    useVoteStore.getState().addVote(v);
    useVoteStore.getState().addVote(v); // duplicate matchId → ignored
    expect(useVoteStore.getState().votes).toHaveLength(1);
  });

  it("selectCurrentMatch is computed from votes each call (round 1, match 0)", () => {
    useVoteStore.getState().setData(tournament(), contestants48(), []);
    const m = selectCurrentMatch(useVoteStore.getState());
    expect(selectCurrentRound(useVoteStore.getState())).toBe(1);
    expect(m?.matchId).toBe("t1:r1:m0");
    expect(m?.contestantIds).toEqual(["c1", "c2"]);
  });

  it("recomputes the bracket as votes accrue (round 2 first match)", () => {
    const ids = contestants48().map((c) => c.id);
    useVoteStore
      .getState()
      .setData(tournament(), contestants48(), leftPicks(1, ids, 24));
    expect(selectCurrentRound(useVoteStore.getState())).toBe(2);
    expect(selectCurrentMatch(useVoteStore.getState())?.contestantIds).toEqual([
      "c1",
      "c3",
    ]);
  });

  it("selectCurrentMatch is null and isComplete is true once THE FINAL is picked", () => {
    const ids = contestants48().map((c) => c.id);
    const votes = [
      ...leftPicks(1, ids, 24),
      ...leftPicks(2, ids, 12),
      ...leftPicks(3, ids, 6),
      ...leftPicks(4, ids, 3),
      { round: 5, matchId: matchIdFor(TID, 5, 0), contestantId: "c1" },
    ];
    useVoteStore.getState().setData(tournament(), contestants48(), votes);
    expect(selectIsComplete(useVoteStore.getState())).toBe(true);
    expect(selectCurrentMatch(useVoteStore.getState())).toBeNull();
  });
});
