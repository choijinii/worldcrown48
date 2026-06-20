import { describe, it, expect } from "vitest";
import { validateTitle, TITLE_MAX } from "@/lib/lab/titleValidation";

describe("validateTitle", () => {
  it("treats an empty string as invalid with full remaining count", () => {
    const r = validateTitle("");
    expect(r.isEmpty).toBe(true);
    expect(r.isValid).toBe(false);
    expect(r.length).toBe(0);
    expect(r.remaining).toBe(TITLE_MAX);
  });

  it("treats a whitespace-only string as empty/invalid", () => {
    const r = validateTitle("   ");
    expect(r.isEmpty).toBe(true);
    expect(r.isValid).toBe(false);
  });

  it("accepts a normal title and reports trimmed length + remaining", () => {
    const r = validateTitle("Best Striker");
    expect(r.value).toBe("Best Striker");
    expect(r.length).toBe(12);
    expect(r.remaining).toBe(TITLE_MAX - 12);
    expect(r.isValid).toBe(true);
  });

  it("trims surrounding whitespace from the canonical value", () => {
    const r = validateTitle("  hi  ");
    expect(r.value).toBe("hi");
    expect(r.length).toBe(2);
  });

  it("accepts exactly 50 chars (boundary, valid)", () => {
    const r = validateTitle("a".repeat(50));
    expect(r.length).toBe(50);
    expect(r.isTooLong).toBe(false);
    expect(r.isValid).toBe(true);
    expect(r.remaining).toBe(0);
  });

  it("rejects 51 chars as too long", () => {
    const r = validateTitle("a".repeat(51));
    expect(r.isTooLong).toBe(true);
    expect(r.isValid).toBe(false);
    expect(r.remaining).toBe(-1);
  });
});
