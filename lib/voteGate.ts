/**
 * Vote gate — The Arena의 클라이언트 인가 (RUN-1 v2.1).
 *
 * **게이트는 스스로 읽지 않는다.** `voteStore.loadTournament` 가 판 원장(`tournament_runs`)·
 * 게스트 원장(`guest_runs`)·진행(`roundProgress`)·마감을 한 번에 읽어 `decideRun`/
 * `decideGuestRun` 판정을 만들고, 이 함수는 그것을 화면 언어로 번역만 한다. 읽기가 두 곳이면
 * 답도 두 개가 되고 그게 §9 함정 5다(2026-07-05 사고가 정확히 이 유형이었다).
 *
 * 서버(`onVote`)가 최종 판정자이고 이건 UX용이다(§5 DO 2). 두 곳은 **같은 순수 함수**를
 * 돌리므로 같은 답에 도달한다.
 *
 * ⚠️ 폐기된 것들: HF-1의 `daily_participation`("하루 새 대회 5개")과 HF-3의 sessionStorage
 * 마커(`GUEST_RUN_TID_KEY`)·`getGuestRunState`. 규칙이 v2.0에서 **판(Run)** 기준으로 바뀌면서
 * 정의 자체가 폐기됐다 — "하루 새 대회 5개"는 LANGUAGE.md §7 금지어다. 남겨 두면 다음 사람이
 * 옛 규칙으로 되돌린다.
 */
import { useCallback } from "react";
import type { RunDecision } from "@/lib/run/decideRun";
import type { GuestRunDecision } from "@/lib/run/guestRun";
import { useAuthStore } from "./authStore";

export type VoteGateResult =
  | { status: "allowed" }
  | { status: "login_required"; reason: "vote" | "share" | "guest_limit" }
  | { status: "daily_limit_reached" }
  | { status: "deadline_passed" };

/**
 * 순수 판정. 우선순위는 서버와 **같은 순서**여야 한다 — 화면과 서버가 다른 이유를 말하면
 * 팬은 둘 중 하나를 고장으로 읽는다.
 */
export function decideVoteGate(args: {
  isAnonymous: boolean;
  runDecision: RunDecision;
  guestDecision: GuestRunDecision;
}): VoteGateResult {
  const { isAnonymous, runDecision, guestDecision } = args;

  // ① 게스트 한도가 먼저다. 대회를 가로지르는 한도라 "이 대회의 사정"보다 상위다.
  //    막히는 모든 경우가 같은 이유(오늘 3판을 다 썼다)라 문구도 하나로 묶인다 —
  //    guest_limit 은 Google 버튼이 함께 뜨는 전환 지점이다(AC 17).
  if (isAnonymous && guestDecision.status === "login_required") {
    return { status: "login_required", reason: "guest_limit" };
  }
  // ② 이어하기와 새 판은 통과. 이어하기는 마감·한도와 무관하다(AC 8·9).
  if (runDecision.status === "continue" || runDecision.status === "new_run") {
    return { status: "allowed" };
  }
  if (runDecision.status === "deadline_passed") return { status: "deadline_passed" };
  return { status: "daily_limit_reached" };
}

/**
 * 공유 게이트 — v2.1에서 **공유는 게스트에게 열렸다.** 저장(다운로드)만 로그인이 필요하다.
 * 잠금 판정 자체는 `lib/crown/crownActions.ts` 에 있고, 여기는 로그인 여부만 나른다.
 */
export function useShareGate() {
  const user = useAuthStore((s) => s.user);
  const isSignedIn = Boolean(user && !user.isAnonymous);
  // 공유는 언제나 열려 있다. 저장 잠금은 Crown Card 화면이 crownActionState 로 처리한다.
  const checkCanShare = useCallback((): VoteGateResult => ({ status: "allowed" }), []);
  return { checkCanShare, isSignedIn };
}
