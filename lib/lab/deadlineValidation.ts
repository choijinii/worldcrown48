/**
 * Tournament Deadline validation (Domain 2 · The Lab, Step 1 · UX-3).
 *
 * Deadline exists ONLY on the Tournament (불변 원칙 — there is no Round Deadline).
 * The picker must reject a past instant so a Tournament can never be born already
 * closed (§8 edge: 과거 날짜 deadline 입력 → 거부). The `nowMs` reference is
 * injected (never Date.now() inside) so the pure function stays deterministic and
 * node-testable.
 */
export const DEADLINE_PRESETS_DAYS = [3, 7, 14] as const;
export const DEFAULT_DEADLINE_DAYS = 7;
const DAY_MS = 86_400_000;

export interface DeadlineValidation {
  /** Strictly in the future and a finite number. Gate for STEP 1 "다음". */
  isValid: boolean;
  /** deadline ≤ now — a past or present instant. */
  isPast: boolean;
  /** Not a usable timestamp (NaN / Infinity / unset). */
  isMissing: boolean;
}

export function validateDeadline(
  deadlineMs: number,
  nowMs: number,
): DeadlineValidation {
  const isMissing = !Number.isFinite(deadlineMs);
  const isPast = !isMissing && deadlineMs <= nowMs;
  return {
    isMissing,
    isPast,
    isValid: !isMissing && !isPast,
  };
}

/** Preset chip → absolute deadline (now + N days). */
export function presetDeadlineMs(nowMs: number, days: number): number {
  return nowMs + days * DAY_MS;
}
