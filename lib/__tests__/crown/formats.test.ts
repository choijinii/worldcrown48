import { describe, it, expect } from "vitest";
import { FORMATS, FORMAT_KEYS, type FormatKey } from "@/lib/crown/formats";

/**
 * C-2 Crown Card · share formats (handoff §3, §6 · wireframe line 1076-1080).
 *
 * The three canvas output ratios are an immutable contract — the share menu
 * format chips, the dimension labels, and the server PNG renderer all read
 * the same numbers. AC-3 (chips), AC-4 (dimension label refresh).
 */
describe("FORMATS", () => {
  it("declares story 9:16, feed 4:5, link 1.91:1 with exact wireframe dimensions", () => {
    expect(FORMATS.story).toEqual({ w: 1080, h: 1920, label: "1080 × 1920 px · PNG" });
    expect(FORMATS.feed).toEqual({ w: 1080, h: 1350, label: "1080 × 1350 px · PNG" });
    expect(FORMATS.link).toEqual({ w: 1200, h: 630, label: "1200 × 630 px · PNG" });
  });

  it("exposes exactly the three keys story · feed · link, in that order", () => {
    expect(FORMAT_KEYS).toEqual(["story", "feed", "link"]);
  });

  it("is frozen — formats cannot be mutated at runtime (single source of truth)", () => {
    expect(Object.isFrozen(FORMATS)).toBe(true);
    expect(Object.isFrozen(FORMATS.story)).toBe(true);
    expect(() => {
      // @ts-expect-error — runtime immutability guard
      FORMATS.story.w = 999;
    }).toThrow();
    expect(FORMATS.story.w).toBe(1080);
  });

  it("link is the only landscape (1.91:1) format — the server-rendered OG image", () => {
    expect(FORMATS.link.w).toBeGreaterThan(FORMATS.link.h);
    expect(FORMATS.story.h).toBeGreaterThan(FORMATS.story.w);
    expect(FORMATS.feed.h).toBeGreaterThan(FORMATS.feed.w);
  });

  it("FormatKey type accepts only the three keys (compile-time, exercised at runtime)", () => {
    const keys: FormatKey[] = ["story", "feed", "link"];
    for (const k of keys) expect(FORMATS[k]).toBeDefined();
  });
});
