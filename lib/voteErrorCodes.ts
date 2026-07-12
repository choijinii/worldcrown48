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

  // Legacy fallback: a resource-exhausted with no details is the flood limit.
  const code = (err as { code?: unknown }).code;
  if (code === "functions/resource-exhausted") return "arena.vote.rateLimited";

  return "arena.vote.failed";
}
