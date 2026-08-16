/**
 * Claude model ids — single source of truth for the functions deploy package.
 *
 * 대표 결정 (2026-07-11, B-2): centralize the model strings so a future model
 * swap edits ONE file, not every callable. HAIKU is the cheap/fast tier used by
 * B-2's helper callables (keyword suggestion + meta translation) and ND-1's news
 * drafts; SONNET is the heavier tier the 48-Contestant fill uses.
 *
 * Deploy/verify is 대표's step — these strings are bound to real models at deploy
 * time (functions:secrets already set ANTHROPIC_API_KEY).
 *
 * ── AI-1 (2026-08-16) — 실측 출처: docs.claude.com/en/about-claude/models/overview
 *   SONNET: claude-sonnet-4-6 → claude-sonnet-5  ($3/$15 → $2/$10 per MTok)
 *   HAIKU : claude-haiku-4-5 유지 — 더 최신 Haiku는 문서에 없다(4.5가 최신).
 *
 * ⚠ 모델 스왑은 한 줄 교체가 아니다. Sonnet 5는 `thinking`을 **생략하면 adaptive가
 *   켜지고**(4.6은 꺼짐), `max_tokens`가 사고+응답 합산 상한이라 기존 상한 그대로면
 *   응답이 중간에 잘린다. 그래서 아래 SONNET_THINKING을 콜 옵션에 **명시**한다.
 *   모델을 다시 바꿀 때는 이 상수도 함께 재검토할 것.
 */
export const HAIKU_MODEL = "claude-haiku-4-5";
export const SONNET_MODEL = "claude-sonnet-5";

/**
 * Sonnet 호출의 thinking 설정 — **명시적 비활성** (AI-1 RULE R5).
 *
 * 48명 채우기는 정해진 JSON 스키마를 뱉는 구조화 작업이라 사고(thinking) 예산이
 * 품질을 올리지 않는다. 반대로 켜두면 (1) max_tokens를 사고와 나눠 쓰고
 * (2) 사고 토큰이 출력 단가로 과금된다. 생략 = adaptive 켜짐이므로 생략이 아니라
 * 명시적으로 끈다.
 *
 * 타입은 SDK의 ThinkingConfigDisabled와 구조적으로 호환된다(코어는 SDK 무의존 유지).
 */
export const SONNET_THINKING = { type: "disabled" } as const;
