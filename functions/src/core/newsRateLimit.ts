/**
 * newsRateLimit — the generateNewsDraft callable's KST-day rate limit decision
 * (ND-1 §3 #4 / §4 ADR, AC 7). Pure, so the callable's transaction stays a thin
 * adapter over it — same shape as participation.ts (HF-1).
 *
 * 대표 조작인 수동/AI 초안 생성만 카운트한다. 이벤트 트리거·크론은 대표 조작이 아니므로
 * 이 카운터를 소모하지 않는다 (§8 Edge — 트리거 rate limit 면제, 구현자 확정 기록).
 *
 * The KST-day reset is expressed entirely through the doc id (a new day → new id →
 * empty counter → fresh quota), so no scheduled cleanup is needed.
 */
export const NEWS_DAILY_LIMIT = 20;

/**
 * Stable error code for the client i18n contract (voteErrorCodes 계약 방식). MUST
 * stay in sync with the client copy in lib/voteErrorCodes.ts (functions can't
 * import root lib/ — duplicated by project precedent).
 */
export const NEWS_ERROR_CODES = {
  DAILY_LIMIT: "news_daily_limit",
} as const;
export type NewsErrorCode =
  (typeof NEWS_ERROR_CODES)[keyof typeof NEWS_ERROR_CODES];

export type NewsGenerationDecision =
  | { status: "allowed" }
  | { status: "limit_reached" };

export function decideNewsGeneration(
  countToday: number,
  limit: number = NEWS_DAILY_LIMIT,
): NewsGenerationDecision {
  return countToday >= limit ? { status: "limit_reached" } : { status: "allowed" };
}

/** Per-uid, per-KST-day counter doc id: `${uid}_${date}` (date = YYYY-MM-DD KST). */
export function newsRateDocId(uid: string, date: string): string {
  return `${uid}_${date}`;
}
