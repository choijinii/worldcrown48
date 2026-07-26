/**
 * ND-1 Phase 4 — pure block-editing helpers behind the 3-language editor.
 */
import { describe, expect, it } from "vitest";
import {
  updateBlockText,
  cloneBlocksForTranslation,
  blockEditableText,
} from "../news/blockEdit";
import type { ArticleBlock } from "../news/articleDoc";

describe("updateBlockText", () => {
  it("updates a text block's text immutably", () => {
    const blocks: ArticleBlock[] = [{ type: "lead", text: "old" }];
    const next = updateBlockText(blocks, 0, "text", "new");
    expect((next[0] as { text: string }).text).toBe("new");
    expect((blocks[0] as { text: string }).text).toBe("old"); // original untouched
  });

  it("updates a nested stats label without touching the number", () => {
    const blocks: ArticleBlock[] = [
      { type: "stats", items: [{ n: "48", l: "OLD" }] },
    ];
    const next = updateBlockText(blocks, 0, "items.0.l", "NEW");
    const b = next[0] as { items: { n: string; l: string }[] };
    expect(b.items[0]).toEqual({ n: "48", l: "NEW" });
  });
});

describe("cloneBlocksForTranslation", () => {
  it("deep-clones so editing a copied slot never mutates the source", () => {
    const src: ArticleBlock[] = [{ type: "lead", text: "리드" }];
    const copy = cloneBlocksForTranslation(src);
    (copy[0] as { text: string }).text = "edited";
    expect((src[0] as { text: string }).text).toBe("리드");
  });
});

describe("blockEditableText — which fields the editor exposes", () => {
  it("lead/paragraph/closer expose text", () => {
    expect(blockEditableText({ type: "lead", text: "x" })).toEqual([
      { path: "text", value: "x", multiline: true },
    ]);
  });
  it("stats exposes each label but not the number", () => {
    const fields = blockEditableText({
      type: "stats",
      items: [{ n: "48", l: "C" }],
    });
    expect(fields).toEqual([{ path: "items.0.l", value: "C", multiline: false }]);
  });
  it("matchups exposes the note only (proper nouns stay put)", () => {
    const fields = blockEditableText({
      type: "matchups",
      pairs: [{ left: { group: "A", title: "x" }, right: { group: "B", title: "y" } }],
      note: "n",
    });
    expect(fields).toEqual([{ path: "note", value: "n", multiline: true }]);
  });
});
