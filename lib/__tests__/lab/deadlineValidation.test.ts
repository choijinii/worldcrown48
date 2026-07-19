import { describe, it, expect } from "vitest";
import {
  validateDeadline,
  presetDeadlineMs,
  DEFAULT_DEADLINE_DAYS,
  DEADLINE_PRESETS_DAYS,
} from "@/lib/lab/deadlineValidation";

const NOW = 1_752_000_000_000; // fixed epoch ms for determinism
const DAY = 86_400_000;

describe("validateDeadline", () => {
  it("accepts a future deadline", () => {
    const r = validateDeadline(NOW + DAY, NOW);
    expect(r.isValid).toBe(true);
    expect(r.isPast).toBe(false);
    expect(r.isMissing).toBe(false);
  });

  it("rejects a past deadline", () => {
    const r = validateDeadline(NOW - 1, NOW);
    expect(r.isPast).toBe(true);
    expect(r.isValid).toBe(false);
  });

  it("rejects the exact current instant (must be strictly future)", () => {
    const r = validateDeadline(NOW, NOW);
    expect(r.isPast).toBe(true);
    expect(r.isValid).toBe(false);
  });

  it("rejects a non-finite / missing deadline", () => {
    expect(validateDeadline(NaN, NOW).isMissing).toBe(true);
    expect(validateDeadline(NaN, NOW).isValid).toBe(false);
    expect(validateDeadline(Infinity, NOW).isValid).toBe(false);
  });
});

describe("presetDeadlineMs", () => {
  it("adds N days to now", () => {
    expect(presetDeadlineMs(NOW, 7)).toBe(NOW + 7 * DAY);
    expect(presetDeadlineMs(NOW, DEFAULT_DEADLINE_DAYS)).toBe(NOW + 7 * DAY);
  });

  it("exposes the preset chips 3/7/14", () => {
    expect(DEADLINE_PRESETS_DAYS).toEqual([3, 7, 14]);
    expect(DEFAULT_DEADLINE_DAYS).toBe(7);
  });
});
