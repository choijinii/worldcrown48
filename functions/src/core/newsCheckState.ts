/**
 * newsCheckState — 결정 J(대표 2026-11-27): 경고가 남은 초안은 발행하지 못한다. 순수 모듈.
 *
 * 기사 문서에 서버만 쓰는 칸 넷(브라우저는 관리자도 못 바꾼다 — firestore.rules):
 *   checkWarnings   — 지금 글의 생성 뒤 검사 경고(newsCheck.checkDraftText)
 *   checkedText     — 그 검사를 한 글 { title, subhead, body } 의 사본
 *   checkBlocked    — 풀리지 않은 경고가 하나라도 있으면 true
 *   clearedWarnings — [경고 풀기]로 푼 경고 { rule, lang, field, match, by, at }(지우지 않고 쌓인다)
 *
 * 발행(초안 → 발행) 규칙: checkBlocked == false 이고, 발행하는 글 == checkedText(검사한 글 그대로)일 때만.
 * 저장 뒤 다시 검사는 onNewsCheck 트리거 — 글이 checkedText 와 다를 때만 쓴다(조회 수 같은 다른 칸 · 자기 쓰기는 그냥 지나감).
 * "같은 경고" = 검사 종류 · 언어 · 자리 · 걸린 말이 모두 같은 것(warningKey). 이미 푼 같은 경고로는 다시 잠그지 않는다.
 */
import type { LocalizedBlocks, LocalizedText } from "../_news/articleDoc";
import { checkDraftText, type CheckWarning } from "./newsCheck";

export interface CheckedText {
  title: LocalizedText;
  subhead: LocalizedText;
  body: LocalizedBlocks;
}

export interface ClearedWarning extends CheckWarning {
  /** 푼 관리자 uid */
  by: string;
  /** 푼 시각(ms) */
  at: number;
}

export interface CheckPatch {
  checkWarnings: CheckWarning[];
  checkedText: CheckedText;
  checkBlocked: boolean;
}

type Doc = Record<string, unknown>;

export function warningKey(w: CheckWarning): string {
  return `${w.rule}|${w.lang}|${w.field}|${w.match}`;
}

function textOf(d: Doc): CheckedText {
  return {
    title: d.title as LocalizedText,
    subhead: d.subhead as LocalizedText,
    body: d.body as LocalizedBlocks,
  };
}

/** 키 순서와 상관없이 같은 값인가(Firestore 가 돌려주는 맵은 키 순서를 보장하지 않는다). */
export function sameValue(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (Array.isArray(a) || Array.isArray(b)) {
    return Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((x, i) => sameValue(x, b[i]));
  }
  if (a && b && typeof a === "object" && typeof b === "object") {
    const ka = Object.keys(a as Doc).filter((k) => (a as Doc)[k] !== undefined);
    const kb = Object.keys(b as Doc).filter((k) => (b as Doc)[k] !== undefined);
    return ka.length === kb.length && ka.every((k) => sameValue((a as Doc)[k], (b as Doc)[k]));
  }
  return false;
}

function clearedKeys(d: Doc): Set<string> {
  const list = Array.isArray(d.clearedWarnings) ? (d.clearedWarnings as CheckWarning[]) : [];
  return new Set(list.map(warningKey));
}

/** 지금 글을 검사한 결과 칸(풀린 경고는 잠그지 않는다). */
export function checkPatchFor(d: Doc): CheckPatch {
  const text = textOf(d);
  const checkWarnings = checkDraftText(text);
  const cleared = clearedKeys(d);
  return { checkWarnings, checkedText: text, checkBlocked: checkWarnings.some((w) => !cleared.has(warningKey(w))) };
}

/** 저장 뒤 다시 검사 — 글이 검사한 글과 같으면 null(쓰지 않음). 상태(status)는 절대 건드리지 않는다. */
export function recheckPatch(d: Doc): CheckPatch | null {
  if (d.checkedText !== undefined && sameValue(textOf(d), d.checkedText)) return null;
  return checkPatchFor(d);
}

export type ClearPlan =
  | { ok: true; cleared: CheckWarning[]; patch: { clearedWarnings: ClearedWarning[]; checkBlocked: false } }
  | { ok: false; code: "not-found" | "check-pending" };

/**
 * [경고 풀기] — 그 초안의 지금 경고를 모두 "풀림"으로 적는다. 글을 고친 뒤 아직 다시 검사하지 않았으면 거절
 * (관리자가 본 적 없는 경고를 풀지 않게 — 몇 초 뒤 다시 누르면 된다).
 */
export function planClearWarnings(d: Doc | undefined, uid: string, nowMs: number): ClearPlan {
  if (!d) return { ok: false, code: "not-found" };
  if (d.checkedText === undefined || !sameValue(textOf(d), d.checkedText)) return { ok: false, code: "check-pending" };
  const before = Array.isArray(d.clearedWarnings) ? (d.clearedWarnings as ClearedWarning[]) : [];
  const have = new Set(before.map(warningKey));
  const current = Array.isArray(d.checkWarnings) ? (d.checkWarnings as CheckWarning[]) : [];
  const cleared = current.filter((w) => !have.has(warningKey(w)));
  const strip = (w: CheckWarning): CheckWarning => ({ rule: w.rule, lang: w.lang, field: w.field, match: w.match });
  return {
    ok: true,
    cleared: cleared.map(strip),
    patch: { clearedWarnings: [...before, ...cleared.map((w) => ({ ...strip(w), by: uid, at: nowMs }))], checkBlocked: false },
  };
}
