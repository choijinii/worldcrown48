import { describe, it, expect } from "vitest";
import {
  advanceRoundDecision,
  nextRound,
} from "../core/advanceRoundCore";
import { runDocId } from "../_run/runDocId";

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

/**
 * RUN-1 §9 함정 9 — 회귀 잠금.
 *
 * 트리거 배선(Firestore 쿼리)이라 순수 단위 RED를 만들 수 없다. 실동작은 Task 14
 * (에뮬레이터 실측)와 §7 0단계(프리뷰 1판 완주)가 검증한다. 여기 잠그는 것은
 * 문서 이름 규칙이 나중에 조용히 바뀌지 않는다는 것뿐이다.
 */
describe("advanceRound — 회차별 진행 문서 (RUN-1, §9 함정 9)", () => {
  it("① 1회차 진행 문서는 현행 이름 그대로다 — 옛 화면이 계속 구독한다", () => {
    expect(runDocId("u1", "gen4_idol_48", 1)).toBe("u1_gen4_idol_48");
  });

  it("② 회차가 다르면 진행 문서가 다르다 — 판마다 진행이 따로 쌓인다", () => {
    expect(runDocId("u1", "gen4_idol_48", 2)).toBe("u1_gen4_idol_48_r2");
  });
});
