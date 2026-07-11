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
 */
export interface CrownCardInput {
  voterUid: string;
  tournamentId: string;
  /** C-1 field name; mapped to championContestantId on the record. */
  championId: string;
  tournamentTitle: string;
  tournamentCategory: string;
  imageUrl: string;
}

export interface CrownCardRecord {
  id: string;
  voterUid: string;
  tournamentId: string;
  championContestantId: string;
  tournamentTitle: string;
  tournamentCategory: string;
  imageUrl: string;
  format: "link";
}

/** Idempotency key / doc id for a Voter's Crown Card. */
export function crownCardId(voterUid: string, tournamentId: string): string {
  return `${voterUid}_${tournamentId}`;
}

/** Build + validate the crown_cards doc (without createdAt — the trigger stamps it). */
export function buildCrownCardRecord(input: CrownCardInput): CrownCardRecord {
  const { voterUid, tournamentId, championId, tournamentTitle, tournamentCategory, imageUrl } = input;

  if (!championId) throw new Error("crown_cards: championId is required (no Champion → no card).");
  if (!voterUid) throw new Error("crown_cards: voterUid is required.");
  if (!tournamentId) throw new Error("crown_cards: tournamentId is required.");
  if (!tournamentTitle) throw new Error("crown_cards: tournamentTitle is required.");
  if (!imageUrl) throw new Error("crown_cards: imageUrl is required.");
  if (typeof tournamentCategory !== "string" || !tournamentCategory) {
    throw new Error("crown_cards: tournamentCategory is required.");
  }

  return {
    id: crownCardId(voterUid, tournamentId),
    voterUid,
    tournamentId,
    championContestantId: championId,
    tournamentTitle,
    tournamentCategory,
    imageUrl,
    format: "link",
  };
}
