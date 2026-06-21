/**
 * Publish-readiness (Domain 2 · The Lab, Step 2 → 3).
 *
 * A Tournament publishes only when all 48 Contestants are named (AC Step2 #8 /
 * Step3). A node counts as filled by a non-empty trimmed name; imageUrl stays
 * optional (operator pastes a licensed URL when available).
 */
import { TOTAL_CONTESTANTS } from "@/lib/types/tournament";
import type { ContestantDraft } from "@/lib/lab/tournamentDoc";

export function countFilledContestants(drafts: ContestantDraft[]): number {
  return drafts.filter((d) => d.name.trim() !== "").length;
}

export function isPublishReady(drafts: ContestantDraft[]): boolean {
  return countFilledContestants(drafts) === TOTAL_CONTESTANTS;
}
