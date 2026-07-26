/**
 * renderArticle — the pure display selector shared by the admin editor preview
 * and the public /news renderer (ND-1 Phase 4·5). Keeps the language-fallback
 * decision node-testable so both surfaces render identically.
 *
 * A draft/article stores every language slot, but en/es may be empty until
 * translated. resolveArticleView picks the requested language and falls each
 * field back to the source-language slot independently, so a reader never sees a
 * blank en/es page (AC 8 — 미번역 언어 원문 fallback at render time).
 */
import type { ArticleBlock, LocalizedText, LocalizedBlocks, Lang } from "./articleDoc";
import { LANGS } from "./articleDoc";

/** The first populated language slot of a LocalizedText, or null if all empty. */
export function firstFilledLang(text: LocalizedText): Lang | null {
  for (const l of LANGS) {
    if (text[l] && text[l].trim()) return l;
  }
  return null;
}

export interface ArticleView {
  title: string;
  subhead: string;
  body: ArticleBlock[];
  /** The language actually shown for the title (requested, or fallback source). */
  lang: Lang;
  /** True when any field fell back to the source language. */
  isFallback: boolean;
}

function pickText(text: LocalizedText, lang: Lang): { value: string; fell: boolean } {
  if (text[lang] && text[lang].trim()) return { value: text[lang], fell: false };
  const src = firstFilledLang(text);
  return { value: src ? text[src] : "", fell: src !== null && src !== lang };
}

function pickBody(body: LocalizedBlocks, lang: Lang): { value: ArticleBlock[]; fell: boolean } {
  if (body[lang] && body[lang].length > 0) return { value: body[lang], fell: false };
  for (const l of LANGS) {
    if (body[l] && body[l].length > 0) {
      return { value: body[l], fell: l !== lang };
    }
  }
  return { value: [], fell: false };
}

export function resolveArticleView(
  doc: {
    title: LocalizedText;
    subhead: LocalizedText;
    body: LocalizedBlocks;
  },
  lang: Lang,
): ArticleView {
  const title = pickText(doc.title, lang);
  const subhead = pickText(doc.subhead, lang);
  const body = pickBody(doc.body, lang);
  return {
    title: title.value,
    subhead: subhead.value,
    body: body.value,
    lang,
    isFallback: title.fell || subhead.fell || body.fell,
  };
}
