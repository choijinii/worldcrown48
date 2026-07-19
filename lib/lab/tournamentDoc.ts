/**
 * Firestore payload builders for Publish (Domain 2 · The Lab, Step 3).
 *
 * Pure functions that turn operator input into the exact document shapes from
 * 부록 A. They own the write-time invariants (status='active', currentRound=1,
 * featured=false, exactly 48 contestants with 1-based order) so the component
 * just spreads `createdAt: serverTimestamp()` and commits a writeBatch.
 *
 * `createdAt` and `id` are intentionally NOT set here — serverTimestamp() and
 * doc ids are Firestore-side concerns the caller stamps, keeping these
 * functions deterministic and node-env testable.
 */
import { isValidCategory } from "@/lib/lab/categories";
import { validateTitle } from "@/lib/lab/titleValidation";
import { validateKeywords } from "@/lib/lab/keywordsValidation";
import { validateDeadline } from "@/lib/lab/deadlineValidation";
import {
  TOTAL_CONTESTANTS,
  type Category,
  type Contestant,
  type LocalizedText,
  type Tournament,
} from "@/lib/types/tournament";

export interface TournamentInput {
  /** Flat original title (validated ≤50). Kept for back-compat reads. */
  title: string;
  /** Additive 3-language title (original in the source slot + translations). */
  titleI18n: LocalizedText;
  /** 3-language participant blurb (empty strings when the host skips it). */
  description: LocalizedText;
  /** Raw keyword chips — normalized + validated here (≥1, ≤12, each ≤30). */
  keywords: string[];
  category: Category;
  hostUid: string;
  /** Chosen deadline as epoch ms — must be strictly in the future. */
  deadlineMs: number;
}

/** A Tournament doc minus the Firestore-owned `id` and `createdAt`. */
export type TournamentDocData = Omit<Tournament, "id" | "createdAt">;

/** Operator-editable Contestant row before order/tournamentId are assigned. */
export interface ContestantDraft {
  name: string;
  nationality: string;
  position: string;
  imageUrl: string;
  imageSearchKeyword: string;
}

/** A Contestant doc minus the Firestore-owned `id`. */
export type ContestantDocData = Omit<Contestant, "id">;

export function buildTournamentDoc(
  input: TournamentInput,
  validCategoryIds: readonly string[],
  nowMs: number,
): TournamentDocData {
  const title = validateTitle(input.title);
  if (!title.isValid) {
    throw new Error("Tournament 제목이 유효하지 않습니다 (1~50자).");
  }
  // TX-0: category validity is data-driven — the caller passes the ids loaded
  // from the `categories` collection (never a hard-coded tuple). This is the
  // AUTHORITATIVE membership check: a Tournament can only be created with a
  // known category id, so a bad category never becomes a real Tournament.
  if (!isValidCategory(input.category, validCategoryIds)) {
    throw new Error(`유효하지 않은 카테고리: ${String(input.category)}`);
  }
  if (!input.hostUid) {
    throw new Error("hostUid가 필요합니다.");
  }
  const keywords = validateKeywords(input.keywords);
  if (!keywords.isValid) {
    throw new Error("키워드는 1~12개, 각 30자 이하여야 합니다.");
  }
  const deadline = validateDeadline(input.deadlineMs, nowMs);
  if (!deadline.isValid) {
    throw new Error("Tournament Deadline은 미래 시각이어야 합니다.");
  }

  return {
    title: title.value,
    titleI18n: input.titleI18n,
    description: input.description,
    keywords: keywords.values,
    category: input.category,
    status: "active",
    hostUid: input.hostUid,
    // Pure/testable value — the caller stamps the real Firestore Timestamp
    // (Timestamp.fromMillis) just as it stamps createdAt: serverTimestamp().
    tournamentDeadline: input.deadlineMs,
    currentRound: 1,
    totalContestants: TOTAL_CONTESTANTS,
    settings: { aiNews: false, multiLang: false, showRanking: true },
    featured: false,
  };
}

export function buildContestantDocs(
  tournamentId: string,
  hostUid: string,
  drafts: ContestantDraft[],
): ContestantDocData[] {
  if (drafts.length !== TOTAL_CONTESTANTS) {
    throw new Error(
      `정확히 ${TOTAL_CONTESTANTS}명이 필요합니다 (받음: ${drafts.length}).`,
    );
  }
  return drafts.map((d, i) => ({
    tournamentId,
    hostUid,
    order: i + 1,
    name: d.name,
    nationality: d.nationality,
    position: d.position,
    imageUrl: d.imageUrl,
    imageSearchKeyword: d.imageSearchKeyword,
  }));
}
