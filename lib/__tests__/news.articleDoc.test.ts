/**
 * ND-1 §3 #1 / §4 ADR — `news` collection schema, structured block model, slug,
 * and status transitions. AC 1 (자동 발행 0건) · AC 5 (published-only public read).
 *
 * These are the write-time invariants the trigger/cron/callable adapters lean on:
 * every builder yields `status:'draft'` with `publishedAt:null` — there is NO code
 * path from a draft-generating source to `published`. Publishing is a SEPARATE,
 * explicit transition (canTransition) the admin console performs, never a builder
 * argument. That separation is what makes "no auto-publish" provable.
 */
import { describe, expect, it } from "vitest";
import {
  ARTICLE_TEMPLATES,
  ARTICLE_ORIGINS,
  buildArticleDraft,
  buildLocalizedArticleDraft,
  buildSlug,
  isValidSlug,
  canTransition,
  validateBlocks,
  isDraftOnlyOrigin,
  emptyLocalizedText,
  emptyLocalizedBlocks,
  type ArticleBlock,
  type ArticleDraftInput,
  type LocalizedArticleDraftInput,
} from "../news/articleDoc";

const validInput = (over: Partial<ArticleDraftInput> = {}): ArticleDraftInput => ({
  slug: "20260722-a1b2c3",
  template: "open",
  origin: "event_open",
  sourceLang: "ko",
  title: "닷새 만에 세 번 바뀐 여름 차트",
  subhead: "48곡이 한 무대에 올랐다.",
  body: [
    { type: "lead", text: "지난 6월 마지막 주, 순위는 세 번 바뀌었다." },
    { type: "paragraph", text: "그 질문이 오늘 무대에 올랐다." },
    { type: "closer", text: "올여름의 노래는, 당신이 정한다." },
  ],
  evidence: {
    asOf: "2026-07-22 08:00 KST",
    stats: [{ label: "CONTESTANTS", value: "48" }],
  },
  tournamentId: "t_summer48",
  ...over,
});

describe("buildSlug / isValidSlug — URL-safe · immutable · 비추측성", () => {
  it("builds {YYYYMMDD}-{6 base36} from a date + random token", () => {
    expect(buildSlug({ dateYYYYMMDD: "20260722", token: "a1b2c3" })).toBe(
      "20260722-a1b2c3",
    );
  });

  it("accepts a hyphenated YYYY-MM-DD date and normalizes it", () => {
    expect(buildSlug({ dateYYYYMMDD: "2026-07-22", token: "zzz999" })).toBe(
      "20260722-zzz999",
    );
  });

  it("rejects a token that is not exactly 6 lowercase base36 chars", () => {
    expect(() => buildSlug({ dateYYYYMMDD: "20260722", token: "ABC123" })).toThrow();
    expect(() => buildSlug({ dateYYYYMMDD: "20260722", token: "abc12" })).toThrow();
    expect(() => buildSlug({ dateYYYYMMDD: "20260722", token: "abc-12" })).toThrow();
  });

  it("validates the full slug shape", () => {
    expect(isValidSlug("20260722-a1b2c3")).toBe(true);
    expect(isValidSlug("2026-07-22-a1b2c3")).toBe(false); // un-normalized date
    expect(isValidSlug("20260722-A1B2C3")).toBe(false); // uppercase
    expect(isValidSlug("20260722_a1b2c3")).toBe(false); // wrong separator
    expect(isValidSlug("20260722-a1b2")).toBe(false); // short token
    expect(isValidSlug("")).toBe(false);
  });
});

describe("validateBlocks — structured body model (기준본 v3 지면 1:1)", () => {
  it("accepts every supported block type", () => {
    const blocks: ArticleBlock[] = [
      { type: "hero", kicker: "TOURNAMENT OPEN", title: "T", subtitle: "s" },
      { type: "lead", text: "lead" },
      { type: "paragraph", text: "p" },
      { type: "stats", items: [{ n: "48", l: "CONTESTANTS" }] },
      {
        type: "matchups",
        pairs: [
          { left: { group: "URBANROSE", title: "Blue Flame" }, right: { group: "MIRO", title: "여름밤 도둑" } },
        ],
        note: "눈을 뗄 수 없는 만남.",
      },
      { type: "closer", text: "closer" },
    ];
    expect(validateBlocks(blocks).ok).toBe(true);
  });

  it("rejects an unknown block type", () => {
    expect(validateBlocks([{ type: "banner" } as unknown as ArticleBlock]).ok).toBe(
      false,
    );
  });

  it("rejects a text block with an empty string", () => {
    expect(validateBlocks([{ type: "paragraph", text: "" }]).ok).toBe(false);
  });

  it("rejects a stats block with no items", () => {
    expect(validateBlocks([{ type: "stats", items: [] }]).ok).toBe(false);
  });

  it("rejects an empty body (an article must have at least one block)", () => {
    expect(validateBlocks([]).ok).toBe(false);
  });
});

