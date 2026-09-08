/**
 * resolveActiveRun — 아레나 화면이 그릴 상태 한 덩어리 (AC 1·2·6·7·8·9·16).
 *
 * 게이트·화면·구독이 각자 회차를 판정하면 §9 함정 5(두 판정이 어긋나면 P0)가 클라이언트
 * 안에서 재현된다. 그래서 판정은 여기 하나뿐이고 페이지는 출력을 그리기만 한다.
 *
 * 시계를 읽지 않는다 — `todayKST`·`deadlinePassed` 를 주입받는다(§3.0 조건 2).
 */
import { describe, expect, it } from "vitest";
import { resolveActiveRun, type ActiveRunFacts } from "@/lib/run/activeRun";

const TODAY = "2026-09-09";
const YESTERDAY = "2026-09-08";

const base: ActiveRunFacts = {
  runIndex: 0,
  legacyRunExists: false,
  lastRunDate: null,
  runsToday: 0,
  currentRunComplete: false,
  deadlinePassed: false,
  todayKST: TODAY,
  isAnonymous: false,
  guestLastRunDate: null,
  guestRunsToday: 0,
};

describe("첫 진입 · 이어하기", () => {
  it("한 판도 안 돈 팬은 1회차를 시작한다", () => {
    const s = resolveActiveRun(base);
    expect(s.screen).toBe("play");
    expect(s.displayRunIndex).toBe(1);
    expect(s.runsToday).toBe(0);
    expect(s.limit).toBe(5);
  });

  it("미완주 판은 그 회차를 이어한다 — 새 판이 아니다 (AC 8)", () => {
    const s = resolveActiveRun({
      ...base, runIndex: 3, lastRunDate: TODAY, runsToday: 3, currentRunComplete: false,
    });
    expect(s.screen).toBe("play");
    expect(s.displayRunIndex).toBe(3);
  });

  it("옛 문서(회차 필드 없음)를 가진 계정은 1회차로 집는다 (AC 11)", () => {
    // 폴백 분기가 아니라 §3.0 B안의 구조 — 접미사 없는 옛 문서가 곧 1회차 문서다.
    const s = resolveActiveRun({
      ...base, runIndex: 0, legacyRunExists: true, currentRunComplete: false,
    });
    expect(s.displayRunIndex).toBe(1);
    expect(s.screen).toBe("play");
  });
});

describe("완주 화면 (AC 1·4·5)", () => {
  it("완주하면 그 회차의 카드를 보여주고 다음 판을 열어 준다", () => {
    const s = resolveActiveRun({
      ...base, runIndex: 1, lastRunDate: TODAY, runsToday: 1, currentRunComplete: true,
    });
    expect(s.screen).toBe("complete");
    expect(s.displayRunIndex).toBe(1);
    expect(s.nextRunIndex).toBe(2);
    expect(s.canPlayAgain).toBe(true);
    expect(s.runsToday).toBe(1);
    expect(s.blockedReason).toBeNull();
  });

  it("5판을 소진하면 완주 화면은 남고 버튼만 잠긴다 (AC 1)", () => {
    const s = resolveActiveRun({
      ...base, runIndex: 5, lastRunDate: TODAY, runsToday: 5, currentRunComplete: true,
    });
    expect(s.screen).toBe("complete");
    expect(s.canPlayAgain).toBe(false);
    expect(s.blockedReason).toBe("daily_limit");
    expect(s.runsToday).toBe(5);
  });

  it("자정이 지나면 5판이 다시 채워진다 (AC 7)", () => {
    const s = resolveActiveRun({
      ...base, runIndex: 5, lastRunDate: YESTERDAY, runsToday: 5, currentRunComplete: true,
    });
    expect(s.canPlayAgain).toBe(true);
    expect(s.runsToday).toBe(0);
    expect(s.nextRunIndex).toBe(6); // 회차는 누적이라 되감기지 않는다
  });
});

describe("마감 (AC 9·16)", () => {
  it("한 판도 안 돈 팬의 첫 진입에도 안내가 뜬다 (AC 16)", () => {
    const s = resolveActiveRun({ ...base, deadlinePassed: true });
    expect(s.screen).toBe("deadline_passed");
  });

  it("진행 중인 판은 마감돼도 이어갈 수 있다 (AC 9)", () => {
    const s = resolveActiveRun({
      ...base, runIndex: 2, currentRunComplete: false, deadlinePassed: true,
    });
    expect(s.screen).toBe("play");
    expect(s.displayRunIndex).toBe(2);
  });

  it("마감된 대회의 완주 화면은 남고 [다시 참여]만 잠긴다", () => {
    const s = resolveActiveRun({
      ...base, runIndex: 1, lastRunDate: TODAY, runsToday: 1,
      currentRunComplete: true, deadlinePassed: true,
    });
    expect(s.screen).toBe("complete");
    expect(s.canPlayAgain).toBe(false);
    expect(s.blockedReason).toBe("deadline_passed");
  });
});

describe("게스트 (AC 6·17)", () => {
  const guest = { ...base, isAnonymous: true };

  it("게스트 한도는 3이다", () => {
    expect(resolveActiveRun(guest).limit).toBe(3);
  });

  it("게스트는 대회를 가로질러 센다 — 이 대회 0판이어도 오늘 3판이면 막힌다", () => {
    const s = resolveActiveRun({
      ...guest, guestLastRunDate: TODAY, guestRunsToday: 3,
    });
    expect(s.screen).toBe("guest_limit");
    expect(s.runsToday).toBe(3);
  });

  it("3판을 다 써도 미완주 판은 이어할 수 있다 (AC 6)", () => {
    const s = resolveActiveRun({
      ...guest, runIndex: 1, currentRunComplete: false,
      guestLastRunDate: TODAY, guestRunsToday: 3,
    });
    expect(s.screen).toBe("play");
  });

  it("완주 후 남은 판이 있으면 다시 참여할 수 있다", () => {
    const s = resolveActiveRun({
      ...guest, runIndex: 1, currentRunComplete: true,
      lastRunDate: TODAY, runsToday: 1,
      guestLastRunDate: TODAY, guestRunsToday: 1,
    });
    expect(s.screen).toBe("complete");
    expect(s.canPlayAgain).toBe(true);
    expect(s.runsToday).toBe(1);
    expect(s.limit).toBe(3);
  });

  it("3판을 쓰고 완주한 게스트는 버튼이 잠기고 이유가 guest_limit 이다", () => {
    const s = resolveActiveRun({
      ...guest, runIndex: 1, currentRunComplete: true,
      lastRunDate: TODAY, runsToday: 1,
      guestLastRunDate: TODAY, guestRunsToday: 3,
    });
    expect(s.screen).toBe("complete");
    expect(s.canPlayAgain).toBe(false);
    expect(s.blockedReason).toBe("guest_limit");
  });

  it("로그인 팬은 게스트 원장을 보지 않는다", () => {
    const s = resolveActiveRun({
      ...base, guestLastRunDate: TODAY, guestRunsToday: 3,
    });
    expect(s.screen).toBe("play");
    expect(s.limit).toBe(5);
  });
});
