import { describe, it, expect } from "vitest";
import { buildVoteDoc, VoteValidationError } from "../core/voteRecord";
import { decideRun, effectiveRunsToday } from "../_run/decideRun";
import { planRunWrite } from "../core/planRunWrite";

const valid = {
  userId: "u1",
  tournamentId: "t1",
  round: 1,
  matchId: "t1:r1:m0",
  contestantId: "c1",
  date: "2026-06-22",
  // RUN-1: 모든 vote는 어느 판의 선택인지 싣는다. onVote가 회차를 확정해 넘긴다.
  runIndex: 1,
  // v2.1: 게스트의 선택인지. onVote가 sign_in_provider 로 판정해 넘긴다.
  isGuest: false,
};

describe("buildVoteDoc", () => {
  it("builds a vote doc from a valid input", () => {
    expect(buildVoteDoc(valid)).toEqual(valid);
  });

  it("rejects a round outside 1..5", () => {
    expect(() => buildVoteDoc({ ...valid, round: 0 })).toThrow(
      VoteValidationError,
    );
    expect(() => buildVoteDoc({ ...valid, round: 6 })).toThrow();
  });

  it("rejects a matchId that doesn't belong to the tournament+round", () => {
    expect(() => buildVoteDoc({ ...valid, matchId: "t1:r2:m0" })).toThrow(); // round mismatch
    expect(() => buildVoteDoc({ ...valid, matchId: "other:r1:m0" })).toThrow(); // tid mismatch
    expect(() => buildVoteDoc({ ...valid, matchId: "garbage" })).toThrow();
  });

  it("rejects empty userId / contestantId", () => {
    expect(() => buildVoteDoc({ ...valid, userId: "" })).toThrow();
    expect(() => buildVoteDoc({ ...valid, contestantId: "" })).toThrow();
  });

  it("rejects a malformed KST date", () => {
    expect(() => buildVoteDoc({ ...valid, date: "2026/06/22" })).toThrow();
  });
});

describe("buildVoteDoc — runIndex (RUN-1)", () => {
  const valid = {
    userId: "u1",
    tournamentId: "gen4_idol_48",
    round: 1,
    matchId: "gen4_idol_48:r1:m0",
    contestantId: "c1",
    date: "2026-09-05",
    isGuest: false,
  };

  it("① runIndex를 문서에 싣는다 — 회차의 정본은 필드다 (§5 DO 1)", () => {
    expect(buildVoteDoc({ ...valid, runIndex: 3 }).runIndex).toBe(3);
  });

  it("② 1 미만은 거부하고, 6 이상도 받는다 — 회차는 평생 누적 번호다 (2026-11-02 사고)", () => {
    // 참가 규칙 v2.0 = 계정·대회·하루 5판. 평생 상한이 아니다 — 하루 한도는 decideRun 이 막는다.
    expect(() => buildVoteDoc({ ...valid, runIndex: 0 })).toThrow(VoteValidationError);
    expect(() => buildVoteDoc({ ...valid, runIndex: -1 })).toThrow(VoteValidationError);
    expect(buildVoteDoc({ ...valid, runIndex: 6 }).runIndex).toBe(6);
    expect(buildVoteDoc({ ...valid, runIndex: 37 }).runIndex).toBe(37);
  });

  it("③ 정수가 아니면 거부한다", () => {
    expect(() => buildVoteDoc({ ...valid, runIndex: 1.5 })).toThrow(VoteValidationError);
    expect(() => buildVoteDoc({ ...valid, runIndex: Number.NaN })).toThrow(VoteValidationError);
  });

  it("④ 1회차와 5회차 경계는 통과한다", () => {
    expect(buildVoteDoc({ ...valid, runIndex: 1 }).runIndex).toBe(1);
    expect(buildVoteDoc({ ...valid, runIndex: 5 }).runIndex).toBe(5);
  });
});

describe("isGuest (v2.1) — 게스트의 선택을 랭킹에서 뺄 수 있게 하는 표식", () => {
  it("① 익명이면 true 로 기록된다", () => {
    expect(buildVoteDoc({ ...valid, isGuest: true }).isGuest).toBe(true);
  });

  it("② 로그인 계정이면 false 로 기록된다", () => {
    expect(buildVoteDoc({ ...valid, isGuest: false }).isGuest).toBe(false);
  });

  it("③ 불리언이 아니면 거부한다 — 이 필드는 랭킹 집계가 읽는다", () => {
    // 값이 흐릿하면 PR 3의 필터가 조용히 빗나간다. 문자열 "false" 는 truthy라 특히 위험하다.
    expect(() =>
      buildVoteDoc({ ...valid, isGuest: "false" as unknown as boolean }),
    ).toThrow(VoteValidationError);
    expect(() =>
      buildVoteDoc({ ...valid, isGuest: undefined as unknown as boolean }),
    ).toThrow(VoteValidationError);
  });

  it("④ PR 2 이후 기록은 전부 이 필드를 갖는다 (§16 실측 1)", () => {
    // 필드가 없으면 PR 2 이후 기록도 게스트인지 구분할 수 없다 — 그래서 PR 3이 아니라 PR 2다.
    expect(buildVoteDoc(valid)).toHaveProperty("isGuest");
  });
});

// 2026-11-02 운영 사고(원장 D-52): 한 대회에서 6번째 판의 첫 선택이 거절됐다.
// onVote 트랜잭션과 같은 순서(decideRun → planRunWrite → buildVoteDoc)로 순수 함수만 돌린다.
describe("6번째 판 — 하루 한도는 decideRun, 회차 번호는 상한 없음 (RUN-1 · 참가 규칙 v2.0)", () => {
  const vote = {
    userId: "u1",
    tournamentId: "t1",
    round: 1,
    matchId: "t1:r1:m0",
    contestantId: "c1",
    isGuest: false,
  };

  it("어제까지 5판(5회차 완주) + 오늘 첫 새 판 = 6회차로 받는다", () => {
    const stored = { runIndex: 5, runsToday: 2, lastRunDate: "2026-10-05" };
    const today = "2026-11-02";
    const decision = decideRun({
      ...stored,
      todayKST: today,
      currentRunComplete: true,
      deadlinePassed: false,
    });
    expect(decision).toEqual({ status: "new_run", runIndex: 6 });

    const plan = planRunWrite({
      decision,
      todayKST: today,
      runsTodayBefore: effectiveRunsToday({ ...stored, todayKST: today }),
    });
    expect(plan.tournamentRuns).toEqual({ runIndex: 6, runsToday: 1, lastRunDate: today });

    const doc = buildVoteDoc({ ...vote, date: today, runIndex: plan.runIndex });
    expect(doc.runIndex).toBe(6);
  });

  it("같은 날 5판을 다 쓴 뒤 6번째 새 판은 decideRun 이 막는다", () => {
    const today = "2026-11-02";
    const decision = decideRun({
      runIndex: 5,
      runsToday: 5,
      lastRunDate: today,
      todayKST: today,
      currentRunComplete: true,
      deadlinePassed: false,
    });
    expect(decision).toEqual({ status: "limit_reached" });
    // 막힌 판정은 쓸 것이 없다 — vote 문서까지 가지 않는다.
    expect(() => planRunWrite({ decision, todayKST: today, runsTodayBefore: 5 })).toThrow();
  });
});
