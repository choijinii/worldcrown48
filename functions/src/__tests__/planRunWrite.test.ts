/**
 * planRunWrite — onVote 트랜잭션이 "무엇을 쓸지" 정하는 순수 부분.
 *
 * Firestore 없이 검증하고, onCall 래퍼는 이 결과를 그대로 옮겨 적기만 한다.
 * 카운트 시점은 **그 판의 첫 선택**이다(핸드오프 §5 DO 4 주석, 2026-09-05 대표 확정) —
 * 미완주 판은 continue로만 재진입되므로 "카드 없이 판만 태우는" 구멍이 구조적으로 없고,
 * 들어왔다 바로 나간 팬에게 한 판을 태우지 않는다.
 */
import { describe, expect, it } from "vitest";
import { planRunWrite } from "../core/planRunWrite";

const TODAY = "2026-09-06";
const TID = "gen4_idol_48";

describe("planRunWrite", () => {
  it("① 새 판이면 회차·오늘 판 수·날짜를 갱신한다", () => {
    const p = planRunWrite({
      decision: { status: "new_run", runIndex: 3 },
      todayKST: TODAY,
      tournamentId: TID,
      runsTodayBefore: 2, // 오늘 2판을 썼고 지금이 3판째다
    });
    expect(p).toEqual({
      runIndex: 3,
      tournamentRuns: { runIndex: 3, runsToday: 3, lastRunDate: TODAY },
      guestRuns: { runsToday: 1, lastRunDate: TODAY, tournamentId: TID },
    });
  });

  it("② 어제 5판을 썼어도 오늘의 첫 판이면 오늘 판 수가 1로 시작한다 (AC 7)", () => {
    // 호출자가 effectiveRunsToday로 이미 리셋한 값을 넘긴다 — 여기서 날짜를 다시 세지 않는다.
    const p = planRunWrite({
      decision: { status: "new_run", runIndex: 6 },
      todayKST: TODAY,
      tournamentId: TID,
      runsTodayBefore: 0,
    });
    expect(p.tournamentRuns).toEqual({ runIndex: 6, runsToday: 1, lastRunDate: TODAY });
  });

  it("③ 이어하기는 아무것도 쓰지 않는다 — 한도를 소모하지 않는다 (AC 8)", () => {
    const p = planRunWrite({
      decision: { status: "continue", runIndex: 2 },
      todayKST: TODAY,
      tournamentId: TID,
      runsTodayBefore: 2,
    });
    expect(p).toEqual({ runIndex: 2, tournamentRuns: null, guestRuns: null });
  });

  it("④ 게스트 판 수는 Tournament를 가로질러 센다 — 어느 Tournament든 오늘 1판이면 1이다", () => {
    const p = planRunWrite({
      decision: { status: "new_run", runIndex: 1 },
      todayKST: TODAY,
      tournamentId: "best_stage_48",
      guestRunsTodayBefore: 0,
    });
    expect(p.guestRuns).toEqual({
      runsToday: 1,
      lastRunDate: TODAY,
      tournamentId: "best_stage_48",
    });
  });

  it("⑤ 차단 판정을 넘기면 던진다 — 쓸 것이 없는데 쓰기 계획을 물으면 호출부가 잘못된 것이다", () => {
    expect(() =>
      planRunWrite({
        decision: { status: "limit_reached" },
        todayKST: TODAY,
        tournamentId: TID,
      }),
    ).toThrow(/limit_reached/);
    expect(() =>
      planRunWrite({
        decision: { status: "deadline_passed" },
        todayKST: TODAY,
        tournamentId: TID,
      }),
    ).toThrow(/deadline_passed/);
  });
});
