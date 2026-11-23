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

/**
 * LAB-FIX-6 3-2(결정 H 가) — [다음 →]은 설명까지 있어야 켜진다. 설명은 AI 가 명단을 채울 때 이미 읽는 글이라
 * 꼭 적게 한다. 발행 문은 isStep1Ready 그대로 — 설명이 빈 옛 초안은 STEP 1을 다시 열 때만 막힌다.
 */
export function isStep1NextReady(s: Step1State & { description: string }): boolean {
  return isStep1Ready(s) && s.description.trim() !== "";
}
