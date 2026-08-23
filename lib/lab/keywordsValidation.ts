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

/**
 * 이미 있는 키워드에 새로 받은 키워드를 **상한 안에서** 합친다 (LAB-UX-1 D).
 *
 * `validateKeywords`는 검사기다 — 정규화는 하지만 잘라내지는 않는다(`hasTooMany`로
 * 알릴 뿐). 칩 입력은 상한에 닿으면 입력창이 사라져 넘칠 일이 없는데, ✨AI 병합
 * 경로에는 그 방어가 없었다. 그래서 키워드 8개인 상태에서 AI를 다시 누르면
 * 8 + 12 = 20이 그대로 들어가 계수기가 **"20/12"**가 되고, STEP 1 게이트가
 * 닫히며(hasTooMany), 입력창까지 사라져 되돌릴 방법이 칩 ×뿐이 됐다.
 *
 * 상한은 `KEYWORDS_MAX` 하나뿐이다 — 20은 어디에도 없던 수이고, 원인은 상수
 * 불일치가 아니라 **이 경로에 상한이 없었던 것**이다. 먼저 있던 것을 남기고
 * 넘치는 뒤쪽을 버린다(운영자가 직접 넣은 것이 AI 제안보다 먼저다).
 */
export function mergeKeywords(
  existing: string[],
  incoming: string[],
): { values: string[]; dropped: number } {
  const normalized = validateKeywords([...existing, ...incoming]).values;
  return {
    values: normalized.slice(0, KEYWORDS_MAX),
    dropped: Math.max(0, normalized.length - KEYWORDS_MAX),
  };
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
