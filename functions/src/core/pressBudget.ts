/**
 * pressBudget — TIO 외신 초안(PRESS-1)의 비용 계산과 한 달 한도 판정. 순수 모듈.
 *
 * 한도의 뜻(대표 2026-11-24 · 킥 v0.2 결정 4): 헛도는 검색과 사고로 돈이 새는 것을 막는 한도.
 * 평소 예상은 한 달 5달러 안팎. 한도에 닿으면 크론도 [다시 쓰기]도 AI 를 부르지 않는다.
 * 이 한도가 세지 않는 것: 주간 동향 등 기존 뉴스 초안 · 편집기 AI(aiDailyLimit 따로).
 *
 * 달(KST)마다 문서 하나 `press_usage/{YYYY-MM}` 에 쌓는다 — 새 달 = 새 문서 = 빈 금액.
 * 정리 크론이 필요 없다(aiDailyLimit · newsRateLimit 과 같은 "문서 id = 기간" 모양).
 */

/**
 * 요금 — 한 곳. 확인 2026-11-26 · https://platform.claude.com/docs/en/about-claude/pricing
 *   Claude Haiku 5.5: 읽기 0.10 / 쓰기 0.50 달러(100만 토큰당 · 한 요청 읽기 10만 토큰까지)
 *                     10만 토큰을 넘는 요청은 읽기 0.50 / 쓰기 2.50(둘 다 5배)
 *   웹 검색: 1,000번에 10달러(= 1번 0.01) · 오류로 실패한 검색은 요금 없음 · 검색 결과는 읽기 토큰에 들어간다.
 * 모델이나 요금이 바뀌면 이 상수와 날짜를 함께 고친다.
 */
export const PRESS_PRICING = {
  checkedAt: "2026-11-26",
  source: "https://platform.claude.com/docs/en/about-claude/pricing",
  searchUsd: 0.01,
  base: { inputPerMTok: 0.1, outputPerMTok: 0.5 },
  long: { inputPerMTok: 0.5, outputPerMTok: 2.5 },
  longContextThreshold: 100_000,
} as const;

/** 초안 1건(다시 쓰기 1번도 같음)의 검색 상한 — 웹 검색 도구 max_uses(대표 결정 4). */
export const PRESS_MAX_SEARCHES = 6;

/** 한 달 한도 기본값(달러). 환경 값 PRESS_MONTHLY_LIMIT_USD 로 바꾼다. */
export const PRESS_MONTHLY_LIMIT_DEFAULT_USD = 15;

/** 응답이 사용량을 주지 않았을 때 어림하는 큰 쪽 값 — 0 으로 세면 한도가 새기 때문. */
const UNKNOWN_USAGE = { inputTokens: 100_000, outputTokens: 8_000, searches: PRESS_MAX_SEARCHES };

/** 한 요청의 사용량(응답 usage 에서 읽은 그대로). */
export interface PressUsage {
  inputTokens: number;
  outputTokens: number;
  /** usage.server_tool_use.web_search_requests */
  searches: number;
}

export interface PressCost {
  usd: number;
  /** 읽기 10만 토큰을 넘어 5배 요금이 붙은 요청. */
  overLongContext: boolean;
  /** 응답에 사용량이 없어 큰 쪽으로 어림했다. */
  unknown: boolean;
}

const count = (v: unknown): number => (typeof v === "number" && Number.isFinite(v) && v > 0 ? v : 0);

export function isOverLongContext(inputTokens: number): boolean {
  return inputTokens > PRESS_PRICING.longContextThreshold;
}

/** 요청 1번의 비용. 요금 단계는 요청마다 따로 정해진다(요금표 "Each request is priced on its own"). */
export function pressRequestCost(usage: PressUsage | undefined): PressCost {
  const unknown = !usage;
  const u = usage ?? UNKNOWN_USAGE;
  const input = count(u.inputTokens);
  const output = count(u.outputTokens);
  const searches = count(u.searches);
  const over = isOverLongContext(input);
  const rate = over ? PRESS_PRICING.long : PRESS_PRICING.base;
  const usd = searches * PRESS_PRICING.searchUsd + (input * rate.inputPerMTok + output * rate.outputPerMTok) / 1_000_000;
  return { usd, overLongContext: over, unknown };
}

const kstMonthFmt = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit" });

/** 한 달 문서 id = KST "YYYY-MM". */
export function pressMonthDocId(nowMs: number): string {
  return kstMonthFmt.format(new Date(nowMs));
}

/** 환경 값 → 한도(달러). 비었거나 숫자가 아니거나 0 이하면 기본 15(실수로 한도가 사라지지 않게). */
export function resolvePressMonthlyLimit(raw: string | undefined | null): number {
  if (raw === undefined || raw === null || raw.trim() === "") return PRESS_MONTHLY_LIMIT_DEFAULT_USD;
  const n = Number(raw.trim());
  return Number.isFinite(n) && n > 0 ? n : PRESS_MONTHLY_LIMIT_DEFAULT_USD;
}

export type PressCallDecision = { status: "allowed" } | { status: "limit_reached" };

/** 호출 **전에** 본다. 이번 달 쓴 금액이 한도와 같거나 넘으면 멈춘다. */
export function decidePressCall(spentUsd: number, limitUsd: number): PressCallDecision {
  return count(spentUsd) >= limitUsd ? { status: "limit_reached" } : { status: "allowed" };
}
