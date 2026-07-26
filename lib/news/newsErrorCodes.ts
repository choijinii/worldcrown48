/**
 * News draft error-code contract (ND-1 §4 ADR, AC 7) — CLIENT side.
 *
 * generateNewsDraft throws `resource-exhausted` with a stable `details.code` when
 * the 20/KST일 limit is hit; the client maps it to a localized message. MUST stay
 * in sync with functions/src/core/newsRateLimit.ts (functions can't import root
 * lib/ — duplicated by project precedent, same as voteErrorCodes).
 */
import type { MessageKey } from "@/lib/i18n/messages";

export const NEWS_ERROR_CODES = {
  DAILY_LIMIT: "news_daily_limit",
} as const;

export type NewsErrorCode =
  (typeof NEWS_ERROR_CODES)[keyof typeof NEWS_ERROR_CODES];

function detailCode(err: unknown): string | undefined {
  if (!err || typeof err !== "object") return undefined;
  const details = (err as { details?: unknown }).details;
  if (!details || typeof details !== "object") return undefined;
  const code = (details as { code?: unknown }).code;
  return typeof code === "string" ? code : undefined;
}

/** Map a generateNewsDraft error to its i18n toast key (3-language). */
export function newsErrorMessageKey(err: unknown): MessageKey {
  if (detailCode(err) === NEWS_ERROR_CODES.DAILY_LIMIT) {
    return "newsdesk.error.dailyLimit";
  }
  return "newsdesk.error.generateFailed";
}
