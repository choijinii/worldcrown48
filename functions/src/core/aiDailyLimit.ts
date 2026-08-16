/**
 * aiDailyLimit — 편집기 AI 콜러블(aiFillContestants · aiSuggestKeywords)의
 * **교차 인스턴스** 일일 상한 결정 (AI-1 §5 B).
 *
 * 왜 필요한가: 두 콜러블에 이미 있는 5회/분 버킷은 **인스턴스 메모리** 기반이라
 * maxInstances=10이면 실효 상한이 50회/분이고, 콜드 스타트마다 리셋된다. 하루치
 * 지출을 실제로 묶으려면 Firestore 카운터가 필요하다 — aiFillContestants.ts의
 * "후속" 주석(B-2 이래 열려 있던 것)이 이것이다.
 *
 * 두 층은 **충돌하지 않고 겹쳐 쌓인다**:
 *   requireAdmin → 5회/분(인스턴스, 연타 방지) → 50회/일(Firestore, 지출 상한) → 모델 호출
 *
 * 순수 모듈이다. 트랜잭션·시계·Firestore는 어댑터(aiQuota.ts)가 가진다 —
 * newsRateLimit(ND-1) · participation(HF-1)과 같은 모양.
 *
 * KST 하루 리셋은 문서 id로만 표현한다(새 날 → 새 id → 빈 카운터 → 새 쿼터).
 * 정리용 크론이 필요 없다.
 */

/** 기본 일일 상한. 환경변수 `AI_DAILY_LIMIT`로 조정한다. */
export const AI_DAILY_LIMIT_DEFAULT = 50;

/**
 * 클라이언트 i18n 계약용 안정 에러 코드 (voteErrorCodes · newsRateLimit 방식).
 * HttpsError는 `resource-exhausted`로 내려가고, details.code가 이 값이다.
 */
export const AI_ERROR_CODES = {
  DAILY_LIMIT: "ai_daily_limit",
} as const;
export type AiErrorCode = (typeof AI_ERROR_CODES)[keyof typeof AI_ERROR_CODES];

/**
 * 카운터를 나눠 갖는 호출 종류.
 *
 * 핸드오프 문면은 스칼라 카운터 하나였지만, 한 통으로 합치면 값싼 Haiku 키워드
 * 호출 50번이 비싼 Sonnet 48명 채우기를 그날 내내 막는다. 기존 코드가 분당 버킷을
 * 일부러 분리해 둔 이유("keyword + fill quotas don't starve each other",
 * aiSuggestKeywords.ts)와 같은 근거로 종류별 필드로 나눈다. 문서 1개/일은 유지.
 */
export type AiCallKind = "aiFillContestants" | "aiSuggestKeywords";

export type AiCallDecision = { status: "allowed" } | { status: "limit_reached" };

/** 카운터 문서 id = KST 날짜(YYYY-MM-DD). uid를 섞지 않는다 — 어드민 전용 경로다. */
export function aiUsageDocId(date: string): string {
  return date;
}

/** 종류별 카운터가 사는 필드 경로 (`counts.<kind>`). */
export function aiUsageCountField(kind: AiCallKind): string {
  return `counts.${kind}`;
}

/**
 * `AI_DAILY_LIMIT` 파싱 — 실수로 상한이 사라지지 않게 fail-safe로 기본값에 되돌린다.
 * 비어 있음·숫자 아님·0 이하·정수 아님은 전부 기본값.
 */
export function resolveAiDailyLimit(
  raw: string | undefined | null,
  fallback: number = AI_DAILY_LIMIT_DEFAULT,
): number {
  if (raw === undefined || raw === null || raw.trim() === "") return fallback;
  const n = Number(raw);
  if (!Number.isInteger(n) || n <= 0) return fallback;
  return n;
}

/** 오늘 이미 countToday번 썼을 때 다음 호출을 허용할지. */
export function decideAiCall(
  countToday: number,
  limit: number = AI_DAILY_LIMIT_DEFAULT,
): AiCallDecision {
  return countToday >= limit ? { status: "limit_reached" } : { status: "allowed" };
}
