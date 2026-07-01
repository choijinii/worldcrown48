/**
 * formatKpi helpers — isStale · relativeAge · deltaArrow (handoff §4.2, §4.4).
 */
import { describe, expect, it } from "vitest";
import {
  DEFAULT_STALE_AFTER_MS,
  deltaArrow,
  formatNumber,
  isStale,
  relativeAge,
} from "@/lib/admin/dashboard/formatKpi";

const NOW = 1_700_000_000_000;
const MIN = 60_000;
const HOUR = 60 * MIN;

describe("isStale", () => {
  it("never stale before a first successful load", () => {
    expect(isStale(null, NOW)).toBe(false);
  });
  it("not stale within the window", () => {
    expect(isStale(NOW - 80_000, NOW)).toBe(false);
  });
  it("stale past the 90s default", () => {
    expect(isStale(NOW - 91_000, NOW)).toBe(true);
  });
  it("honors a custom window", () => {
    expect(isStale(NOW - 31_000, NOW, 30_000)).toBe(true);
    expect(DEFAULT_STALE_AFTER_MS).toBe(90_000);
  });
});

describe("relativeAge", () => {
  it("now under a minute", () => {
    expect(relativeAge(NOW - 30_000, NOW)).toEqual({ unit: "now", value: 0 });
  });
  it("minutes", () => {
    expect(relativeAge(NOW - 5 * MIN, NOW)).toEqual({ unit: "minute", value: 5 });
  });
  it("hours", () => {
    expect(relativeAge(NOW - 3 * HOUR, NOW)).toEqual({ unit: "hour", value: 3 });
  });
  it("days", () => {
    expect(relativeAge(NOW - 50 * HOUR, NOW)).toEqual({ unit: "day", value: 2 });
  });
  it("clamps negative (future) to now", () => {
    expect(relativeAge(NOW + 10_000, NOW)).toEqual({ unit: "now", value: 0 });
  });
});

describe("deltaArrow", () => {
  it("maps direction to glyph", () => {
    expect(deltaArrow("up")).toBe("▲");
    expect(deltaArrow("down")).toBe("▼");
    expect(deltaArrow("flat")).toBe("▬");
  });
});

describe("formatNumber", () => {
  it("groups thousands per locale", () => {
    expect(formatNumber(2841920, "en")).toBe("2,841,920");
    expect(formatNumber(2841920, "ko")).toBe("2,841,920");
    expect(formatNumber(0, "en")).toBe("0");
  });
});
