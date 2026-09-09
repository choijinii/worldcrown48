import { describe, it, expect, beforeEach } from "vitest";
import {
  matchIdFor,
  matchesForRound,
  contestantIdsForRound,
  buildMatchesForRound,
  type ArenaVote,
} from "@/lib/arena/matches";
import type { RoundIndex } from "@/lib/arena/roundConfig";
import {
  useVoteStore,
  selectCurrentRound,
  selectCurrentMatch,
  selectIsComplete,
} from "@/lib/arena/voteStore";
import type { Contestant, Tournament } from "@/lib/types/tournament";

const TID = "t1";
const SEED = 12345;
const OTHER_SEED = 99999;

function tournament(): Tournament {
  return { id: TID } as Tournament;
}
function contestants48(): Contestant[] {
  return Array.from(
    { length: 48 },
    (_, i) => ({ id: `c${i + 1}`, order: i + 1 }) as Contestant,
  );
}

/**
 * Play an "always pick the LEFT contestant" Voter for `throughRound` rounds,
 * deriving each round's actual (seeded) pairing so the votes are internally
 * consistent with the seed.
 */
function leftVoterVotes(
  c: Contestant[],
  seed: number,
  throughRound: RoundIndex,
): ArenaVote[] {
  const votes: ArenaVote[] = [];
  for (let r = 1 as RoundIndex; r <= throughRound; r = (r + 1) as RoundIndex) {
    const participants = contestantIdsForRound(c, votes, r, seed);
    const matches = buildMatchesForRound(TID, r, participants);
    for (const m of matches) {
      votes.push({ round: r, matchId: m.matchId, contestantId: m.contestantIds[0] });
    }
  }
  return votes;
}

beforeEach(() => useVoteStore.getState().reset());

describe("voteStore", () => {
  it("starts empty (no tournament, no votes, seed 0)", () => {
    const s = useVoteStore.getState();
    expect(s.votes).toEqual([]);
    expect(s.tournament).toBeNull();
    expect(s.seed).toBe(0);
  });

  it("setData populates the votes cache + tournament + contestants + seed", () => {
    useVoteStore.getState().setData(tournament(), contestants48(), [], SEED);
    expect(useVoteStore.getState().contestants).toHaveLength(48);
    expect(useVoteStore.getState().seed).toBe(SEED);
  });

  it("addVote appends, and dedupes a repeat for the same matchId", () => {
    const v: ArenaVote = { round: 1, matchId: "t1:r1:m0", contestantId: "c1" };
    useVoteStore.getState().addVote(v);
    useVoteStore.getState().addVote(v); // duplicate matchId → ignored
    expect(useVoteStore.getState().votes).toHaveLength(1);
  });

  it("selectCurrentMatch is the seeded round-1 match 0", () => {
    useVoteStore.getState().setData(tournament(), contestants48(), [], SEED);
    const m = selectCurrentMatch(useVoteStore.getState());
    expect(selectCurrentRound(useVoteStore.getState())).toBe(1);
    const expected = matchesForRound(TID, contestants48(), [], 1, SEED)[0];
    expect(m).toEqual(expected);
  });

  it("is Voter-specific: a different seed yields a different first match", () => {
    const a = matchesForRound(TID, contestants48(), [], 1, SEED)[0];
    const b = matchesForRound(TID, contestants48(), [], 1, OTHER_SEED)[0];
    expect(a.contestantIds).not.toEqual(b.contestantIds);
  });

  it("recomputes the seeded bracket as votes accrue (round 2 first match)", () => {
    const c = contestants48();
    const r1 = leftVoterVotes(c, SEED, 1);
    useVoteStore.getState().setData(tournament(), c, r1, SEED);
    expect(selectCurrentRound(useVoteStore.getState())).toBe(2);
    const expected = matchesForRound(TID, c, r1, 2, SEED)[0];
    expect(selectCurrentMatch(useVoteStore.getState())).toEqual(expected);
  });

  it("selectCurrentMatch is null and isComplete is true once THE FINAL is picked", () => {
    const c = contestants48();
    const votes = leftVoterVotes(c, SEED, 5);
    useVoteStore.getState().setData(tournament(), c, votes, SEED);
    expect(selectIsComplete(useVoteStore.getState())).toBe(true);
    expect(selectCurrentMatch(useVoteStore.getState())).toBeNull();
  });
});

describe("회차 상태 (RUN-1)", () => {
  const runState = (over: Record<string, unknown> = {}) => ({
    screen: "complete" as const,
    displayRunIndex: 1,
    nextRunIndex: 2,
    runsToday: 1,
    limit: 5,
    canPlayAgain: true,
    blockedReason: null,
    ...over,
  });

  beforeEach(() => useVoteStore.getState().reset());

  it("startNextRun 은 표시 회차를 올리고 이전 판의 선택을 비운다", () => {
    // 비우지 않으면 2판째가 1판째 선택을 물려받아 시작하자마자 완주 상태가 된다(§9 함정 9).
    useVoteStore.setState({
      votes: [{ round: 1, matchId: "t1:r1:m0", contestantId: "c1" }],
      run: runState(),
      seed: 111,
    });
    useVoteStore.getState().startNextRun();
    const s = useVoteStore.getState();
    expect(s.votes).toEqual([]);
    expect(s.run?.displayRunIndex).toBe(2);
    expect(s.run?.screen).toBe("play");
  });

  it("씨앗을 0으로 되돌린다 — 새 회차 문서에서 다시 받아야 대진표가 달라진다 (AC 3)", () => {
    useVoteStore.setState({ votes: [], run: runState(), seed: 111 });
    useVoteStore.getState().startNextRun();
    expect(useVoteStore.getState().seed).toBe(0);
  });

  it("다시 참여할 수 없으면 아무것도 하지 않는다", () => {
    useVoteStore.setState({
      votes: [{ round: 1, matchId: "t1:r1:m0", contestantId: "c1" }],
      run: runState({
        displayRunIndex: 5,
        nextRunIndex: 6,
        runsToday: 5,
        canPlayAgain: false,
        blockedReason: "daily_limit",
      }),
    });
    useVoteStore.getState().startNextRun();
    expect(useVoteStore.getState().run?.displayRunIndex).toBe(5);
    expect(useVoteStore.getState().votes).toHaveLength(1);
  });

  it("회차 상태가 없으면 아무것도 하지 않는다 — 로드 전 클릭 방어", () => {
    useVoteStore.setState({ votes: [], run: null });
    expect(() => useVoteStore.getState().startNextRun()).not.toThrow();
    expect(useVoteStore.getState().run).toBeNull();
  });

  it("reset 은 회차 상태도 지운다", () => {
    useVoteStore.setState({ run: runState({ screen: "play" }) });
    useVoteStore.getState().reset();
    expect(useVoteStore.getState().run).toBeNull();
  });
});
