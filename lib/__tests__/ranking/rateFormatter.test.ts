/**
 * rateFormatter — Vote Rate (%) display formatting (handoff §5 DO).
 */
import { describe, expect, it } from "vitest";
import {
  avatarGlyph,
  barWidth,
  formatCrownScore,
  formatRate,
} from "../../ranking/rateFormatter";

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

describe("formatCrownScore — 차트에 나가는 유일한 수치", () => {
  it("정수 그대로 찍는다 (소수점·퍼센트 없음)", () => {
    expect(formatCrownScore(549)).toBe("549");
  });

  it("0점도 숨기지 않는다", () => {
    expect(formatCrownScore(0)).toBe("0");
  });

  it("NaN·Infinity 는 0으로 막는다 — 화면에 'NaN점'이 뜨면 안 된다", () => {
    expect(formatCrownScore(Number.NaN)).toBe("0");
    expect(formatCrownScore(Number.POSITIVE_INFINITY)).toBe("0");
  });

  it("소수가 들어와도 정수로 내린다 (캐시가 옛 값이어도 화면은 정수다)", () => {
    expect(formatCrownScore(548.8)).toBe("549");
  });
});
