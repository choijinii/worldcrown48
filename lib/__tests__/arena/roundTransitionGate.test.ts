/**
 * RUN-FIX-1 — "이미 본 라운드 전환 안내"는 판(회차) 단위다.
 *
 * 결함(2026-11-25 대표 실측): [다시 참여]는 페이지를 언마운트하지 않아서, 1판째 끝에 5(THE FINAL)까지
 * 올라간 "이미 본 안내 번호"가 2판째에도 남았다 → 2판째의 24강·12강·6강·결승 안내가 전부 건너뛰어졌다.
 */
import { describe, expect, it } from "vitest";
import {
  NO_DISMISSED_ROUND,
  completedRunKey,
  dismissRound,
  eventForRun,
  shouldShowRoundTransition,
} from "@/lib/arena/roundTransitionGate";

describe("shouldShowRoundTransition — 판 단위 '이미 본 안내'", () => {
  it("1판째: 처음 보는 라운드는 뜨고, 닫은 뒤 같은 라운드는 다시 안 뜬다", () => {
    expect(shouldShowRoundTransition({ fromRound: 1, toRound: 2 }, NO_DISMISSED_ROUND, 1)).toBe(true);
    const d = dismissRound(1, 2);
    expect(shouldShowRoundTransition({ fromRound: 1, toRound: 2 }, d, 1)).toBe(false);
    expect(shouldShowRoundTransition({ fromRound: 2, toRound: 3 }, d, 1)).toBe(true);
  });

  it("1판째를 결승(5)까지 닫은 뒤 2판째가 시작되면 toRound 2 가 다시 뜬다 (결함 재현)", () => {
    let d = NO_DISMISSED_ROUND;
    for (const to of [2, 3, 4, 5]) d = dismissRound(1, to);
    expect(shouldShowRoundTransition({ fromRound: 1, toRound: 2 }, d, 2)).toBe(true);
    for (const to of [3, 4, 5]) {
      expect(shouldShowRoundTransition({ fromRound: to - 1, toRound: to }, d, 2)).toBe(true);
    }
  });

  it("3판째도 같다 — 2판째에 닫은 기록이 3판째를 막지 않는다", () => {
    let d = NO_DISMISSED_ROUND;
    for (const to of [2, 3, 4, 5]) d = dismissRound(2, to);
    expect(shouldShowRoundTransition({ fromRound: 1, toRound: 2 }, d, 3)).toBe(true);
  });

  it("완주 이벤트 · 라운드 없음 · 회차 모름에서는 뜨지 않는다", () => {
    expect(shouldShowRoundTransition({ toRound: 5, complete: true }, NO_DISMISSED_ROUND, 1)).toBe(false);
    expect(shouldShowRoundTransition({}, NO_DISMISSED_ROUND, 1)).toBe(false);
    expect(shouldShowRoundTransition(null, NO_DISMISSED_ROUND, 1)).toBe(false);
    expect(shouldShowRoundTransition({ toRound: 2 }, NO_DISMISSED_ROUND, undefined)).toBe(true);
  });
});

describe("eventForRun — 다른 판의 진행 문서 이벤트는 돌려주지 않는다", () => {
  it("저장된 이벤트의 판 키가 지금 판과 같을 때만 돌려준다", () => {
    const stored = { key: "u_t_r1", event: { complete: true, championId: "c1" } };
    expect(eventForRun(stored, "u_t_r1")).toEqual({ complete: true, championId: "c1" });
    // [다시 참여] 직후 — 2판째 문서를 아직 못 받은 한 렌더 동안 1판째 완주 이벤트가 새지 않는다.
    expect(eventForRun(stored, "u_t_r2")).toBeNull();
    expect(eventForRun(stored, null)).toBeNull();
  });
});

describe("completedRunKey — 완주 뒤 판 숫자 다시 읽기는 판마다 한 번 (RUN-FIX-2)", () => {
  it("같은 Champion이라도 판이 다르면 다른 열쇠다", () => {
    expect(completedRunKey(1, "c1")).not.toBe(completedRunKey(2, "c1"));
    expect(completedRunKey(2, "c1")).toBe(completedRunKey(2, "c1"));
    expect(completedRunKey(2, "c1")).not.toBe(completedRunKey(2, "c2"));
  });
});
