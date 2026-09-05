/**
 * 게스트 한도 — 비로그인은 하루 **통틀어** 1판 (§5 DO 3).
 *
 * Tournament를 가로지르는 값이라 Tournament별 문서로는 못 센다 → `guest_runs/{uid}` 하나로 센다.
 * (회차 번호 자체는 게스트도 `tournament_runs` 에서 받는다 — 설계서 §1.4. 같은 브라우저의
 * 익명 계정은 유지되므로 내일 같은 Tournament를 또 돌면 그건 2회차다.)
 *
 * 자정 리셋은 `tournament_runs` 와 문자 그대로 같은 방식이다(읽을 때 날짜 비교) — §3.0 조건 3.
 * 날짜를 빠뜨리면 두 방향 모두 사고다: 리셋이 없으면 게스트가 영원히 1판만 하고 막히고,
 * 한도를 안 세면 무제한이 되어 §9 함정 4(게스트 uid는 브라우저마다 새로 생기니 랭킹 조작
 * 비용이 0)로 직행한다.
 *
 * ⚠️ 이 파일은 `functions/src/_run/` 로 복사되므로 상대 경로 import만 가진다.
 */
import { effectiveRunsToday } from "./decideRun";
import { isSameKstDay } from "./kstReset";

export const GUEST_DAILY_RUN_LIMIT = 1;

export type GuestRunDecision =
  | { status: "allow" }
  | { status: "login_required" };

export function decideGuestRun(args: {
  lastRunDate: string | null;
  runsToday: number;
  runTournamentId: string | null;
  todayKST: string;
  tournamentId: string;
  currentRunComplete: boolean;
  limit?: number;
}): GuestRunDecision {
  const {
    lastRunDate,
    runsToday,
    runTournamentId,
    todayKST,
    tournamentId,
    currentRunComplete,
    limit = GUEST_DAILY_RUN_LIMIT,
  } = args;

  // 오늘의 판이 아직 남아 있다.
  if (effectiveRunsToday({ lastRunDate, runsToday, todayKST }) < limit) {
    return { status: "allow" };
  }

  // 오늘 판을 이미 썼다 — 그 판을 이어가는 것만 허용한다.
  // 막히는 두 경우(완주한 판의 재도전 · 다른 Tournament 진입)는 근본 이유가 같아서
  // 화면 문구도 하나로 묶인다(login.guest_limit — 2026-09-05 대표 확정).
  const sameRun =
    isSameKstDay(lastRunDate, todayKST) && runTournamentId === tournamentId;
  if (sameRun && !currentRunComplete) return { status: "allow" };

  return { status: "login_required" };
}
