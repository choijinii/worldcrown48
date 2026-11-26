/**
 * pressReply — TIO 응답(웹 검색 도구를 쓴 Messages 응답) 읽기. 순수 모듈 · SDK 타입에 기대지 않는다.
 *
 *   collectSearchResults  응답 content 의 web_search_tool_result → 실제로 받은 주소 → 제목
 *   replyText             text 블록 잇기(검색 인용이 붙으면 글이 여러 블록으로 나뉜다)
 *   usageOf               usage → 읽기 · 쓰기 토큰 + usage.server_tool_use.web_search_requests
 *   parsePressReply       3언어 JSON → 제목 · 부제 · 본문(뼈대 lead → paragraph → closer) · 출처 · 키워드
 *   filterSources         검색 결과에 없던 주소를 버린다(지어낸 주소 금지 · 지시서 3-2)
 */
import { validateBlocks, type ArticleBlock, type ArticleSource, type LocalizedBlocks, type LocalizedText } from "../_news/articleDoc";
import type { PressUsage } from "./pressBudget";

export class PressReplyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PressReplyError";
  }
}

/** 같은 주소로 볼 모양: 앞뒤 공백 · # 뒤 · 끝 / 를 뗀다. */
export function normalizeUrl(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim().replace(/#.*$/, "").replace(/\/+$/, "");
  return /^https?:\/\/[^\s]+$/i.test(t) ? t : null;
}

type Block = { type?: unknown; [k: string]: unknown };

export function collectSearchResults(content: readonly unknown[]): Map<string, string> {
  const out = new Map<string, string>();
  for (const b of content as Block[]) {
    if (!b || b.type !== "web_search_tool_result" || !Array.isArray(b.content)) continue;
    for (const r of b.content as Block[]) {
      if (!r || r.type !== "web_search_result") continue;
      const url = normalizeUrl(r.url);
      if (url && !out.has(url)) out.set(url, typeof r.title === "string" ? r.title.trim() : "");
    }
  }
  return out;
}

export function replyText(content: readonly unknown[]): string {
  return (content as Block[])
    .filter((b) => b && b.type === "text" && typeof b.text === "string")
    .map((b) => b.text as string)
    .join("");
}

export function usageOf(usage: unknown): PressUsage | undefined {
  if (!usage || typeof usage !== "object") return undefined;
  const u = usage as { input_tokens?: unknown; output_tokens?: unknown; server_tool_use?: { web_search_requests?: unknown } };
  const n = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : 0);
  return {
    inputTokens: n(u.input_tokens),
    outputTokens: n(u.output_tokens),
    searches: n(u.server_tool_use?.web_search_requests),
  };
}

export interface ParsedPressReply {
  title: LocalizedText;
  subhead: LocalizedText;
  body: LocalizedBlocks;
  /** 아직 거르기 전(filterSources 가 거른다). */
  sources: unknown[];
  photoKeyword: unknown;
}

const LANG_KEYS = ["ko", "en", "es"] as const;

/** 뼈대 = lead 1 → paragraph 1개 이상 → closer 1. 그 밖 블록 종류는 외신 종합에 쓰지 않는다. */
function checkSkeleton(blocks: ArticleBlock[], lang: string): void {
  const v = validateBlocks(blocks);
  if (!v.ok) throw new PressReplyError(`${lang} blocks invalid: ${v.error}`);
  const types = blocks.map((b) => b.type);
  const middle = types.slice(1, -1);
  if (
    types.length < 3 ||
    types[0] !== "lead" ||
    types[types.length - 1] !== "closer" ||
    !middle.every((t) => t === "paragraph")
  ) {
    throw new PressReplyError(`${lang} blocks must be lead → paragraph… → closer (got ${types.join(",")})`);
  }
}

export function parsePressReply(text: string): ParsedPressReply {
  const match = text.match(/\{[\s\S]*\}/);
  let obj: Record<string, unknown>;
  try {
    obj = JSON.parse(match ? match[0] : text) as Record<string, unknown>;
  } catch {
    throw new PressReplyError("reply is not JSON");
  }
  const title = { ko: "", en: "", es: "" } as LocalizedText;
  const subhead = { ko: "", en: "", es: "" } as LocalizedText;
  const body = { ko: [], en: [], es: [] } as LocalizedBlocks;
  for (const l of LANG_KEYS) {
    const part = obj[l] as { title?: unknown; subhead?: unknown; blocks?: unknown } | undefined;
    const t = typeof part?.title === "string" ? part.title.trim() : "";
    if (!t) throw new PressReplyError(`${l} title is empty`);
    const blocks = (Array.isArray(part?.blocks) ? part.blocks : []) as ArticleBlock[];
    checkSkeleton(blocks, l);
    title[l] = t;
    subhead[l] = typeof part?.subhead === "string" ? part.subhead.trim() : "";
    body[l] = blocks;
  }
  return {
    title,
    subhead,
    body,
    sources: Array.isArray(obj.sources) ? obj.sources : [],
    photoKeyword: obj.photoKeyword,
  };
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

/** 검색 결과(allowed)에 있던 주소만 · 같은 주소는 한 번만 · 빈 제목/매체는 채운다. */
export function filterSources(raw: readonly unknown[], allowed: ReadonlyMap<string, string>, readAt: string): ArticleSource[] {
  const out: ArticleSource[] = [];
  const seen = new Set<string>();
  for (const r of raw) {
    if (!r || typeof r !== "object") continue;
    const o = r as { outlet?: unknown; title?: unknown; url?: unknown };
    const url = normalizeUrl(o.url);
    if (!url || !allowed.has(url) || seen.has(url)) continue;
    seen.add(url);
    const title = (typeof o.title === "string" && o.title.trim()) || allowed.get(url) || url;
    const outlet = (typeof o.outlet === "string" && o.outlet.trim()) || hostOf(url) || url;
    out.push({ outlet, title, url, readAt });
  }
  return out;
}
