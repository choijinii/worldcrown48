/**
 * articleDoc — the `news` collection contract + write-time invariants (ND-1 §3 #1,
 * §4 ADR-ND1). Pure functions only, so the schema is node-env unit-tested and the
 * Firestore adapters (callable · triggers · cron) stay thin over it.
 *
 * The load-bearing invariant (AC 1 — 자동 발행 0건): every draft-producing source
 * calls `buildArticleDraft`, which HARD-CODES `status:'draft'` + `publishedAt:null`.
 * `status` is not an input, so no trigger/cron/callable can conjure a `published`
 * article. Publishing is a SEPARATE act expressed by `canTransition` — only the
 * admin console (/admin/newsdesk) drives draft→published. That split is the proof.
 *
 * Body model (ADR-ND1): `body` is a structured block array whose types map 1:1 to
 * the approved sample v3 지면 (hero · lead 드롭캡 · paragraph · stats 타일 · matchups
 * VS · closer). Text lives in blocks so translateArticleCore can localize per slot
 * while numbers/proper nouns stay put. Storage is per-language block arrays
 * (`LocalizedBlocks`), mirroring `LocalizedText` for title/subhead.
 */

export type Lang = "ko" | "en" | "es";
export const LANGS: readonly Lang[] = ["ko", "en", "es"] as const;

export const ARTICLE_TEMPLATES = ["open", "result", "weekly", "column"] as const;
export type ArticleTemplate = (typeof ARTICLE_TEMPLATES)[number];

export const ARTICLE_STATUSES = ["draft", "published", "archived"] as const;
export type ArticleStatus = (typeof ARTICLE_STATUSES)[number];

export const ARTICLE_ORIGINS = [
  "event_open",
  "event_champion",
  "cron_weekly",
  "manual_ai",
  "manual_blank",
] as const;
export type ArticleOrigin = (typeof ARTICLE_ORIGINS)[number];

export interface LocalizedText {
  ko: string;
  en: string;
  es: string;
}

