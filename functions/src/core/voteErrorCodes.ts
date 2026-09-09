/**
 * Vote error-code contract (#12, B-2) — SERVER side.
 *
 * onVote throws `resource-exhausted` for two distinct situations. It now attaches
 * one of these stable codes as `details.code` so the client can localize the
 * toast (ko/en/es) instead of receiving a hardcoded Korean message.
 *
 * MUST stay in sync with the client copy in `lib/voteErrorCodes.ts` (functions
 * can't import root lib/ — rootDir=src — so the contract is duplicated by
 * project precedent, like Category / TOTAL_CONTESTANTS / cors). ADR-B2 §4.
 */
export const VOTE_ERROR_CODES = {
  DAILY_LIMIT: "daily_limit",
  RATE_LIMITED: "rate_limited",
  /** RUN-1 (AC 9): 마감된 Tournament에서 새 판을 열려 했다. 진행 중인 판은 이 코드가 안 난다. */
  DEADLINE_PASSED: "deadline_passed",
  /**
   * RUN-1 v2.1 (AC 17): 게스트가 하루 3판을 다 썼다.
   *
   * 화면은 토스트가 아니라 **login.guest_limit 모달**을 띄운다 — Google 버튼이 함께 뜨는
   * 전환 지점이라 "왜 막혔는지"를 말해야 갈 길이 열린다(2026-09-05 대표 확정).
   */
  GUEST_LIMIT: "guest_limit",
} as const;

export type VoteErrorCode =
  (typeof VOTE_ERROR_CODES)[keyof typeof VOTE_ERROR_CODES];
