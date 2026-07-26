/**
 * translateArticleCore — Option A (per-language) translation for a news article,
 * extended from translateTournamentMetaCore to the block body (ND-1 §3 #5, AC 8).
 *
 * ONE Haiku call per target language returns the whole article {title, subhead,
 * body}. A per-language failure — throw, unparseable reply, empty title, or a
 * STRUCTURAL mismatch (block count or type sequence differs from source) — falls
 * that WHOLE language back to the source AND logs. A working language is never
 * lost to a sibling's failure (the prod es-slot regression this pattern guards).
 *
 * Data integrity: even on a valid reply we take only TEXT from the model and keep
 * data fields (stats.n numbers · matchup group/title proper nouns) from the source
 * — the §5.5/OUTPUT_SPEC "수치·고유명사 원문 유지" rule enforced in code, not trust.
 *
 * Block types MUST stay structurally in sync with lib/news/articleDoc.ts (functions
 * cannot import root lib/ — rootDir=src; duplicated by project precedent, like
 * voteErrorCodes / Category / cors).
 */

export type Lang = "ko" | "en" | "es";
const LANGS: Lang[] = ["ko", "en", "es"];

export interface HeroBlock {
  type: "hero";
  kicker: string;
  title: string;
  subtitle: string;
  imageUrl?: string;
}
export interface LeadBlock {
  type: "lead";
  text: string;
}
export interface ParagraphBlock {
  type: "paragraph";
  text: string;
}
export interface StatsBlock {
  type: "stats";
  items: { n: string; l: string }[];
}
export interface MatchupsBlock {
  type: "matchups";
  pairs: {
    left: { group: string; title: string };
    right: { group: string; title: string };
  }[];
  note: string;
}
export interface CloserBlock {
  type: "closer";
  text: string;
}
export type ArticleBlock =
  | HeroBlock
  | LeadBlock
  | ParagraphBlock
  | StatsBlock
  | MatchupsBlock
  | CloserBlock;

export interface LocalizedText {
  ko: string;
  en: string;
  es: string;
}
export type LocalizedBlocks = {
  ko: ArticleBlock[];
  en: ArticleBlock[];
  es: ArticleBlock[];
};

export interface TranslateArticleInput {
  title: string;
  subhead: string;
  body: ArticleBlock[];
  sourceLang: Lang;
}

export interface TranslateArticleDeps {
  createMessage: (prompt: string) => Promise<string>;
  logError?: (message: string, err: unknown) => void;
}

export interface TranslateArticleResult {
  title: LocalizedText;
  subhead: LocalizedText;
  body: LocalizedBlocks;
}

const LANG_NAME: Record<Lang, string> = {
  ko: "Korean(한국어)",
  en: "English",
  es: "Spanish(español)",
};

export function buildArticleTranslatePrompt(
  input: TranslateArticleInput,
  target: Lang,
): string {
  return [
    `다음 뉴스 기사를 ${LANG_NAME[target]}(${target})로 자연스럽게 번역해줘.`,
    "블록 구조(type·순서·개수)를 그대로 유지하고, 텍스트 필드만 번역한다.",
    "수치(stats.n)와 고유명사(matchups group/title)는 원문 데이터 그대로 둔다.",
    "",
    `제목: ${JSON.stringify(input.title)}`,
    `부제: ${JSON.stringify(input.subhead)}`,
    `본문 블록: ${JSON.stringify(input.body)}`,
    "",
    'JSON 객체 하나로만 반환: { "title": string, "subhead": string, "body": Block[] }',
    "JSON 외 텍스트 금지.",
  ].join("\n");
}

function toStr(v: unknown): string {
  return typeof v === "string" ? v : "";
}

interface Parsed {
  title: string;
  subhead: string;
  body: unknown[];
}

/**
 * Merge a reply block onto its source block: keep the source's structure + data
 * fields, take only translated TEXT. Returns null if the reply block's type does
 * not match the source (structural mismatch → caller falls the whole lang back).
 */
