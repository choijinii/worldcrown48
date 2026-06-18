/**
 * lib/kst — KST midnight boundary cases.
 *
 * Why these specific dates:
 *   - The daily-5-vote limit resets at Seoul midnight. If `getTodayKST`
 *     ever silently slips to UTC, the limit would drift ±1 day across the
 *     Korean working hours and look like a bug in the gate.
 *   - 09:00 UTC is the exact moment that a naive `toISOString().slice(0,10)`
 *     starts diverging from Seoul. That's the test you have to write.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getTodayKST } from "../kst";

describe("getTodayKST", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("rolls over at Seoul 00:00 (= UTC 15:00 prior day)", () => {
    // 2026-06-15 14:59:59 UTC === 2026-06-15 23:59:59 KST → still the 15th
    vi.setSystemTime(new Date("2026-06-15T14:59:59Z"));
    expect(getTodayKST()).toBe("2026-06-15");

    // +1 second → 2026-06-15 15:00:00 UTC === 2026-06-16 00:00:00 KST
    vi.setSystemTime(new Date("2026-06-15T15:00:00Z"));
    expect(getTodayKST()).toBe("2026-06-16");
  });

  it("does NOT skew around UTC 00:00 (= KST 09:00) — naive UTC slice would", () => {
    // 2026-06-15 00:00:00 UTC === 2026-06-15 09:00:00 KST → same date
    vi.setSystemTime(new Date("2026-06-15T00:00:00Z"));
    expect(getTodayKST()).toBe("2026-06-15");
  });

  it("crosses the year boundary at Seoul midnight, not UTC midnight", () => {
    // 2026-12-31 14:59 UTC === 2026-12-31 23:59 KST
    vi.setSystemTime(new Date("2026-12-31T14:59:00Z"));
    expect(getTodayKST()).toBe("2026-12-31");

    // 2026-12-31 15:00 UTC === 2027-01-01 00:00 KST
    vi.setSystemTime(new Date("2026-12-31T15:00:00Z"));
    expect(getTodayKST()).toBe("2027-01-01");
  });

  it("emits Feb 29 on a leap year (2028)", () => {
    vi.setSystemTime(new Date("2028-02-29T03:00:00Z"));
    expect(getTodayKST()).toBe("2028-02-29");
  });

  it("always returns the YYYY-MM-DD shape, never YYYY/M/D or similar", () => {
    vi.setSystemTime(new Date("2026-06-15T03:00:00Z"));
    expect(getTodayKST()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
