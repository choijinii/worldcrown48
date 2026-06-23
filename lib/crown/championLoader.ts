/**
 * C-2 Crown Card · championLoader — the C-1 → C-2 seam.
 *
 * C-1's advanceRound writes a per-Voter `roundProgress/{uid}_{tournamentId}`
 * doc with `complete: true` and `championId` (handoff §0.3, ADR-0005). C-2 must
 * NOT wait on a global `tournaments.status` — there is no global Champion in the
 * per-Voter model (handoff §5 DON'T, §9 trap #1).
 *
 * This module is the field-name bridge: C-1 stores `championId`; the crown_cards
 * schema (부록 A) normalises to `championContestantId`. Keep the mapping here so
 * no other module hard-codes either name. Pure logic — node-env vitest (§11.2).
 */
import type { Contestant, Tournament } from "@/lib/types/tournament";
import type { CrownData } from "./formats";

/** The slice of roundProgress this loader reads (mirrors C-1's RoundProgressEvent). */
export interface RoundProgressLike {
  complete?: boolean;
  championId?: string | null;
}

/** The fixed victory-route flow string (NOT a Round HUD — handoff §5 DON'T). */
export const VICTORY_PATH = "48 → 24 → 12 → 6 → THE FINAL";

/**
 * Pull the confirmed Champion's Contestant id out of a roundProgress doc.
 * Throws unless the Voter has completed THE FINAL with a real pick — only a
 * confirmed Champion may open a Crown Card (AC-1).
 */
export function resolveChampionId(progress: RoundProgressLike): string {
  if (progress.complete !== true) {
    throw new Error("Crown Card unavailable: roundProgress is not complete (no Champion yet).");
  }
  if (!progress.championId) {
    throw new Error("Crown Card unavailable: championId is missing on a complete roundProgress.");
  }
  return progress.championId;
}

/** First grapheme of the name, uppercased — the photo-fallback initial. */
function initialOf(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return "?";
  return Array.from(trimmed)[0].toUpperCase();
}

/**
 * Map the resolved Champion Contestant + its Tournament to the pure render
 * contract consumed by drawLink / drawPortrait / CrownStaticCard.
 */
export function toCrownData(champion: Contestant, tournament: Tournament): CrownData {
  return {
    initial: initialOf(champion.name),
    name: champion.name,
    title: tournament.title,
    url: "worldcrown48.com",
    path: VICTORY_PATH,
  };
}
