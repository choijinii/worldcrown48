/**
 * newsDraftAssembly — pure helpers shared by the callable/triggers/cron
 * (ND-1 §3 #4·#6). No Firestore/Anthropic here; those live in the wrappers.
 *
 *   - parseNewsDraftReply: Haiku 블록 JSON(OUTPUT_SPEC "blocks") → 검증된 초안
 *   - newsDraftExists: origin+tournamentId 멱등 판정 (at-least-once 전달 대비)
 */
import { validateBlocks, type ArticleBlock } from "../_news/articleDoc";

export class NewsDraftParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NewsDraftParseError";
  }
}

export interface ParsedNewsDraft {
  title: string;
  subhead: string;
  body: ArticleBlock[];
}

function toStr(v: unknown): string {
  return typeof v === "string" ? v : "";
}

/**
 * Parse a Haiku draft reply into a validated {title, subhead, body}. The prompt
 * OUTPUT_SPEC asks for `{ title, subhead, blocks: Block[] }`; we accept `blocks`
 * (and tolerate `body`) and validate the block model before it can become a doc.
 * Throws NewsDraftParseError on anything unusable — the wrapper surfaces internal.
 */
export function parseNewsDraftReply(text: string): ParsedNewsDraft {
  const match = text.match(/\{[\s\S]*\}/);
  let obj: Record<string, unknown>;
  try {
    obj = JSON.parse(match ? match[0] : text) as Record<string, unknown>;
  } catch {
    throw new NewsDraftParseError("draft reply is not JSON");
  }
  const title = toStr(obj.title).trim();
  if (!title) throw new NewsDraftParseError("draft reply has no title");
  const rawBlocks = Array.isArray(obj.blocks)
    ? obj.blocks
    : Array.isArray(obj.body)
      ? obj.body
      : [];
  const body = rawBlocks as ArticleBlock[];
  const check = validateBlocks(body);
  if (!check.ok) {
    throw new NewsDraftParseError(`draft reply blocks invalid: ${check.error}`);
  }
  return { title, subhead: toStr(obj.subhead).trim(), body };
}

export interface ExistingDraftKey {
  origin: string;
  tournamentId?: string;
}

/**
 * Idempotency guard: has a draft with this (origin, tournamentId) already been
 * created? An open draft and a result draft for the same Tournament coexist
 * (different origin) — only the SAME origin+tournament pair is a duplicate.
 */
export function newsDraftExists(
  existing: ExistingDraftKey[],
  origin: string,
  tournamentId?: string,
): boolean {
  return existing.some(
    (e) => e.origin === origin && e.tournamentId === tournamentId,
  );
}
