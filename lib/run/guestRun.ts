/**
 * 게스트 한도 — 비로그인은 하루 **통틀어 3판** (§5 DO 3 · v2.1 2026-09-06 대표 확정).
 *
 * Tournament를 가로지르는 값이라 Tournament별 문서로는 못 센다 → `guest_runs/{uid}` 하나로 센다.
 * (회차 번호 자체는 게스트도 `tournament_runs` 에서 받는다 — 설계서 §1.4. 같은 브라우저의
 * 익명 계정은 유지되므로 내일 같은 Tournament를 또 돌면 그건 2회차다.)
 *
 * **v2.1에서 Tournament를 판정에서 뺐다 (§16 실측 3).** v2.0은 `guest_runs.tournamentId` 로
 * "마지막에 돌던 대회"를 기억해 이어하기를 판정했는데, 3판·복수 대회 구조에서는
 * A 미완주 → B → C(3판 소진) → A 이어하기가 거부된다. 이어하기는 그 Tournament의
 * `decideRun` 이 이미 `continue` 로 답하므로, 호출자가 그것을 `isContinue` 로 넘긴다.
 *
 * 자정 리셋은 `tournament_runs` 와 문자 그대로 같은 방식이다(읽을 때 날짜 비교) — §3.0 조건 3.
 * 날짜를 빠뜨리면 두 방향 모두 사고다: 리셋이 없으면 게스트가 첫날 3판을 쓴 뒤 영영 막히고,
 * 한도를 안 세면 무제한이 되어 §9 함정 4(게스트 uid는 브라우저마다 새로 생기니 랭킹 조작
 * 비용이 0)로 직행한다. v2.1은 한도를 늘리는 대신 **게스트의 선택을 랭킹에서 제외**해(PR 3)
 * 그 조작 동기 자체를 없앤다.
 *
 * ⚠️ 이 파일은 `functions/src/_run/` 로 복사되므로 상대 경로 import만 가진다.
 */
import { effectiveRunsToday } from "./decideRun";

/**
 * 비로그인 Voter가 하루(KST) **통틀어** 돌 수 있는 판 수.
 *
 * **이 숫자는 여기에만 있다** (§5 DO 3). 대회 수가 늘어도 3판 고정이며, MVP1.5에서 유저 생성
 * Tournament가 열려도 늘지 않는다 (LANGUAGE.md §2 게스트 일일 판 한도).
 */
export const GUEST_DAILY_RUN_LIMIT = 3;

export type GuestRunDecision =
  | { status: "allow" }
  | { status: "login_required" };

export function decideGuestRun(args: {
  lastRunDate: string | null;
  runsToday: number;
  todayKST: string;
  /** 그 Tournament의 `decideRun` 결과가 `continue` 인가 — 이어하기는 한도를 쓰지 않는다. */
  isContinue: boolean;
  limit?: number;
}): GuestRunDecision {
  const {
    lastRunDate,
    runsToday,
    todayKST,
    isContinue,
    limit = GUEST_DAILY_RUN_LIMIT,
  } = args;

  // ① 진행 중인 판은 한도와 무관하게 이어한다. 3판을 다 쓴 뒤 미완주 대회로 돌아와도 마찬가지다
  //    (AC 6: A 미완주 → B → C 3판 소진 → A 이어하기 허용).
  if (isContinue) return { status: "allow" };

  // ② 오늘의 판이 남아 있는가. 저장된 날짜가 오늘이 아니면 그날 값은 없는 것으로 읽는다(AC 7).
  if (effectiveRunsToday({ lastRunDate, runsToday, todayKST }) < limit) {
    return { status: "allow" };
  }

  // ③ 소진. 막히는 모든 경우가 같은 이유(오늘 3판을 다 썼다)라 화면 문구도 하나로 묶인다
  //    — login.guest_limit, Google 버튼이 함께 뜨는 전환 지점이다 (AC 17).
  return { status: "login_required" };
}
