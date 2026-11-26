/**
 * PRESS-1 PR 1 · 3-3 — TIO 외신 초안의 비용 계산과 한 달 한도(15달러) 판정.
 */
import { describe, expect, it } from "vitest";
import {
  PRESS_MAX_SEARCHES,
  PRESS_MONTHLY_LIMIT_DEFAULT_USD,
  PRESS_PRICING,
  decidePressCall,
  isOverLongContext,
  pressMonthDocId,
  pressRequestCost,
  resolvePressMonthlyLimit,
} from "../core/pressBudget";

describe("상수", () => {
  it("요금(2026-11-26 공식 요금표) · 검색 6번 · 한도 15달러", () => {
    expect(PRESS_PRICING.searchUsd).toBe(0.01);
    expect(PRESS_PRICING.base).toEqual({ inputPerMTok: 0.1, outputPerMTok: 0.5 });
    expect(PRESS_PRICING.long).toEqual({ inputPerMTok: 0.5, outputPerMTok: 2.5 });
    expect(PRESS_PRICING.longContextThreshold).toBe(100_000);
    expect(PRESS_MAX_SEARCHES).toBe(6);
    expect(PRESS_MONTHLY_LIMIT_DEFAULT_USD).toBe(15);
  });
});

describe("pressRequestCost", () => {
  it("검색 × 0.01 + 읽기 · 쓰기 토큰 × 기본 요금", () => {
    const c = pressRequestCost({ inputTokens: 50_000, outputTokens: 4_000, searches: 5 });
    // 0.05 + 50,000×0.10/1M (0.005) + 4,000×0.50/1M (0.002)
    expect(c.usd).toBeCloseTo(0.057, 9);
    expect(c.overLongContext).toBe(false);
    expect(c.unknown).toBe(false);
  });

  it("읽기가 10만 토큰 넘는 요청은 읽기 · 쓰기 모두 5배 요금 + 표시", () => {
    const c = pressRequestCost({ inputTokens: 120_000, outputTokens: 2_000, searches: 0 });
    expect(c.usd).toBeCloseTo((120_000 * 0.5 + 2_000 * 2.5) / 1_000_000, 9);
    expect(c.overLongContext).toBe(true);
  });

  it("정확히 10만은 기본 요금(넘을 때만 5배)", () => {
    expect(pressRequestCost({ inputTokens: 100_000, outputTokens: 0, searches: 0 }).overLongContext).toBe(false);
    expect(isOverLongContext(100_001)).toBe(true);
  });

  it("사용량을 모르면 0 으로 세지 않고 큰 쪽으로 어림 + 모름 표시", () => {
    const c = pressRequestCost(undefined);
    expect(c.unknown).toBe(true);
    expect(c.usd).toBeGreaterThanOrEqual(PRESS_MAX_SEARCHES * 0.01);
  });

  it("음수 · 글자 같은 이상한 값은 0 으로 본다", () => {
    expect(pressRequestCost({ inputTokens: -5, outputTokens: Number.NaN, searches: 2 }).usd).toBeCloseTo(0.02, 9);
  });
});

describe("pressMonthDocId — KST 달", () => {
  it("KST 기준 YYYY-MM (UTC 로는 전달 말일이어도)", () => {
    expect(pressMonthDocId(Date.parse("2026-11-30T15:30:00Z"))).toBe("2026-12");
    expect(pressMonthDocId(Date.parse("2026-11-30T14:59:00Z"))).toBe("2026-11");
  });
});

describe("resolvePressMonthlyLimit", () => {
  it("값이 없거나 이상하면 15 · 양수면 그 값(소수 허용)", () => {
    for (const raw of [undefined, null, "", "abc", "0", "-3"]) {
      expect(resolvePressMonthlyLimit(raw)).toBe(15);
    }
    expect(resolvePressMonthlyLimit("30")).toBe(30);
    expect(resolvePressMonthlyLimit(" 7.5 ")).toBe(7.5);
  });
});

describe("decidePressCall", () => {
  it("쓴 금액 < 한도면 허용 · 같거나 넘으면 멈춤", () => {
    expect(decidePressCall(0, 15).status).toBe("allowed");
    expect(decidePressCall(14.99, 15).status).toBe("allowed");
    expect(decidePressCall(15, 15).status).toBe("limit_reached");
    expect(decidePressCall(16, 15).status).toBe("limit_reached");
  });
});
