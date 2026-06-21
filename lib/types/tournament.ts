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
 * The six Tournament categories. Multi-genre by design (대표 결정 2026-06-20)
 * — never a single hard-coded sport like "WORLD CUP 2026" (Domain 2 결정,
 * MENTAL_MODEL forbids the FIFA live-event framing). This enum is shared with
 * the G-1 admin console so the two consoles never drift.
 */
export const CATEGORIES = [
  "FOOTBALL",
  "KPOP",
  "ANIME",
  "GAMING",
  "MOVIE",
  "OTHER",
] as const;

export type Category = (typeof CATEGORIES)[number];

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

export interface Tournament {
  id: string;
  title: string; // max 50 chars
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
