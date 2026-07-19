/**
 * Tournament Keywords validation (Domain 2 · The Lab, Step 1).
 *
 * Keywords are a 3-way asset (대표 결정 2026-07-05): (a) AI-fill hint, (b) C-4
 * news-API search terms, (c) C-5 Fan Intelligence terms. B-2 only OWNS the
 * capture; consumption is each module's job.
 *
 * Drives the chip UI + the STEP 1 "다음" gate (AC#2: at least one keyword, but
 * an operator can always type one by hand even if ✨AI generation fails — the
 * single-point-of-failure removal). Normalization: trim, drop empties, dedupe
 * case-insensitively keeping the first spelling the operator chose.
 *
 * NOT tags / hashtags (LANGUAGE.md §13 — Tournament Keywords).
 */
export const KEYWORDS_MAX = 12;
export const KEYWORD_MAX_LEN = 30;

export interface KeywordsValidation {
  /** Normalized list to store: trimmed, empties dropped, case-insensitive dedupe. */
  values: string[];
  count: number;
  isEmpty: boolean;
  hasTooMany: boolean;
  hasTooLong: boolean;
  /** ≥1 keyword, within the count cap, none over-length. Gate for STEP 1 "다음". */
  isValid: boolean;
}

export function validateKeywords(raw: string[]): KeywordsValidation {
  const values: string[] = [];
  const seen = new Set<string>();
  for (const entry of raw) {
    const trimmed = entry.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    values.push(trimmed);
  }
  const count = values.length;
  const isEmpty = count === 0;
  const hasTooMany = count > KEYWORDS_MAX;
  const hasTooLong = values.some((k) => k.length > KEYWORD_MAX_LEN);
  return {
    values,
    count,
    isEmpty,
    hasTooMany,
    hasTooLong,
    isValid: !isEmpty && !hasTooMany && !hasTooLong,
  };
}
