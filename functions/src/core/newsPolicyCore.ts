/**
 * newsPolicyCore — 4층 TIOZ 편집 방침의 저장 검사 (NEWS-1 · 결정 H · 대표 승인 자리 2026-11-27). 순수 모듈.
 *
 * 자리 = Firestore `config/newsPolicy` { lines: NewsPolicyLine[], updatedAt, updatedBy }.
 * 콜러블(getNewsPolicy · saveNewsPolicy — 관리자만)로만 읽고 쓴다. 브라우저 직접 접근은 규칙이 전면 거부.
 * 저장은 목록 통째로 바꾸기 — 30줄 · 줄마다 200자 · 이유 필수 · kinds 는 다섯 종류 안. 어기면 저장 거절.
 */
import { NEWS_KINDS, TIO_LAYER_LIMITS, type NewsKind, type NewsPolicyLine } from "./tioKnowledge";

export const NEWS_POLICY_DOC = "config/newsPolicy";

export type PolicyRejectCode =
  | "bad-shape"
  | "too-many-lines"
  | "text-required"
  | "line-too-long"
  | "reason-required"
  | "bad-kind";

export type PolicySaveResult = { ok: true; lines: NewsPolicyLine[] } | { ok: false; code: PolicyRejectCode };

const DAY = /^\d{4}-\d{2}-\d{2}$/;

/** 저장 요청 { lines } → 검사 · 다듬은 줄. todayKst = "YYYY-MM-DD"(날짜 없는 새 줄에 붙인다). */
export function normalizePolicySave(input: unknown, todayKst: string): PolicySaveResult {
  const raw = (input as { lines?: unknown } | null)?.lines;
  if (!Array.isArray(raw)) return { ok: false, code: "bad-shape" };
  if (raw.length > TIO_LAYER_LIMITS.policyLines) return { ok: false, code: "too-many-lines" };
  const lines: NewsPolicyLine[] = [];
  for (const r of raw) {
    if (!r || typeof r !== "object") return { ok: false, code: "bad-shape" };
    const o = r as Record<string, unknown>;
    const text = typeof o.text === "string" ? o.text.trim() : "";
    const reason = typeof o.reason === "string" ? o.reason.trim() : "";
    if (!text) return { ok: false, code: "text-required" };
    if ([...text].length > TIO_LAYER_LIMITS.policyChars) return { ok: false, code: "line-too-long" };
    if (!reason) return { ok: false, code: "reason-required" };
    let kinds: NewsKind[] | undefined;
    if (o.kinds !== undefined) {
      if (!Array.isArray(o.kinds) || !o.kinds.every((k) => (NEWS_KINDS as readonly unknown[]).includes(k))) {
        return { ok: false, code: "bad-kind" };
      }
      kinds = o.kinds.length > 0 ? [...new Set(o.kinds as NewsKind[])] : undefined;
    }
    const addedAt = typeof o.addedAt === "string" && DAY.test(o.addedAt) ? o.addedAt : todayKst;
    lines.push(kinds ? { text, reason, addedAt, kinds } : { text, reason, addedAt });
  }
  return { ok: true, lines };
}

/** 문서에서 읽은 줄 — 모양이 틀린 줄은 버린다(초안 생성은 멈추지 않는다). */
export function policyLinesFromDoc(data: unknown): NewsPolicyLine[] {
  const r = normalizePolicySave({ lines: (data as { lines?: unknown } | null)?.lines ?? [] }, "1970-01-01");
  if (r.ok) return r.lines;
  const raw = ((data as { lines?: unknown[] } | null)?.lines ?? []) as unknown[];
  return raw.flatMap((one) => {
    const x = normalizePolicySave({ lines: [one] }, "1970-01-01");
    return x.ok ? x.lines : [];
  }).slice(0, TIO_LAYER_LIMITS.policyLines);
}
