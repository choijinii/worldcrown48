/**
 * Vote error-code contract (#12, B-2) — CLIENT side.
 *
 * The server (functions/src/onVote.ts) throws `resource-exhausted` for two
 * distinct situations (daily participation limit vs flood rate-limit). Before
 * B-2 they shared one code + a hardcoded Korean message, so en/es Voters saw
 * Korean and the client couldn't tell them apart. Now the server attaches a
 * stable `details.code`; the client maps it to an i18n MessageKey and resolves
 * the localized toast (ko/en/es).
 *
 * These string values MUST stay in sync with the server constants in
 * `functions/src/core/voteErrorCodes.ts` (the functions package can't import
 * root lib/ — rootDir=src — so the contract is duplicated by project precedent,
 * like Category / TOTAL_CONTESTANTS). ADR-B2 §4.
 */
import type { MessageKey } from "@/lib/i18n/messages";

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

/** Pull `details.code` off a thrown Firebase callable error, if present. */
export function voteErrorDetailCode(err: unknown): string | undefined {
  if (!err || typeof err !== "object") return undefined;
  const details = (err as { details?: unknown }).details;
  if (!details || typeof details !== "object") return undefined;
  const code = (details as { code?: unknown }).code;
  return typeof code === "string" ? code : undefined;
}

/** Map a vote error to the i18n toast key (#12 — 3-language). */
export function voteErrorMessageKey(err: unknown): MessageKey {
  const detailCode = voteErrorDetailCode(err);
  if (detailCode === VOTE_ERROR_CODES.DAILY_LIMIT) return "arena.vote.dailyLimit";
  if (detailCode === VOTE_ERROR_CODES.RATE_LIMITED) return "arena.vote.rateLimited";
  // 2026-09-06 P0: 마감 거부가 "투표에 실패했어요"로 보였다. 그게 사고의 전부였다 —
  // 막는 것과 왜 막혔는지 알려주는 것은 한 쌍이다(§14).
  if (detailCode === VOTE_ERROR_CODES.DEADLINE_PASSED) return "arena.run.deadlinePassed";
  // guest_limit 은 여기 없다 — 토스트가 아니라 모달로 간다(AC 17). 화면이 details.code 를
  // 보고 setModal("guest_limit") 한다. Google 버튼이 함께 떠야 갈 길이 열린다.

  // Legacy fallback: a resource-exhausted with no details is the flood limit.
  const code = (err as { code?: unknown }).code;
  if (code === "functions/resource-exhausted") return "arena.vote.rateLimited";

  return "arena.vote.failed";
}
