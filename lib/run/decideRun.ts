/**
 * 판(Run) 판정 — 클라이언트 게이트와 서버 onVote가 **같은 코드**를 돌린다.
 *
 * §9 함정 5: 두 게이트가 어긋나면 P0다(2026-07-05 사고가 이 유형). "같은 테스트로 묶는다"보다
 * "같은 코드를 실행한다"가 강하고, 그 수단(`copy-*.mjs` 미러링)이 이미 리포에 있다.
 *
 * 시계를 읽지 않는다 — `todayKST` 를 주입받는다(§3.0 조건 2). 그래야 자정 경계가 결정적으로 테스트된다.
 *
 * ⚠️ 이 파일은 `functions/src/_run/` 로 복사되므로 상대 경로 import만 가진다.
 */
import { isSameKstDay } from "./kstReset";

/** 계정당·Tournament당·하루(KST) 판 수 상한 (LANGUAGE.md 일일 판 한도). */
export const DAILY_RUN_LIMIT = 5;

export type RunDecision =
  | { status: "continue"; runIndex: number }
  | { status: "new_run"; runIndex: number }
  | { status: "limit_reached" }
  | { status: "deadline_passed" };

/**
 * 전환 시점의 유일한 옛 데이터 처리 (AC 11).
 *
 * 배포 직후에는 아무 계정에도 `tournament_runs` 문서가 없어 회차가 0이다. 그런데 이미 1판을
 * 완주해 둔 계정이 있다 — 그대로 두면 "새 판 = 1회차"로 판정돼 **완주된 1회차 문서 위로 다시
 * 들어가** 즉시 완주 화면이 뜨고 새 카드가 안 생긴다. 접미사 없는 옛 판이 있으면 그게 1회차다.
 *
 * 폴백 분기가 아니라 회차 번호를 한 번 보정하는 것뿐이고, 그 뒤 로직은 완전히 동일하다.
 */
export function normalizeRunIndex(args: {
  runIndex: number;
  legacyRunExists: boolean;
}): number {
  if (args.runIndex > 0) return args.runIndex;
  return args.legacyRunExists ? 1 : 0;
}

/** 저장된 날짜가 오늘(KST)이 아니면 그날 판 수는 없는 것으로 읽는다 (AC 7). */
export function effectiveRunsToday(args: {
  lastRunDate: string | null;
  runsToday: number;
  todayKST: string;
}): number {
  return isSameKstDay(args.lastRunDate, args.todayKST) ? args.runsToday : 0;
}

export function decideRun(args: {
  runIndex: number;
  lastRunDate: string | null;
  runsToday: number;
  todayKST: string;
  currentRunComplete: boolean;
  deadlinePassed: boolean;
  limit?: number;
}): RunDecision {
  const {
    runIndex,
    lastRunDate,
    runsToday,
    todayKST,
    currentRunComplete,
    deadlinePassed,
    limit = DAILY_RUN_LIMIT,
  } = args;

  // ① 진행 중인 판이 있으면 언제나 이어한다 — 한도도 마감도 이걸 막지 않는다.
  //    미완주 판은 이 경로로만 재진입되므로 "카드 없이 판만 태우는" 구멍이 구조적으로 없고,
  //    마감 직전에 시작한 팬을 중간에 끊지 않는다(2026-09-05 대표 확정).
  if (runIndex > 0 && !currentRunComplete) {
    return { status: "continue", runIndex };
  }
  // ② 새 판을 여는 경우에만 마감이 걸린다.
  if (deadlinePassed) return { status: "deadline_passed" };
  // ③ 오늘 쓴 판 수가 한도에 닿았는가.
  if (effectiveRunsToday({ lastRunDate, runsToday, todayKST }) >= limit) {
    return { status: "limit_reached" };
  }
  // ④ 새 판. 회차는 누적이라 자정이 지나도 되감기지 않는다 — 어제의 문서와 겹치면
  //    create-once인 씨앗을 다시 집어 어제 대진표가 나온다(§3.0 1안이 막는 사고).
  return { status: "new_run", runIndex: runIndex + 1 };
}
