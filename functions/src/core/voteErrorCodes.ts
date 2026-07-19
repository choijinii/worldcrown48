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
} as const;

export type VoteErrorCode =
  (typeof VOTE_ERROR_CODES)[keyof typeof VOTE_ERROR_CODES];
