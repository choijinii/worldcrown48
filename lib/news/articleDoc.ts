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
  /** PRESS-1 — TIO 가 매일 06:40 KST 에 쓰는 외신 종합 초안(웹 검색 · 초안만). */
  "cron_press",
] as const;
export type ArticleOrigin = (typeof ARTICLE_ORIGINS)[number];

// ── PRESS-1 3-1 — 외신 종합 기사 칸 (옛 기사에는 없다) ───────────────────────
export const ARTICLE_CATEGORIES = ["kpop", "creator"] as const;
export type ArticleCategory = (typeof ARTICLE_CATEGORIES)[number];

/**
 * 기본 그림 키워드 목록 — TIO 지시문 · 서버 검사 · Storage 폴더(`news-default/{분야}/{키워드}/`)가
 * 모두 이 한 곳을 읽는다(지시서 3-4 · 킥 v0.2 결정 2). 키워드를 더할 때 = 여기 한 줄 + 폴더 하나.
 */
export const PRESS_PHOTO_KEYWORDS: Readonly<Record<ArticleCategory, readonly string[]>> = {
  kpop: ["default", "comeback", "chart", "reverse-run", "debut", "stage", "broadcast", "award", "concert", "fandom", "challenge"],
  creator: ["default", "record", "collab", "youtube", "sns", "cover", "revenue", "business", "event", "challenge"],
};

/** 초안 1건의 다시 쓰기 상한(킥 v0.2 결정 3 · 4). */
export const PRESS_REWRITE_MAX = 2;

/** TIO 가 읽은 출처 한 줄. 주소는 그 호출의 검색 결과에 실제로 있던 것만(서버가 거른다). */
export interface ArticleSource {
  outlet: string;
  title: string;
  url: string;
  /** 읽은 날짜(KST · YYYY-MM-DD). */
  readAt: string;
}

/** 기사 대표 그림 — 우리 Storage 복사본 + 표기. isDefault = 기본 그림(키워드 폴더 · 로고)인지. */
export interface ArticlePhoto {
  url: string;
  author: string;
  licenseName: string;
  licenseUrl: string;
  sourcePageUrl: string;
  isDefault: boolean;
}

/** 외신 종합 초안을 만들 때만 넘기는 칸. photo 는 초안 뒤(뉴스데스크 · 발행)에 붙는다. */
export interface PressFields {
  category: ArticleCategory;
  sources: ArticleSource[];
  photoKeyword: unknown;
  rewriteCount?: number;
  rewriteOf?: string;
  rewriteNote?: string;
}

const HTTP_URL_RE = /^https?:\/\/[^\s]+$/i;
const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

function isHttpUrl(v: unknown): v is string {
  return typeof v === "string" && HTTP_URL_RE.test(v.trim());
}

/** 목록 밖 · 다른 분야의 키워드 · 빈 값 → "default". */
export function normalizePhotoKeyword(category: ArticleCategory, value: unknown): string {
  const v = typeof value === "string" ? value.trim().toLowerCase() : "";
  return PRESS_PHOTO_KEYWORDS[category]?.includes(v) ? v : "default";
}

export function isValidArticleSource(s: unknown): s is ArticleSource {
  if (!s || typeof s !== "object") return false;
  const o = s as Record<string, unknown>;
  return nonEmptyStr(o.outlet) && nonEmptyStr(o.title) && isHttpUrl(o.url) && typeof o.readAt === "string" && DAY_RE.test(o.readAt);
}

/** 그림 칸 모양 검사 — 작가는 CC0 · 퍼블릭 도메인이면 빈 글자일 수 있다. */
export function isValidArticlePhoto(p: unknown): p is ArticlePhoto {
  if (!p || typeof p !== "object") return false;
  const o = p as Record<string, unknown>;
  return (
    isHttpUrl(o.url) &&
    typeof o.author === "string" &&
    nonEmptyStr(o.licenseName) &&
    (o.licenseUrl === "" || isHttpUrl(o.licenseUrl)) &&
    (o.sourcePageUrl === "" || isHttpUrl(o.sourcePageUrl)) &&
    typeof o.isDefault === "boolean"
  );
}

function nonEmptyStr(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

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
  /**
   * ND-1 §3 #12 — optional YouTube embed for the hero (파사드 패턴). When present,
   * the renderer shows MediaSlot's facade; imageUrl is the still fallback. Data
   * field — kept verbatim across languages (never translated).
   */
  embed?: { videoId: string; start?: number; end?: number };
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
  // ── PRESS-1 — 외신 종합 기사에만 있다(옛 기사는 칸 자체가 없음) ──
  category?: ArticleCategory;
  sources?: ArticleSource[];
  photo?: ArticlePhoto;
  photoKeyword?: string;
  /** 0~2 — 이 초안이 몇 번째 다시 쓰기인지. */
  rewriteCount?: number;
  /** 다시 쓴 원래 초안의 slug. */
  rewriteOf?: string;
  /** 대표가 적은 고칠 점. */
  rewriteNote?: string;
}

/**
 * 외신 종합 칸 검사 + 정리 → 문서에 펼칠 칸. cron_press 는 칸이 꼭 있어야 하고,
 * 다른 출처에는 칸이 오면 안 된다(옛 기사 모양 그대로).
 */
function pressFieldsFor(origin: ArticleOrigin, press: PressFields | undefined): Partial<ArticleDoc> {
  if (origin !== "cron_press") {
    if (press !== undefined) throw new Error(`press fields are only for cron_press (got ${origin})`);
    return {};
  }
  if (!press) throw new Error("cron_press needs press fields");
  if (!ARTICLE_CATEGORIES.includes(press.category)) throw new Error(`invalid category: ${String(press.category)}`);
  if (!Array.isArray(press.sources) || !press.sources.every(isValidArticleSource)) {
    throw new Error("invalid sources");
  }
  const rewriteCount = press.rewriteCount ?? 0;
  if (!Number.isInteger(rewriteCount) || rewriteCount < 0 || rewriteCount > PRESS_REWRITE_MAX) {
    throw new Error(`rewriteCount must be 0..${PRESS_REWRITE_MAX}`);
  }
  const out: Partial<ArticleDoc> = {
    category: press.category,
    sources: press.sources.map((x) => ({ outlet: x.outlet.trim(), title: x.title.trim(), url: x.url.trim(), readAt: x.readAt })),
    photoKeyword: normalizePhotoKeyword(press.category, press.photoKeyword),
    rewriteCount,
  };
  if (press.rewriteOf !== undefined) {
    if (!isValidSlug(press.rewriteOf)) throw new Error(`invalid rewriteOf: ${press.rewriteOf}`);
    out.rewriteOf = press.rewriteOf;
  }
  if (press.rewriteNote !== undefined) out.rewriteNote = String(press.rewriteNote).trim();
  return out;
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
    // 외신 종합(cron_press)은 칸이 필요해 이 만들기로는 못 만든다 → buildLocalizedArticleDraft 만.
    ...pressFieldsFor(input.origin, undefined),
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
  /** PRESS-1 — origin 'cron_press' 일 때만(그때는 필수). */
  press?: PressFields;
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
    ...pressFieldsFor(input.origin, input.press),
  };
  if (input.tournamentId) doc.tournamentId = input.tournamentId;
  return doc;
}
