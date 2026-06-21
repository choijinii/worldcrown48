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
import {
  TOTAL_CONTESTANTS,
  type Category,
  type Contestant,
  type Tournament,
} from "@/lib/types/tournament";

export interface TournamentInput {
  title: string;
  category: Category;
  hostUid: string;
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

export function buildTournamentDoc(input: TournamentInput): TournamentDocData {
  const title = validateTitle(input.title);
  if (!title.isValid) {
    throw new Error("Tournament 제목이 유효하지 않습니다 (1~50자).");
  }
  if (!isValidCategory(input.category)) {
    throw new Error(`유효하지 않은 카테고리: ${String(input.category)}`);
  }
  if (!input.hostUid) {
    throw new Error("hostUid가 필요합니다.");
  }

  return {
    title: title.value,
    category: input.category,
    status: "active",
    hostUid: input.hostUid,
    tournamentDeadline: null,
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