// ── Structured body blocks (sample v3 지면 요소와 1:1) ──────────────────────
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
export interface StatItem {
  /** The datum (e.g. "48", "08-31") — kept verbatim across languages. */
  n: string;
  /** The label (e.g. "CONTESTANTS") — translatable. */
  l: string;
}
export interface StatsBlock {
  type: "stats";
  items: StatItem[];
}
export interface MatchupSide {
  /** Group/artist — proper noun, kept verbatim. */
  group: string;
  /** Match title — proper noun, kept verbatim. */
  title: string;
}
export interface MatchupPair {
  left: MatchupSide;
  right: MatchupSide;
}
export interface MatchupsBlock {
  type: "matchups";
  pairs: MatchupPair[];
  /** Editorial note under the matchups — translatable. */
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

export type LocalizedBlocks = {
  ko: ArticleBlock[];
  en: ArticleBlock[];
  es: ArticleBlock[];
};

/**
 * Evidence — the article's grounding data snapshot (ADR-ND1: stored IN the doc,
 * not a side collection, so article + 근거 stay atomic). Rendered beside the draft
 * in the admin 근거 스냅샷 패널 (교차검증의 시스템화).
 */
export interface EvidenceStat {
  label: string;
  value: string;
}
export interface Evidence {
  /** 기준시각 — the "DATA {기준시각}" the AI-Report block quotes. */
  asOf: string;
  stats: EvidenceStat[];
  tournamentId?: string;
}

export interface ArticleDoc {
  slug: string; // 고유·불변 (buildSlug)
  template: ArticleTemplate;
  status: ArticleStatus;
  title: LocalizedText;
  subhead: LocalizedText;
  body: LocalizedBlocks;
  evidence: Evidence;
  tournamentId?: string;
  origin: ArticleOrigin;
  createdAt: unknown; // serverTimestamp() at write time (Firestore-owned)
  publishedAt: unknown | null; // stamped only at publish (admin) — null while draft
}

// ── slug: {YYYYMMDD}-{6 base36} ────────────────────────────────────────────
const SLUG_RE = /^\d{8}-[0-9a-z]{6}$/;
const TOKEN_RE = /^[0-9a-z]{6}$/;

export function isValidSlug(slug: unknown): boolean {
  return typeof slug === "string" && SLUG_RE.test(slug);
}

/**
 * Build a slug from a date + a random base36 token. Randomness is a caller
 * concern (like serverTimestamp) — this stays pure/deterministic and only
 * enforces the format. Accepts YYYYMMDD or YYYY-MM-DD; normalizes to YYYYMMDD.
 */
export function buildSlug(args: { dateYYYYMMDD: string; token: string }): string {
  const date = args.dateYYYYMMDD.replace(/-/g, "");
  if (!/^\d{8}$/.test(date)) {
    throw new Error(`slug date must be YYYYMMDD: ${args.dateYYYYMMDD}`);
  }
  if (!TOKEN_RE.test(args.token)) {
    throw new Error(`slug token must be 6 lowercase base36 chars: ${args.token}`);
  }
  return `${date}-${args.token}`;
}

// ── block validation ───────────────────────────────────────────────────────
export interface ValidationResult {
  ok: boolean;
  error?: string;
}

const KNOWN_TYPES = new Set<ArticleBlock["type"]>([
  "hero",
  "lead",
  "paragraph",
  "stats",
  "matchups",
  "closer",
]);

function nonEmpty(v: unknown): boolean {
  return typeof v === "string" && v.trim().length > 0;
}

function validateBlock(b: ArticleBlock): ValidationResult {
  if (!b || typeof b !== "object" || !KNOWN_TYPES.has((b as ArticleBlock).type)) {
    return { ok: false, error: `unknown block type: ${String((b as { type?: unknown })?.type)}` };
  }
  switch (b.type) {
    case "lead":
    case "paragraph":
    case "closer":
      return nonEmpty(b.text)
        ? { ok: true }
        : { ok: false, error: `${b.type} block needs non-empty text` };
    case "hero":
      return nonEmpty(b.title)
        ? { ok: true }
        : { ok: false, error: "hero block needs a title" };
    case "stats":
      if (!Array.isArray(b.items) || b.items.length === 0) {
        return { ok: false, error: "stats block needs ≥1 item" };
      }
      return b.items.every((it) => nonEmpty(it.n) && nonEmpty(it.l))
        ? { ok: true }
        : { ok: false, error: "each stat item needs n + l" };
    case "matchups":
      if (!Array.isArray(b.pairs) || b.pairs.length === 0) {
        return { ok: false, error: "matchups block needs ≥1 pair" };
      }
      return b.pairs.every(
        (p) =>
          nonEmpty(p.left?.group) &&
          nonEmpty(p.left?.title) &&
          nonEmpty(p.right?.group) &&
          nonEmpty(p.right?.title),
      )
        ? { ok: true }
        : { ok: false, error: "each matchup pair needs left/right group+title" };
    default:
      return { ok: false, error: "unhandled block type" };
  }
}

/** An article body must be a non-empty array of valid blocks. */
export function validateBlocks(blocks: ArticleBlock[]): ValidationResult {
  if (!Array.isArray(blocks) || blocks.length === 0) {
    return { ok: false, error: "body needs ≥1 block" };
  }
  for (const b of blocks) {
    const r = validateBlock(b);
    if (!r.ok) return r;
  }
  return { ok: true };
}

// ── status transitions — publishing is a SEPARATE explicit act ──────────────
const ALLOWED_TRANSITIONS: ReadonlyArray<[ArticleStatus, ArticleStatus]> = [
  ["draft", "published"], // admin publish
  ["draft", "archived"], // 초안 폐기
  ["published", "archived"], // 내리기
  ["archived", "published"], // 재발행
];

export function canTransition(from: ArticleStatus, to: ArticleStatus): boolean {
  return ALLOWED_TRANSITIONS.some(([f, t]) => f === from && t === to);
}

/**
 * Every article-generating ORIGIN is draft-only — no origin ever implies publish.
 * (Trivially true today; a compile-time exhaustive guard against a future origin
 * that someone wires straight to `published`.)
 */
export function isDraftOnlyOrigin(_origin: ArticleOrigin): boolean {
  return true;
}

// ── blanks ───────────────────────────────────────────────────────────────
export function emptyLocalizedText(): LocalizedText {
  return { ko: "", en: "", es: "" };
}
export function emptyLocalizedBlocks(): LocalizedBlocks {
  return { ko: [], en: [], es: [] };
}

// ── draft builder — the only article factory; always draft ─────────────────
export interface ArticleDraftInput {
  slug: string;
  template: ArticleTemplate;
  origin: ArticleOrigin;
  /** Which language the AI/operator authored in — fills that i18n slot. */
  sourceLang: Lang;
  title: string;
  subhead: string;
  body: ArticleBlock[];
  evidence: Evidence;
  tournamentId?: string;
}

/**
 * The single article factory. Whatever the source (trigger, cron, callable,
 * manual), the result is a `draft` with `publishedAt:null`. `status` is NOT an
 * input — that is the runtime half of the "no auto-publish" guarantee (AC 1).
 * `createdAt` is left for the Firestore adapter to stamp (serverTimestamp).
 */
export function buildArticleDraft(
  input: ArticleDraftInput,
): Omit<ArticleDoc, "createdAt"> {
  if (!isValidSlug(input.slug)) {
    throw new Error(`invalid slug: ${input.slug}`);
  }
  if (!ARTICLE_TEMPLATES.includes(input.template)) {
    throw new Error(`invalid template: ${input.template}`);
  }
  if (!ARTICLE_ORIGINS.includes(input.origin)) {
    throw new Error(`invalid origin: ${input.origin}`);
  }
  if (!LANGS.includes(input.sourceLang)) {
    throw new Error(`invalid sourceLang: ${input.sourceLang}`);
  }
  const title = typeof input.title === "string" ? input.title.trim() : "";
  if (!title) {
    throw new Error("source title is required");
  }
  const blocks = validateBlocks(input.body);
  if (!blocks.ok) {
    throw new Error(`invalid body: ${blocks.error}`);
  }

  const titleI18n = emptyLocalizedText();
  const subheadI18n = emptyLocalizedText();
  const bodyI18n = emptyLocalizedBlocks();
  titleI18n[input.sourceLang] = title;
  subheadI18n[input.sourceLang] =
    typeof input.subhead === "string" ? input.subhead.trim() : "";
  bodyI18n[input.sourceLang] = input.body;

  const doc: Omit<ArticleDoc, "createdAt"> = {
    slug: input.slug,
    template: input.template,
    status: "draft", // ← hard-coded. never an input. (AC 1)
    title: titleI18n,
    subhead: subheadI18n,
    body: bodyI18n,
    evidence: input.evidence,
    origin: input.origin,
    publishedAt: null,
  };
  if (input.tournamentId) doc.tournamentId = input.tournamentId;
  return doc;
}

// ── localized draft builder — for the pipeline that translates BEFORE saving ──
export interface LocalizedArticleDraftInput {
  slug: string;
  template: ArticleTemplate;
  origin: ArticleOrigin;
  /** Which language the AI/operator authored in — validated as non-empty. */
  sourceLang: Lang;
  title: LocalizedText;
  subhead: LocalizedText;
  body: LocalizedBlocks;
  evidence: Evidence;
  tournamentId?: string;
}

/**
 * Build a draft from ALREADY-localized fields (title/subhead/body in every slot).
 * Used by the generation pipeline, which translates (translateArticleCore) before
 * persisting so a draft lands 3-language. Still hard-codes `status:'draft'` (AC 1).
 * Only the SOURCE-language slot must be present + valid — a not-yet-translated
 * en/es slot may be empty (the renderer falls back to source at read time).
 */
export function buildLocalizedArticleDraft(
  input: LocalizedArticleDraftInput,
): Omit<ArticleDoc, "createdAt"> {
  if (!isValidSlug(input.slug)) throw new Error(`invalid slug: ${input.slug}`);
  if (!ARTICLE_TEMPLATES.includes(input.template)) {
    throw new Error(`invalid template: ${input.template}`);
  }
  if (!ARTICLE_ORIGINS.includes(input.origin)) {
    throw new Error(`invalid origin: ${input.origin}`);
  }
  if (!LANGS.includes(input.sourceLang)) {
    throw new Error(`invalid sourceLang: ${input.sourceLang}`);
  }
  const srcTitle = input.title?.[input.sourceLang]?.trim() ?? "";
  if (!srcTitle) throw new Error("source-language title is required");
  const srcBody = input.body?.[input.sourceLang] ?? [];
  const bodyCheck = validateBlocks(srcBody);
  if (!bodyCheck.ok) throw new Error(`invalid source body: ${bodyCheck.error}`);

  const doc: Omit<ArticleDoc, "createdAt"> = {
    slug: input.slug,
    template: input.template,
    status: "draft",
    title: input.title,
    subhead: input.subhead,
    body: input.body,
    evidence: input.evidence,
    origin: input.origin,
    publishedAt: null,
  };
  if (input.tournamentId) doc.tournamentId = input.tournamentId;
  return doc;
}
