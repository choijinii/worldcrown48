/**
 * crownCardRecord — pure crown_cards doc builder + validation (handoff §3, 부록 A).
 *
 * Maps the C-1 per-Voter Champion (`championId`) onto the crown_cards schema
 * field `championContestantId` (handoff §5 DON'T — the field-name bridge lives
 * here, never spread across callers). The trigger stamps `createdAt`
 * (serverTimestamp) after this builder runs — same split as advanceRound.
 *
 * TX-0 (2026-07-11): categories are Firestore DATA, not a code enum. The
 * category rides in from an already-validated Tournament doc, so the builder
 * enforces only its SHAPE (a non-empty string) — the authoritative id-membership
 * check lives at Tournament creation (buildTournamentDoc, data-driven). This
 * keeps the builder's caller contract unchanged and drops the duplicated tuple.
 *
 * RUN-1 (2026-09-05): 판마다 카드가 1장씩 남으므로 회차가 id에 들어간다. 1회차는 접미사가
 * 없어 옛 카드가 곧 1회차 카드다(§3.0 B안 · AC 11). 이름은 `runDocId` 한 곳에서만 만든다.
 */
import { runDocId } from "../_run/runDocId";

export interface CrownCardInput {
  voterUid: string;
  tournamentId: string;
  /** C-1 field name; mapped to championContestantId on the record. */
  championId: string;
  tournamentTitle: string;
  tournamentCategory: string;
  imageUrl: string;
  /** 이 카드가 나온 판의 회차 (RUN-1). */
  runIndex: number;
}

export interface CrownCardRecord {
  id: string;
  voterUid: string;
  tournamentId: string;
  runIndex: number;
  championContestantId: string;
  tournamentTitle: string;
  tournamentCategory: string;
  imageUrl: string;
  format: "link";
}

/**
 * Idempotency key / doc id for a Voter's Crown Card.
 * 1회차는 접미사가 없다(§3.0 B안) — 이름 규칙은 `runDocId` 안에만 있다.
 */
export function crownCardId(
  voterUid: string,
  tournamentId: string,
  runIndex: number,
): string {
  return runDocId(voterUid, tournamentId, runIndex);
}

/** Build + validate the crown_cards doc (without createdAt — the trigger stamps it). */
export function buildCrownCardRecord(input: CrownCardInput): CrownCardRecord {
  const { voterUid, tournamentId, championId, tournamentTitle, tournamentCategory, imageUrl, runIndex } = input;

  if (!championId) throw new Error("crown_cards: championId is required (no Champion → no card).");
  if (!voterUid) throw new Error("crown_cards: voterUid is required.");
  if (!tournamentId) throw new Error("crown_cards: tournamentId is required.");
  if (!tournamentTitle) throw new Error("crown_cards: tournamentTitle is required.");
  if (!imageUrl) throw new Error("crown_cards: imageUrl is required.");
  if (typeof tournamentCategory !== "string" || !tournamentCategory) {
    throw new Error("crown_cards: tournamentCategory is required.");
  }

  return {
    id: crownCardId(voterUid, tournamentId, runIndex),
    voterUid,
    tournamentId,
    runIndex,
    championContestantId: championId,
    tournamentTitle,
    tournamentCategory,
    imageUrl,
    format: "link",
  };
}
