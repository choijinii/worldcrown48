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
export type AiCallKind =
  | "aiFillContestants"
  | "aiSuggestKeywords"
  /** LAB-EV-2 §5 B — 영상 자동 소싱 배치(≤8명). 콜 **횟수** 캡이다. */
  | "autoSourceVideos"
  /** LAB-EV-2 — 슬롯 1개 캐시 우회 재검색. */
  | "refreshSlotVideo"
  /** LAB-UX-1 ③ — 붙여넣은 링크의 제목에서 인물 추출. Haiku 1콜(YouTube API 0콜). */
  | "extractContestantsFromVideos";

/**
 * 종류별 기본 상한 (LAB-EV-2 §5 B "예 20/일").
 *
 * 여기 항목이 있으면 `AI_DAILY_LIMIT` 환경변수보다 **우선**한다. 소싱은 편집기 AI와
 * 성격이 다르기 때문이다: 값싼 Haiku 판정 1콜을 쓰지만 그 뒤에 YouTube search 콜이
 * 붙고, search 버킷은 하루 100콜뿐이다(sourcing/quota.ts). 공통 상한 50을 그대로
 * 물려주면 이 캡이 아무것도 막지 않는 장식이 된다.
 *
 * 48명 = 6배치. 20이면 하루 3회 풀 실행 + 여유 — search 버킷(하루 2개 토너먼트)이
 * 먼저 걸리도록 일부러 그보다 헐겁게 잡았다. 이 캡은 폭주 방어이지 주 가드가 아니다.
 */
export const AI_DAILY_LIMIT_BY_KIND: Partial<Record<AiCallKind, number>> = {
  autoSourceVideos: 20,
  refreshSlotVideo: 30,
};

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

/**
 * 종류별 실효 상한. 종류별 기본값이 있으면 그것이 이기고, 없으면 기존처럼
 * `AI_DAILY_LIMIT` 환경변수(없으면 공통 기본)를 쓴다 — 기존 두 종류는 무영향.
 */
export function resolveAiDailyLimitFor(
  kind: AiCallKind,
  raw: string | undefined | null,
): number {
  const perKind = AI_DAILY_LIMIT_BY_KIND[kind];
  return perKind !== undefined ? perKind : resolveAiDailyLimit(raw);
}

/** 오늘 이미 countToday번 썼을 때 다음 호출을 허용할지. */
export function decideAiCall(
  countToday: number,
  limit: number = AI_DAILY_LIMIT_DEFAULT,
): AiCallDecision {
  return countToday >= limit ? { status: "limit_reached" } : { status: "allowed" };
}
