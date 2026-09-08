/**
 * planRunWrite — onVote 트랜잭션의 "무엇을 쓸지" 부분을 순수하게 떼어낸 것.
 *
 * Firestore 없이 테스트하고, onCall 래퍼는 이 결과를 그대로 옮겨 적기만 한다.
 * 판정(무엇을 허용할지)은 `_run/decideRun` 이고, 여기는 그 판정을 문서 쓰기로 옮기는 층이다.
 *
 * **카운트 시점은 그 판의 첫 선택이다** (핸드오프 §5 DO 4 주석, 2026-09-05 대표 확정).
 * 아레나 진입이 아니라 첫 선택인 이유: 미완주 판은 `continue` 로만 재진입되므로
 * "24강까지만 반복해 카드 없이 판만 태우는" 경로가 구조적으로 없고, 들어왔다 한 번도
 * 안 고르고 나간 팬에게 하루 5판 중 1판을 태우는 건 규칙이 아니라 사고이기 때문이다.
 *
 * 날짜를 여기서 다시 세지 않는다 — 호출자가 `effectiveRunsToday` 로 자정 리셋을 반영한
 * 값을 넘긴다. 리셋 판정은 `_run/kstReset` 한 곳에만 있다.
 *
 * **v2.1 (2026-09-06)**: `guestRuns` 에서 `tournamentId` 를 뺐다. 게스트 한도가 대회를
 * 가로지르게 되면서 "마지막 대회 하나"를 기억할 이유가 사라졌고, 남겨 두면 다음 사람이 그
 * 필드로 이어하기를 판정해 §16 실측 3의 버그(A 미완주 → B → C 3판 소진 → A 이어하기 거부)를
 * 되살린다. 쓰지 않는 필드를 지우는 것이 아니라, **되살아나면 안 되는 필드를 지우는 것이다.**
 */
import type { RunDecision } from "../_run/decideRun";

export interface RunWritePlan {
  /** 이 선택이 속한 판의 회차. vote 문서의 `runIndex` 필드가 된다. */
  runIndex: number;
  /** null이면 쓰지 않는다(이어하기 — 한도를 소모하지 않는다). */
  tournamentRuns: { runIndex: number; runsToday: number; lastRunDate: string } | null;
  /** 게스트일 때만 호출자가 사용한다. null이면 쓰지 않는다. */
  guestRuns: { runsToday: number; lastRunDate: string } | null;
}

export function planRunWrite(args: {
  decision: RunDecision;
  todayKST: string;
  /** 이 Tournament에서 오늘 이미 쓴 판 수(자정 리셋 반영). 기본 0. */
  runsTodayBefore?: number;
  /** 게스트가 오늘 이미 쓴 판 수(Tournament를 가로지른다, 자정 리셋 반영). 기본 0. */
  guestRunsTodayBefore?: number;
}): RunWritePlan {
  const {
    decision,
    todayKST,
    runsTodayBefore = 0,
    guestRunsTodayBefore = 0,
  } = args;

  // 차단 판정은 쓸 것이 없다 — 여기까지 왔다면 호출부가 거부를 안 던진 것이다.
  if (decision.status !== "new_run" && decision.status !== "continue") {
    throw new Error(`planRunWrite: 쓰기 계획이 없는 판정입니다 (${decision.status}).`);
  }

  if (decision.status === "continue") {
    return { runIndex: decision.runIndex, tournamentRuns: null, guestRuns: null };
  }

  return {
    runIndex: decision.runIndex,
    tournamentRuns: {
      runIndex: decision.runIndex,
      runsToday: runsTodayBefore + 1,
      lastRunDate: todayKST,
    },
    guestRuns: {
      runsToday: guestRunsTodayBefore + 1,
      lastRunDate: todayKST,
    },
  };
}
