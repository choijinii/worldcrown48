/**
 * Tournament + Contestant domain contract (Domain 2 · The Lab).
 *
 * Single source of truth for the shapes B-1 writes to Firestore and C-1/C-2
 * later read. Pure type declarations — no runtime behavior, so no test.
 *
 * Terminology is LANGUAGE.md-official: Tournament, Contestant, Champion,
 * Voter, Match. Never Candidate / 대회 / Battle.
 *
 * Note on `Timestamp`: this contract is consumed by both client (firebase/
 * firestore) and Cloud Functions (firebase-admin/firestore), whose Timestamp
 * types are nominally different. We keep the field types structural here and
 * let the write-side builders stamp the concrete value (serverTimestamp()).
 */

/**
 * A Tournament category id (UPPER_SNAKE, e.g. "KPOP"). TX-0 (2026-07-11):
 * categories are Firestore DATA (a `categories` collection), NOT a code enum,
 * so a Tournament just carries the id string. Validity is checked against the
 * loaded category id list (lib/taxonomy · isValidCategoryId) at every trust
 * boundary — never a hard-coded tuple. The doc shape lives in
 * `lib/taxonomy/category.ts` (CategoryDoc). See LANGUAGE.md §13.
 */
export type Category = string;

/** Exactly 48 Contestants per Tournament — the binary tree halves 48→24→12→6→FINAL. */
export const TOTAL_CONTESTANTS = 48;

export type TournamentStatus = "active" | "ended" | "draft";

/**
 * currentRound: 1=ROUND OF 48, 2=ROUND OF 24, 3=ROUND OF 12, 4=ROUND OF 6,
 * 5=THE FINAL. There is NO ROUND OF 16 / QF / SF (FIFA names forbidden).
 */
export type RoundIndex = 1 | 2 | 3 | 4 | 5;

export interface TournamentSettings {
  aiNews: boolean;
  multiLang: boolean;
  showRanking: boolean;
}

/**
 * A ko/en/es string bundle. B-2 (2026-07-11): title·description are translated
 * once at publish (Haiku) and STORED here — consumption stays each module's job
 * (same "store, don't consume" contract as `keywords`). All three slots are
 * populated (the untranslated ones fall back to the original input), so a reader
 * always has a value. `title` (the flat original) is kept for back-compat with
 * every existing read site (Arena/Pitch/Launch/Crown) — this is ADDITIVE, not a
 * migration. See handoff §3 / 대표 결정 #3.
 */
export interface LocalizedText {
  ko: string;
  en: string;
  es: string;
}

export interface Tournament {
  id: string;
  title: string; // max 50 chars — flat ORIGINAL input, unchanged for back-compat
  titleI18n: LocalizedText; // B-2: additive 3-language title (translated at publish)
  description: LocalizedText; // B-2: participant-scope blurb, 3 languages (may be empty strings)
  keywords: string[]; // B-2: ≤12, each ≤30 chars — AI-fill hint + C-4 news + C-5 Fan Intelligence
  category: Category;
  status: TournamentStatus;
  hostUid: string;
  createdAt: unknown; // serverTimestamp() at write time
  tournamentDeadline: unknown | null; // Tournament-wide only — Round Deadline does NOT exist
  currentRound: RoundIndex;
  totalContestants: typeof TOTAL_CONTESTANTS;
  settings: TournamentSettings;
  featured: boolean; // exactly one Tournament true at a time (Launch Pad hero)
}

export interface Contestant {
  id: string;
  tournamentId: string;
  hostUid: string; // denormalized from the Tournament — enables batch-safe Firestore rules
  order: number; // 1..48
  name: string;
  nationality: string;
  position: string;
  imageUrl: string; // operator-entered, license-checked (never auto-downloaded)
  imageSearchKeyword: string; // Claude-suggested search term only
}

/**
 * The shape Claude returns per Contestant before the operator edits and the
 * system assigns order/tournamentId/imageUrl. No `imageUrl` — copyright
 * (불변 원칙 #6): the function returns a search keyword, the operator pastes a
 * licensed URL.
 */
export interface AiContestantSuggestion {
  name: string;
  nationality: string;
  position: string;
  imageSearchKeyword: string;
}
