/**
 * "AI에게 알려 줄 내용" 묶음 — 편집기 · 초안 · 대회 문서 쪽 (LAB-FIX-4 · 원장 결정 A).
 *
 *   entry = 엔트리는 어떤 것인가(칸의 이름 자리에 들어갈 대상) · extra = 덧붙이는 정보(둘째 칸) ·
 *   rules = 고르는 조건(누구를 넣고 뺄지 자유 글)
 *
 * 서버 functions/src/core/aiBrief.ts 와 같은 한도다(functions 는 lib 를 import 하지 않는다 — 두 곳 복제 허용 지점).
 * 비어 있으면 초안 · 대회 문서에 칸을 싣지 않는다 — 세 줄을 비운 대회는 지금과 똑같이 움직이고, 규칙이 배포되기 전에도
 * 옛 모양으로 저장된다(entryUnit · mediaKind 와 같은 방식).
 */
import { isExtraOption, matchLegacyExtra } from "@/lib/lab/extraInfo";

export interface AiBrief {
  entry: string;
  extra: string;
  rules: string;
}

/** 의도 = 한 줄로 읽히는 길이(40) · 설명 칸과 같은 길이(300). 팬용 설명의 한도는 정하지 않는다. */
export const AI_BRIEF_LIMITS = { entry: 40, extra: 40, rules: 300 } as const;

export const EMPTY_AI_BRIEF: AiBrief = Object.freeze({ entry: "", extra: "", rules: "" }) as AiBrief;

const take = (v: unknown, max: number): string => (typeof v === "string" ? v.slice(0, max) : "");

/**
 * LAB-FIX-6 3-4 — 덧붙이는 정보는 목록 키. 옛 초안의 자유 글이 목록 이름과 같으면 그 키로, 아니면 글 그대로
 * (백필 없음 · 운영자가 다음에 고르면 목록 값이 된다).
 */
function readExtra(v: string): string {
  if (isExtraOption(v)) return v;
  return matchLegacyExtra(v) ?? v;
}

/** 문서 → 묶음. 빠지거나 모양이 다르면 빈 묶음, 넘치는 글은 자른다(옛 문서 · 손댄 문서도 편집기를 깨지 않게). */
export function readAiBrief(v: unknown): AiBrief {
  if (!v || typeof v !== "object") return { ...EMPTY_AI_BRIEF };
  const o = v as Record<string, unknown>;
  return {
    entry: take(o.entry, AI_BRIEF_LIMITS.entry),
    extra: readExtra(take(o.extra, AI_BRIEF_LIMITS.extra)),
    rules: take(o.rules, AI_BRIEF_LIMITS.rules),
  };
}

export function isAiBriefEmpty(b: AiBrief): boolean {
  return b.entry.trim() === "" && b.extra.trim() === "" && b.rules.trim() === "";
}

/** 저장 · 발행 · AI 호출에 실을 값 — 앞뒤 공백을 지우고, 비면 undefined(칸을 싣지 않는다). */
export function aiBriefForSave(b: AiBrief): AiBrief | undefined {
  const t = { entry: b.entry.trim(), extra: b.extra.trim(), rules: b.rules.trim() };
  return isAiBriefEmpty(t) ? undefined : t;
}