function mergeBlock(src: ArticleBlock, reply: unknown): ArticleBlock | null {
  const r = (reply ?? {}) as Record<string, unknown>;
  if (r.type !== src.type) return null;
  switch (src.type) {
    case "lead":
    case "paragraph":
    case "closer":
      return { type: src.type, text: toStr(r.text).trim() || src.text };
    case "hero":
      return {
        type: "hero",
        kicker: toStr(r.kicker).trim() || src.kicker,
        title: toStr(r.title).trim() || src.title,
        subtitle: toStr(r.subtitle).trim() || src.subtitle,
        ...(src.imageUrl ? { imageUrl: src.imageUrl } : {}),
      };
    case "stats": {
      const rItems = Array.isArray(r.items) ? (r.items as Record<string, unknown>[]) : [];
      return {
        type: "stats",
        items: src.items.map((it, i) => ({
          n: it.n, // data — kept verbatim
          l: toStr(rItems[i]?.l).trim() || it.l,
        })),
      };
    }
    case "matchups": {
      return {
        type: "matchups",
        pairs: src.pairs, // proper nouns — kept verbatim
        note: toStr(r.note).trim() || src.note,
      };
    }
    default:
      return null;
  }
}

/** Translate the whole article into ONE target language. Resilient (see header). */
async function translateOneLang(
  input: TranslateArticleInput,
  target: Lang,
  deps: TranslateArticleDeps,
): Promise<{ title: string; subhead: string; body: ArticleBlock[] } | null> {
  let text: string;
  try {
    text = await deps.createMessage(buildArticleTranslatePrompt(input, target));
  } catch (e) {
    deps.logError?.(`translateArticle: ${target} model call failed`, e);
    return null;
  }
  const match = text.match(/\{[\s\S]*\}/);
  let parsed: Parsed;
  try {
    const obj = JSON.parse(match ? match[0] : text) as Record<string, unknown>;
    parsed = {
      title: toStr(obj.title).trim(),
      subhead: toStr(obj.subhead).trim(),
      body: Array.isArray(obj.body) ? obj.body : [],
    };
  } catch {
    deps.logError?.(`translateArticle: ${target} reply unparseable`, text.slice(0, 200));
    return null;
  }
  if (!parsed.title) {
    deps.logError?.(`translateArticle: ${target} empty title — source fallback`, {
      title: input.title,
    });
    return null;
  }
  if (parsed.body.length !== input.body.length) {
    deps.logError?.(
      `translateArticle: ${target} block count mismatch — source fallback`,
      { got: parsed.body.length, want: input.body.length },
    );
    return null;
  }
  const merged: ArticleBlock[] = [];
  for (let i = 0; i < input.body.length; i++) {
    const m = mergeBlock(input.body[i], parsed.body[i]);
    if (!m) {
      deps.logError?.(
        `translateArticle: ${target} block[${i}] type mismatch — source fallback`,
        { want: input.body[i].type },
      );
      return null;
    }
    merged.push(m);
  }
  return { title: parsed.title, subhead: parsed.subhead || input.subhead, body: merged };
}

export async function translateArticleCore(
  input: TranslateArticleInput,
  deps: TranslateArticleDeps,
): Promise<TranslateArticleResult> {
  const title = typeof input.title === "string" ? input.title.trim() : "";
  if (!title) throw new Error("source title is required");
  if (!LANGS.includes(input.sourceLang)) {
    throw new Error(`invalid sourceLang: ${input.sourceLang}`);
  }
  const subhead = typeof input.subhead === "string" ? input.subhead.trim() : "";
  const source = { ...input, title, subhead };

  const titleI18n: LocalizedText = { ko: "", en: "", es: "" };
  const subheadI18n: LocalizedText = { ko: "", en: "", es: "" };
  const bodyI18n: LocalizedBlocks = { ko: [], en: [], es: [] };
  titleI18n[input.sourceLang] = title;
  subheadI18n[input.sourceLang] = subhead;
  bodyI18n[input.sourceLang] = input.body;

  const targets = LANGS.filter((l) => l !== input.sourceLang);
  const results = await Promise.all(
    targets.map((l) => translateOneLang(source, l, deps)),
  );
  targets.forEach((l, i) => {
    const got = results[i];
    // Whole-language fallback to source on any failure — never a partial slot.
    titleI18n[l] = got ? got.title : title;
    subheadI18n[l] = got ? got.subhead : subhead;
    bodyI18n[l] = got ? got.body : input.body;
  });

  return { title: titleI18n, subhead: subheadI18n, body: bodyI18n };
}
