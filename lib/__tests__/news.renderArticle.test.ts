/**
 * ND-1 Phase 4·5 — resolveArticleView: the pure display selector shared by the
 * admin editor preview and the public /news renderer. AC 8 (미번역 언어 fallback).
 *
 * Picks the requested language's title/subhead/body; when a slot is empty (not
 * yet translated), it falls back to the source-language slot so a reader always
 * sees a complete article — never a blank en/es page.
 */
import { describe, expect, it } from "vitest";
import { resolveArticleView, firstFilledLang } from "../news/renderArticle";
import type { ArticleDoc } from "../news/articleDoc";

const doc = (over: Partial<ArticleDoc> = {}): ArticleDoc => ({
  slug: "20260722-a1b2c3",
  template: "open",
  status: "published",
  title: { ko: "여름 차트", en: "Summer Chart", es: "" },
  subhead: { ko: "48곡", en: "48 songs", es: "" },
  body: {
    ko: [{ type: "lead", text: "리드" }],
    en: [{ type: "lead", text: "lead" }],
    es: [],
  },
  evidence: { asOf: "now", stats: [{ label: "C", value: "48" }] },
  origin: "manual_ai",
  createdAt: null,
  publishedAt: null,
  ...over,
});

describe("firstFilledLang", () => {
  it("returns the first populated language slot", () => {
    expect(firstFilledLang({ ko: "", en: "x", es: "" })).toBe("en");
    expect(firstFilledLang({ ko: "k", en: "", es: "" })).toBe("ko");
  });
  it("returns null when all empty", () => {
    expect(firstFilledLang({ ko: "", en: "", es: "" })).toBeNull();
  });
});

describe("resolveArticleView — language pick with source fallback", () => {
  it("returns the requested language when present", () => {
    const v = resolveArticleView(doc(), "en");
    expect(v.title).toBe("Summer Chart");
    expect(v.lang).toBe("en");
    expect(v.isFallback).toBe(false);
    expect((v.body[0] as { text: string }).text).toBe("lead");
  });

  it("falls back to the source slot when the requested language is empty", () => {
    const v = resolveArticleView(doc(), "es"); // es title/body empty
    expect(v.title).toBe("여름 차트"); // ko source fallback
    expect(v.isFallback).toBe(true);
    expect((v.body[0] as { text: string }).text).toBe("리드");
  });

  it("body falls back independently of title", () => {
    // en title present but en body present too — no fallback
    const v = resolveArticleView(doc(), "en");
    expect(v.body).toHaveLength(1);
  });

  it("uses ko as the default fallback source", () => {
    const v = resolveArticleView(
      doc({ title: { ko: "케이", en: "", es: "" } }),
      "es",
    );
    expect(v.title).toBe("케이");
  });
});
