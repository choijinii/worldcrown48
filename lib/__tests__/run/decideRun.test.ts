/**
 * decideRun — 회차·한도·마감을 판정하는 순수 함수. 클라이언트와 서버가 같은 코드를 돌린다.
 *
 * 핸드오프 §3.0 판정 순서:
 *   ① 진행 중인 판이 있으면 continue (마감·한도와 무관하게 이어간다)
 *   ② 마감 → deadline_passed  ③ 오늘 판 수가 한도 이상 → limit_reached  ④ 그 외 new_run
 *
 * 시계는 절대 읽지 않는다 — todayKST 를 주입받는다 (§3.0 조건 2).
 */
import { describe, expect, it } from "vitest";
import {
  DAILY_RUN_LIMIT,
  decideRun,
  effectiveRunsToday,
  normalizeRunIndex,
} from "@/lib/run/decideRun";

const TODAY = "2026-09-05";
const YESTERDAY = "2026-09-04";

/** 판을 한 번도 안 돈 로그인 Voter의 기본 사실관계. */
const base = {
  runIndex: 0,
  lastRunDate: null as string | null,
  runsToday: 0,
  todayKST: TODAY,
  currentRunComplete: false,
  deadlinePassed: false,
};

describe("normalizeRunIndex — 전환 시점의 유일한 옛 데이터 처리 (AC 11)", () => {
  it("① tournament_runs가 있으면 그 값을 그대로 쓴다", () => {
    expect(normalizeRunIndex({ runIndex: 3, legacyRunExists: true })).toBe(3);
  });

  it("② 배포 직후: 문서는 없는데 접미사 없는 옛 판이 있으면 1회차로 본다", () => {
    // 이게 없으면 '새 판 = 1회차'로 판정돼 완주된 1회차 문서 위로 다시 들어간다.
    expect(normalizeRunIndex({ runIndex: 0, legacyRunExists: true })).toBe(1);
  });

  it("③ 문서도 옛 판도 없으면 0 — 아직 한 판도 안 돌았다", () => {
    expect(normalizeRunIndex({ runIndex: 0, legacyRunExists: false })).toBe(0);
  });
});

describe("effectiveRunsToday — KST 자정 리셋 (AC 7)", () => {
  it("④ 날짜가 오늘이면 저장된 값을 그대로", () => {
    expect(effectiveRunsToday({ lastRunDate: TODAY, runsToday: 3, todayKST: TODAY })).toBe(3);
  });

  it("⑤ 날짜가 어제면 0 — 자정에 5판이 다시 채워진다", () => {
    expect(effectiveRunsToday({ lastRunDate: YESTERDAY, runsToday: 5, todayKST: TODAY })).toBe(0);
  });

  it("⑥ 문서가 없으면 0", () => {
    expect(effectiveRunsToday({ lastRunDate: null, runsToday: 0, todayKST: TODAY })).toBe(0);
  });
});

describe("decideRun", () => {
  it("⑦ 첫 판은 1회차 새 판이다", () => {
    expect(decideRun(base)).toEqual({ status: "new_run", runIndex: 1 });
  });

  it("⑧ 완주한 뒤에는 다음 회차 새 판 (AC 1)", () => {
    const r = decideRun({
      ...base, runIndex: 2, lastRunDate: TODAY, runsToday: 2, currentRunComplete: true,
    });
    expect(r).toEqual({ status: "new_run", runIndex: 3 });
  });

  it("⑨ 미완주 판은 이어한다 — 새 판이 아니고 한도를 안 쓴다 (AC 8)", () => {
    const r = decideRun({
      ...base, runIndex: 2, lastRunDate: TODAY, runsToday: 2, currentRunComplete: false,
    });
    expect(r).toEqual({ status: "continue", runIndex: 2 });
  });

  it("⑩ 오늘 5판을 다 쓰면 6판째는 막힌다 (AC 1)", () => {
    const r = decideRun({
      ...base, runIndex: 5, lastRunDate: TODAY, runsToday: 5, currentRunComplete: true,
    });
    expect(r).toEqual({ status: "limit_reached" });
  });

  it("⑪ 자정이 지나면 5판이 다시 채워지고 회차는 이어진다 (AC 7)", () => {
    // 어제 5판을 다 썼다. 오늘 6회차 새 판이 열려야 한다 — 회차는 되감기지 않는다.
    const r = decideRun({
      ...base, runIndex: 5, lastRunDate: YESTERDAY, runsToday: 5, currentRunComplete: true,
    });
    expect(r).toEqual({ status: "new_run", runIndex: 6 });
  });

  it("⑫ 마감된 Tournament는 새 판을 못 연다 (AC 9)", () => {
    const r = decideRun({
      ...base, runIndex: 1, lastRunDate: TODAY, runsToday: 1,
      currentRunComplete: true, deadlinePassed: true,
    });
    expect(r).toEqual({ status: "deadline_passed" });
  });

  it("⑬ 마감돼도 진행 중인 판은 이어간다 — 마감 직전 시작한 팬을 중간에 끊지 않는다 (AC 9)", () => {
    const r = decideRun({
      ...base, runIndex: 1, lastRunDate: TODAY, runsToday: 1,
      currentRunComplete: false, deadlinePassed: true,
    });
    expect(r).toEqual({ status: "continue", runIndex: 1 });
  });

  it("⑭ 한도를 다 써도 진행 중인 판은 이어간다", () => {
    const r = decideRun({
      ...base, runIndex: 5, lastRunDate: TODAY, runsToday: 5, currentRunComplete: false,
    });
    expect(r).toEqual({ status: "continue", runIndex: 5 });
  });

  it("⑮ 한도는 테스트에서 바꿀 수 있고 기본값은 5다", () => {
    expect(DAILY_RUN_LIMIT).toBe(5);
    const r = decideRun({
      ...base, runIndex: 1, lastRunDate: TODAY, runsToday: 1,
      currentRunComplete: true, limit: 1,
    });
    expect(r).toEqual({ status: "limit_reached" });
  });

  it("⑯ 마감된 Tournament라도 아직 한 판도 안 돌았으면 새 판이 아니라 마감 안내다 (AC 16)", () => {
    // 한 판도 안 돈 팬(runIndex 0)이 마감된 Tournament에 들어온 경우.
    expect(decideRun({ ...base, deadlinePassed: true })).toEqual({ status: "deadline_passed" });
  });
});
