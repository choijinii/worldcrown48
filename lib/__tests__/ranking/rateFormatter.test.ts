/**
 * rateFormatter — Vote Rate (%) display formatting (handoff §5 DO).
 */
import { describe, expect, it } from "vitest";
import { avatarGlyph, barWidth, formatRate } from "../../ranking/rateFormatter";

describe("formatRate", () => {
  it("0 → '0.0%'", () => {
    expect(formatRate(0)).toBe("0.0%");
  });
  it("33.3 → '33.3%'", () => {
    expect(formatRate(33.3)).toBe("33.3%");
  });
  it("100 → '100.0%'", () => {
    expect(formatRate(100)).toBe("100.0%");
  });
  it("NaN guard → '0.0%'", () => {
    expect(formatRate(Number.NaN)).toBe("0.0%");
  });
  it("Infinity guard → '0.0%'", () => {
    expect(formatRate(Number.POSITIVE_INFINITY)).toBe("0.0%");
  });
  it("never emits an absolute count (always ends with %)", () => {
    expect(formatRate(42.5).endsWith("%")).toBe(true);
  });
});

describe("barWidth — normalized to the leader's rate", () => {
  it("leader is 100% wide", () => {
    expect(barWidth(50, 50)).toBe(100);
  });
  it("half of leader is 50% wide", () => {
    expect(barWidth(25, 50)).toBe(50);
  });
  it("0 topRate guard → 0", () => {
    expect(barWidth(10, 0)).toBe(0);
  });
  it("NaN guard → 0", () => {
    expect(barWidth(Number.NaN, 50)).toBe(0);
  });
});

describe("avatarGlyph", () => {
  it("uses the surname initial (handoff wireframe split)", () => {
    expect(avatarGlyph("L. Messi")).toBe("M");
  });
  it("falls back to first char for single names", () => {
    expect(avatarGlyph("neymar")).toBe("N");
  });
  it("empty name → '?'", () => {
    expect(avatarGlyph("")).toBe("?");
  });
});
