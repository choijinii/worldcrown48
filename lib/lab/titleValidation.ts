/**
 * Tournament title validation (Domain 2 · The Lab, Step 1).
 *
 * Drives both the live character counter and the AiFillButton enabled state.
 * Title is capped at 50 chars; whitespace-only is treated as empty so the
 * operator can't AI-fill a blank Tournament (AC Step1 #1).
 */
export const TITLE_MAX = 50;

export interface TitleValidation {
  /** Canonical (trimmed) title to store. */
  value: string;
  /** Length of the trimmed title — what the counter shows. */
  length: number;
  isEmpty: boolean;
  isTooLong: boolean;
  /** Non-empty and within the cap. Gate for AiFillButton. */
  isValid: boolean;
  /** TITLE_MAX - length; negative when over the cap. */
  remaining: number;
}

export function validateTitle(raw: string): TitleValidation {
  const value = raw.trim();
  const length = value.length;
  const isEmpty = length === 0;
  const isTooLong = length > TITLE_MAX;
  return {
    value,
    length,
    isEmpty,
    isTooLong,
    isValid: !isEmpty && !isTooLong,
    remaining: TITLE_MAX - length,
  };
}
