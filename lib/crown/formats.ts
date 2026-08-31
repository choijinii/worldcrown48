/**
 * C-2 Crown Card · share format contract.
 *
 * The three canvas output ratios, ported verbatim from the wireframe truth
 * source (docs/design/wireframes/Domain 3 · The Arena.html line 1076-1080).
 * Frozen so the share-menu chips (AC-3), the dimension labels (AC-4), the
 * client preview, and the server PNG renderer can never drift apart.
 *
 *   story 1080×1920 (9:16)   — Instagram Stories / Reels
 *   feed  1080×1350 (4:5)    — Instagram Feed
 *   link  1200×630  (1.91:1) — X / Facebook / KakaoTalk OG (also the server card)
 */

export interface FormatSpec {
  readonly w: number;
  readonly h: number;
  readonly label: string;
}

export const FORMATS = Object.freeze({
  story: Object.freeze({ w: 1080, h: 1920, label: "1080 × 1920 px · PNG" }),
  feed: Object.freeze({ w: 1080, h: 1350, label: "1080 × 1350 px · PNG" }),
  link: Object.freeze({ w: 1200, h: 630, label: "1200 × 630 px · PNG" }),
}) satisfies Readonly<Record<string, FormatSpec>>;

export type FormatKey = keyof typeof FORMATS;

/** Stable display order for the format chips (story · feed · link). */
export const FORMAT_KEYS: readonly FormatKey[] = ["story", "feed", "link"];

/**
 * The data a Crown Card renders — resolved from the Champion Contestant +
 * Tournament (see lib/crown/championLoader.ts). Pure render input: no DOM,
 * no Firestore. `path` is the fixed victory-route flow string (NOT a Round
 * HUD — CLAUDE.md 대진 원칙 #5 / handoff §5 DON'T).
 */
export interface CrownData {
  /** Single-letter fallback shown when no photo is available. */
  initial: string;
  /** Champion display name (fit() shrinks to fit the card). */
  name: string;
  /** Tournament title shown under the name. */
  title: string;
  /** Bare host shown on the card, e.g. "worldcrown48.com". */
  url: string;
  /** Victory-route flow text: "48 → 24 → 12 → 6 → THE FINAL". */
  path: string;
  /**
   * utm_campaign for every share link made from this card (UTM_RULES v1.0 §1):
   * the Tournament's campaignSlug, else its normalized id, else "site".
   * Not drawn on the card — carried so shareIntents never re-derives it from
   * the URL string (championLoader.toCrownData is the single source).
   */
  campaign: string;
}
