/**
 * blockEdit — pure helpers behind the /admin/newsdesk 3-language block editor.
 *
 * The editor exposes only TEXT fields (block copy · labels · notes); data fields
 * (stats.n numbers, matchup group/title proper nouns) stay put — same "수치·고유
 * 명사 원문 유지" rule the translator enforces. Immutable updates keep React state
 * predictable, and cloneBlocksForTranslation lets an operator seed an empty target
 * language from the source without aliasing it.
 */
import type { ArticleBlock } from "./articleDoc";

export interface EditableText {
  /** Dot path within the block (e.g. "text", "items.0.l", "note"). */
  path: string;
  value: string;
  multiline: boolean;
}

/** The translatable text fields the editor should render for a block. */
export function blockEditableText(block: ArticleBlock): EditableText[] {
  switch (block.type) {
    case "lead":
    case "paragraph":
    case "closer":
      return [{ path: "text", value: block.text, multiline: true }];
    case "hero":
      return [
        { path: "kicker", value: block.kicker, multiline: false },
        { path: "title", value: block.title, multiline: false },
        { path: "subtitle", value: block.subtitle, multiline: false },
      ];
    case "stats":
      return block.items.map((it, i) => ({
        path: `items.${i}.l`,
        value: it.l,
        multiline: false,
      }));
    case "matchups":
      return [{ path: "note", value: block.note, multiline: true }];
    default:
      return [];
  }
}

function setAtPath<T>(obj: T, path: string, value: string): T {
  const keys = path.split(".");
  const clone: unknown = Array.isArray(obj) ? [...obj] : { ...obj };
  let cur = clone as Record<string, unknown>;
  for (let i = 0; i < keys.length - 1; i++) {
    const k = keys[i];
    const child = cur[k];
    cur[k] = Array.isArray(child) ? [...child] : { ...(child as object) };
    cur = cur[k] as Record<string, unknown>;
  }
  cur[keys[keys.length - 1]] = value;
  return clone as T;
}

/** Immutably set a text field (dot path) of the block at `index`. */
export function updateBlockText(
  blocks: ArticleBlock[],
  index: number,
  path: string,
  value: string,
): ArticleBlock[] {
  return blocks.map((b, i) => (i === index ? setAtPath(b, path, value) : b));
}

/** Deep clone a block array (structuredClone-free — JSON round-trip is enough). */
export function cloneBlocksForTranslation(blocks: ArticleBlock[]): ArticleBlock[] {
  return JSON.parse(JSON.stringify(blocks)) as ArticleBlock[];
}