describe("buildArticleDraft — always draft, never published (AC 1)", () => {
  it("produces status 'draft' with publishedAt null", () => {
    const doc = buildArticleDraft(validInput());
    expect(doc.status).toBe("draft");
    expect(doc.publishedAt).toBeNull();
  });

  it("puts the source-language text in its slot and leaves the others empty (translated later)", () => {
    const doc = buildArticleDraft(validInput({ sourceLang: "ko" }));
    expect(doc.title.ko).toBe("닷새 만에 세 번 바뀐 여름 차트");
    expect(doc.title.en).toBe("");
    expect(doc.title.es).toBe("");
    expect(doc.body.ko).toHaveLength(3);
    expect(doc.body.en).toEqual([]);
  });

  it("records origin + template + tournamentId verbatim", () => {
    const doc = buildArticleDraft(validInput());
    expect(doc.origin).toBe("event_open");
    expect(doc.template).toBe("open");
    expect(doc.tournamentId).toBe("t_summer48");
  });

  it("has no way to be told to be 'published' — status is not an input", () => {
    // TypeScript-level guarantee mirrored at runtime: whatever the caller passes,
    // the builder hard-codes 'draft'. There is no `status` field on the input.
    const doc = buildArticleDraft(validInput());
    expect(doc.status).not.toBe("published");
  });

  it("throws on an invalid slug", () => {
    expect(() => buildArticleDraft(validInput({ slug: "nope" }))).toThrow();
  });

  it("throws on an invalid body", () => {
    expect(() => buildArticleDraft(validInput({ body: [] }))).toThrow();
  });

  it("throws on an empty source title", () => {
    expect(() => buildArticleDraft(validInput({ title: "   " }))).toThrow();
  });

  it("every draft origin is a draft-only source (no origin implies publish)", () => {
    for (const o of ARTICLE_ORIGINS) {
      expect(isDraftOnlyOrigin(o)).toBe(true);
    }
  });
});

describe("buildLocalizedArticleDraft — 3-lang draft (translation already done, AC 8)", () => {
  const locInput = (over: Partial<LocalizedArticleDraftInput> = {}): LocalizedArticleDraftInput => ({
    slug: "20260722-a1b2c3",
    template: "open",
    origin: "manual_ai",
    sourceLang: "ko",
    title: { ko: "여름 차트", en: "Summer Chart", es: "Lista de verano" },
    subhead: { ko: "48곡", en: "48 songs", es: "48 canciones" },
    body: {
      ko: [{ type: "lead", text: "리드" }],
      en: [{ type: "lead", text: "lead" }],
      es: [{ type: "lead", text: "entrada" }],
    },
    evidence: { asOf: "now", stats: [{ label: "C", value: "48" }] },
    tournamentId: "t1",
    ...over,
  });

  it("still produces a draft (never published)", () => {
    const doc = buildLocalizedArticleDraft(locInput());
    expect(doc.status).toBe("draft");
    expect(doc.publishedAt).toBeNull();
  });

  it("carries all three language slots verbatim", () => {
    const doc = buildLocalizedArticleDraft(locInput());
    expect(doc.title).toEqual({ ko: "여름 차트", en: "Summer Chart", es: "Lista de verano" });
    expect(doc.body.es[0]).toEqual({ type: "lead", text: "entrada" });
  });

  it("throws when the source-language slot is empty (nothing to publish)", () => {
    expect(() =>
      buildLocalizedArticleDraft(
        locInput({ title: { ko: "  ", en: "x", es: "y" } }),
      ),
    ).toThrow();
  });

  it("throws when the source-language body is invalid/empty", () => {
    expect(() =>
      buildLocalizedArticleDraft(
        locInput({ body: { ko: [], en: [{ type: "lead", text: "x" }], es: [] } }),
      ),
    ).toThrow();
  });

  it("tolerates a not-yet-translated slot (empty en/es) — fallback happens at render", () => {
    const doc = buildLocalizedArticleDraft(
      locInput({
        title: { ko: "여름 차트", en: "", es: "" },
        body: { ko: [{ type: "lead", text: "리드" }], en: [], es: [] },
      }),
    );
    expect(doc.title.en).toBe("");
    expect(doc.status).toBe("draft");
  });
});

describe("canTransition — publish is a separate explicit act (AC 1 · AC 5)", () => {
  it("allows draft → published (admin publish)", () => {
    expect(canTransition("draft", "published")).toBe(true);
  });
  it("allows published → archived (내리기)", () => {
    expect(canTransition("published", "archived")).toBe(true);
  });
  it("allows archived → published (재발행)", () => {
    expect(canTransition("archived", "published")).toBe(true);
  });
  it("allows draft → archived (초안 폐기)", () => {
    expect(canTransition("draft", "archived")).toBe(true);
  });
  it("forbids published → draft (a published article can't silently un-publish to draft)", () => {
    expect(canTransition("published", "draft")).toBe(false);
  });
  it("forbids a no-op self-transition", () => {
    expect(canTransition("draft", "draft")).toBe(false);
    expect(canTransition("published", "published")).toBe(false);
  });
});

describe("constants + helpers", () => {
  it("exposes the 4 templates and 5 origins", () => {
    expect(ARTICLE_TEMPLATES).toEqual(["open", "result", "weekly", "column"]);
    expect(ARTICLE_ORIGINS).toEqual([
      "event_open",
      "event_champion",
      "cron_weekly",
      "manual_ai",
      "manual_blank",
    ]);
  });
  it("emptyLocalizedText / emptyLocalizedBlocks are fully-populated blanks", () => {
    expect(emptyLocalizedText()).toEqual({ ko: "", en: "", es: "" });
    expect(emptyLocalizedBlocks()).toEqual({ ko: [], en: [], es: [] });
  });
});
