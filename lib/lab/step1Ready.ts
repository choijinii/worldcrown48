/**
 * STEP 1 → "다음" gate (Domain 2 · The Lab, B-2 5-step flow).
 *
 * The [다음] button activates on ①제목 ②카테고리 ④키워드 ⑤Deadline — INDEPENDENT of
 * whether ✨AI succeeded (핵심 AC#1: AI is a helper, never a gate; a host who types
 * a keyword by hand still advances). ③설명 is optional and never gates.
 *
 * Pure composition of the tested field validators so the button state is
 * node-testable without rendering the component (§0.5 컴포넌트 렌더 테스트 금지).
 */
import { validateTitle } from "@/lib/lab/titleValidation";
import { isValidCategory } from "@/lib/lab/categories";
import { validateKeywords } from "@/lib/lab/keywordsValidation";
import { validateDeadline } from "@/lib/lab/deadlineValidation";

export interface Step1State {
  title: string;
  category: string;
  keywords: string[];
  deadlineMs: number;
  /** Category ids loaded from the `categories` collection (TX-0, data-driven). */
  validCategoryIds: readonly string[];
  /** Injected reference time so the gate stays deterministic/testable. */
  nowMs: number;
}

export function isStep1Ready(s: Step1State): boolean {
  return (
    validateTitle(s.title).isValid &&
    isValidCategory(s.category, s.validCategoryIds) &&
    validateKeywords(s.keywords).isValid &&
    validateDeadline(s.deadlineMs, s.nowMs).isValid
  );
}
