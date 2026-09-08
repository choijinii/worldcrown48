/**
 * resolveActiveRun — 아레나 화면이 그릴 상태를 한 번에 정한다 (AC 1·2·6·7·8·9·16).
 *
 * 왜 한 곳인가. 게이트(`voteGate`)·화면(`page.tsx`)·구독(`useRoundTransition`)·
 * 씨앗(`bracketSeed`)이 전부 회차를 알아야 한다. 각자 판정하면 §9 함정 5(두 판정이 어긋나면
 * P0)가 클라이언트 내부에서 재현된다 — 게이트는 2회차라고 믿는데 화면은 1회차를 그리는 식.
 * 그래서 판정은 여기 하나뿐이고, `voteStore` 가 이 출력을 실어 나르며, 페이지는 그리기만 한다.
 *
 * 서버와의 정합은 `decideRun`·`decideGuestRun` 을 **그대로 호출**해서 얻는다. 이 파일은 그 둘을
 * 조합해 "화면이 필요로 하는 모양"으로 바꾸는 층이지, 새로운 판정을 만들지 않는다.
 *
 * ⚠️ 이 파일은 `functions/src/_run/` 로 복사되므로 상대 경로 import만 가진다.
 */
import {
  DAILY_RUN_LIMIT,
  decideRun,
  effectiveRunsToday,
  normalizeRunIndex,
} from "./decideRun";
import { decideGuestRun, GUEST_DAILY_RUN_LIMIT } from "./guestRun";

export type ArenaRunScreen =
  | "play"
  | "complete"
  | "daily_limit"
  | "guest_limit"
  | "deadline_passed";

export interface ActiveRunFacts {
  /** `tournament_runs.runIndex` (문서가 없으면 0). */
  runIndex: number;
  /** 접미사 없는 옛 `roundProgress` 가 있는가 — 있으면 그게 1회차다 (AC 11). */
  legacyRunExists: boolean;
  lastRunDate: string | null;
  runsToday: number;
  /** `roundProgress/{uid}_{tid}[_r{n}]`.complete === true */
  currentRunComplete: boolean;
  deadlinePassed: boolean;
  todayKST: string;
  isAnonymous: boolean;
  /** `guest_runs/{uid}` — 게스트만 쓴다. 대회를 가로지른다. */
  guestLastRunDate: string | null;
  guestRunsToday: number;
}

export interface ActiveRunState {
  screen: ArenaRunScreen;
  /** 화면이 그릴 회차 — votes 필터 · 씨앗 · roundProgress 구독이 전부 이 값을 쓴다. */
  displayRunIndex: number;
  /** [다시 참여] 가 열 회차. */
  nextRunIndex: number;
  /** 팬에게 보이는 숫자 n — 오늘 쓴 판 수(자정 리셋 반영). 누적 회차가 아니다. */
  runsToday: number;
  /** 로그인 5 · 게스트 3. */
  limit: number;
  canPlayAgain: boolean;
  blockedReason: "daily_limit" | "guest_limit" | "deadline_passed" | null;
}

export function resolveActiveRun(facts: ActiveRunFacts): ActiveRunState {
  const runIndex = normalizeRunIndex({
    runIndex: facts.runIndex,
    legacyRunExists: facts.legacyRunExists,
  });

  const runDecision = decideRun({
    runIndex,
    lastRunDate: facts.lastRunDate,
    runsToday: facts.runsToday,
    todayKST: facts.todayKST,
    currentRunComplete: facts.currentRunComplete,
    deadlinePassed: facts.deadlinePassed,
  });
  const isContinue = runDecision.status === "continue";

  // 게스트 한도는 이 Tournament가 아니라 `guest_runs` 로 센다 — 대회를 가로지른다.
  const guestDecision = facts.isAnonymous
    ? decideGuestRun({
        lastRunDate: facts.guestLastRunDate,
        runsToday: facts.guestRunsToday,
        todayKST: facts.todayKST,
        isContinue,
      })
    : ({ status: "allow" } as const);
  const guestBlocked = guestDecision.status === "login_required";

  const limit = facts.isAnonymous ? GUEST_DAILY_RUN_LIMIT : DAILY_RUN_LIMIT;
  const runsToday = effectiveRunsToday(
    facts.isAnonymous
      ? {
          lastRunDate: facts.guestLastRunDate,
          runsToday: facts.guestRunsToday,
          todayKST: facts.todayKST,
        }
      : {
          lastRunDate: facts.lastRunDate,
          runsToday: facts.runsToday,
          todayKST: facts.todayKST,
        },
  );

  // 회차 0(= 아직 한 판도 안 돈 계정)도 화면은 1회차를 그린다. 실제 카운트는 첫 선택 때
  // 서버가 한다(§5 DO 4의 구현 정의) — 들어왔다 안 고르고 나가면 아무것도 소모되지 않는다.
  const displayRunIndex = runIndex === 0 ? 1 : runIndex;
  const nextRunIndex = runIndex + 1;

  // 새 판을 열 수 있는가 — 마감·한도·게스트 한도가 모두 통과해야 한다.
  const canPlayAgain = runDecision.status === "new_run" && !guestBlocked;
  const blockedReason: ActiveRunState["blockedReason"] = canPlayAgain
    ? null
    : guestBlocked
      ? "guest_limit"
      : runDecision.status === "deadline_passed"
        ? "deadline_passed"
        : runDecision.status === "limit_reached"
          ? "daily_limit"
          : null;

  const common = {
    displayRunIndex,
    nextRunIndex,
    runsToday,
    limit,
    canPlayAgain,
    blockedReason,
  };

  // ① 진행 중인 판이 최우선이다 — 마감도 한도도 이걸 막지 않는다(AC 8·9).
  //    이어하는 중에는 [다시 참여]가 없으므로 canPlayAgain 은 꺼 둔다.
  if (isContinue) {
    return { ...common, screen: "play", canPlayAgain: false, blockedReason: null };
  }

  // ② 완주한 판이 있으면 그 카드를 계속 보여준다. 막힘은 버튼에만 반영한다 —
  //    완주 화면을 차단 화면으로 바꿔 버리면 팬이 방금 만든 Crown Card를 못 본다.
  if (runIndex > 0 && facts.currentRunComplete) {
    return { ...common, screen: "complete" };
  }

  // ③ 한 판도 안 돈(또는 카운트 전인) 팬에게는 막힌 이유를 화면으로 말한다.
  //    게스트 한도가 먼저다 — 대회를 가로지르는 한도라 "이 대회의 사정"보다 상위이고,
  //    서버(`onVote`)의 차단 순서와도 같아야 화면과 서버가 같은 이유를 말한다.
  if (guestBlocked) return { ...common, screen: "guest_limit" };
  if (runDecision.status === "deadline_passed") {
    return { ...common, screen: "deadline_passed" };
  }
  if (runDecision.status === "limit_reached") {
    return { ...common, screen: "daily_limit" };
  }

  return { ...common, screen: "play" };
}
