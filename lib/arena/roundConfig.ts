/**
 * Round model (Domain 3 · The Arena) — single source of truth for the
 * 48→24→12→6→THE FINAL binary tree (lite-spec ROUND_CONFIG, MENTAL_MODEL).
 *
 * currentRound is the 1..5 index — NEVER the contestant count (48/24/…) and
 * NEVER FIFA names (ROUND OF 16 / QUARTERFINAL / SEMIFINAL don't exist in WC48).
 * Round 5 (THE FINAL) is special: 3 contestants, 1 "match" (a 3-up pick, not 1v1).
 */
export type RoundIndex = 1 | 2 | 3 | 4 | 5;

export const FINAL_ROUND: RoundIndex = 5;

interface RoundSpec {
  nameEn: string;
  nameKo: string;
  matchCount: number;
  contestants: number;
}

export const ROUND_CONFIG: Record<RoundIndex, RoundSpec> = {
  1: { nameEn: "ROUND OF 48", nameKo: "48강", matchCount: 24, contestants: 48 },
  2: { nameEn: "ROUND OF 24", nameKo: "24강", matchCount: 12, contestants: 24 },
  3: { nameEn: "ROUND OF 12", nameKo: "12강", matchCount: 6, contestants: 12 },
  4: { nameEn: "ROUND OF 6", nameKo: "6강", matchCount: 3, contestants: 6 },
  5: { nameEn: "THE FINAL", nameKo: "결승", matchCount: 1, contestants: 3 },
};

export function matchCountForRound(round: RoundIndex): number {
  return ROUND_CONFIG[round].matchCount;
}

export function contestantsForRound(round: RoundIndex): number {
  return ROUND_CONFIG[round].contestants;
}

export function isFinalRound(round: RoundIndex): boolean {
  return round === FINAL_ROUND;
}

export function roundName(round: RoundIndex, lang: "ko" | "en"): string {
  return lang === "ko" ? ROUND_CONFIG[round].nameKo : ROUND_CONFIG[round].nameEn;
}
