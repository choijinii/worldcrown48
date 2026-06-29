import { describe, it, expect } from "vitest";
import {
  isAiReport,
  mergeNewsFeed,
  type NewsItem,
} from "@/lib/pitch/newsroom";

/**
 * A-1 NewsroomFeed merge logic (handoff §11.2 → AC-10).
 *
 * AI-vs-keyword branching is decided in ONE place: source.includes(
 * 'Fan Intelligence') (handoff §5). The merged feed is recency-ordered and
 * capped at 6 (wireframe line 693 shows 6 merged items: 2 AI + 4 keyword).
 */

function item(over: Partial<NewsItem>): NewsItem {
  return {
    id: "x",
    source: "Reuters",
    title: "t",
    date: "2시간 전",
    imageUrl: "https://example.com/x.jpg",
    publishedAt: 0,
    ...over,
  };
}

describe("isAiReport", () => {
  it("flags WC48 Fan Intelligence sources as AI reports", () => {
    expect(isAiReport("WC48 · Fan Intelligence")).toBe(true);
  });

  it("treats ordinary news wires as keyword (non-AI) items", () => {
    expect(isAiReport("Reuters")).toBe(false);
    expect(isAiReport("ESPN")).toBe(false);
    expect(isAiReport("The Athletic")).toBe(false);
  });
});

describe("mergeNewsFeed", () => {
  it("orders merged AI + keyword items by recency (newest first)", () => {
    const ai = [item({ id: "ai1", source: "WC48 · Fan Intelligence", publishedAt: 50 })];
    const kw = [
      item({ id: "kw-old", publishedAt: 10 }),
      item({ id: "kw-new", publishedAt: 90 }),
    ];
    const merged = mergeNewsFeed(ai, kw);
    expect(merged.map((m) => m.id)).toEqual(["kw-new", "ai1", "kw-old"]);
  });

  it("caps the merged feed at 6 items", () => {
    const kw = Array.from({ length: 10 }, (_, i) =>
      item({ id: `kw${i}`, publishedAt: i }),
    );
    expect(mergeNewsFeed([], kw)).toHaveLength(6);
  });

  it("interleaves AI reports among keyword items (wireframe line 693 shape)", () => {
    // Timestamps chosen so recency order reproduces [ai, kw, kw, ai, kw, kw].
    const ai = [
      item({ id: "ai0", source: "WC48 · Fan Intelligence", publishedAt: 60 }),
      item({ id: "ai1", source: "WC48 · Fan Intelligence", publishedAt: 30 }),
    ];
    const kw = [
      item({ id: "kw0", publishedAt: 55 }),
      item({ id: "kw1", publishedAt: 40 }),
      item({ id: "kw2", publishedAt: 20 }),
      item({ id: "kw3", publishedAt: 10 }),
    ];
    expect(mergeNewsFeed(ai, kw).map((m) => m.id)).toEqual([
      "ai0",
      "kw0",
      "kw1",
      "ai1",
      "kw2",
      "kw3",
    ]);
  });

  it("returns an empty feed when there is nothing to merge", () => {
    expect(mergeNewsFeed([], [])).toEqual([]);
  });
});
