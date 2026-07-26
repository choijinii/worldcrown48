/**
 * newsDraftPipeline — the shared draft-generation orchestration used by the
 * callable, the two event triggers, and the weekly cron (ND-1 §3 #4·#6·#7).
 *
 * Injected-dep (createMessage) so it is node-env unit-tested with no network:
 *   1. Haiku draft (source language) → parseNewsDraftReply
 *   2. translate the source article into the other two languages (Option A,
 *      translateArticleCore — per-language, resilient fallback + logError)
 *   3. buildLocalizedArticleDraft → a 3-language DRAFT (status:'draft' hard-coded)
 *
 * The whole pipeline can only ever yield a draft — that is the code-level proof
 * behind "자동 발행 0건" (AC 1): no source (event/cron/callable) reaches published.
 */
import {
  buildLocalizedArticleDraft,
  type ArticleDoc,
  type ArticleOrigin,
  type ArticleTemplate,
  type Evidence,
  type Lang,
} from "../_news/articleDoc";
import { parseNewsDraftReply } from "./newsDraftAssembly";
import { translateArticleCore } from "./translateArticleCore";

export interface AssembleDeps {
  createMessage: (prompt: string) => Promise<string>;
  logError?: (message: string, err: unknown) => void;
}

export interface AssembleArgs {
  slug: string;
  template: ArticleTemplate;
  origin: ArticleOrigin;
  sourceLang: Lang;
  /** The fully-built newsPrompts prompt (style guide + evidence + output spec). */
  prompt: string;
  evidence: Evidence;
  tournamentId?: string;
}

export async function assembleLocalizedDraft(
  args: AssembleArgs,
  deps: AssembleDeps,
): Promise<Omit<ArticleDoc, "createdAt">> {
  // 1. Haiku draft in the source language.
  const reply = await deps.createMessage(args.prompt);
  const parsed = parseNewsDraftReply(reply);

  // 2. Translate into the other two languages (source slot untouched).
  const translated = await translateArticleCore(
    {
      title: parsed.title,
      subhead: parsed.subhead,
      body: parsed.body,
      sourceLang: args.sourceLang,
    },
    { createMessage: deps.createMessage, logError: deps.logError },
  );

  // 3. Build the 3-language DRAFT. status is hard-coded to 'draft' inside.
  return buildLocalizedArticleDraft({
    slug: args.slug,
    template: args.template,
    origin: args.origin,
    sourceLang: args.sourceLang,
    title: translated.title,
    subhead: translated.subhead,
    body: translated.body,
    evidence: args.evidence,
    tournamentId: args.tournamentId,
  });
}
