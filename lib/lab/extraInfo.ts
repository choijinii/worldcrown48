/**
 * "덧붙이는 정보" 목록 (LAB-FIX-6 3-4 · 결정 H · 대표 2026-11-22 16:51).
 *
 * 엔트리 칸 둘째 줄(옛 "소속" 자리)에 무엇을 적을지 자유 글 대신 7개 중에서 고른다. 초안 · 대회 문서의
 * aiBrief.extra 에는 항목의 **키**가 들어가고, 서버(functions/src/core/aiBrief.ts)가 키를 정해진 뜻 문장으로 바꿔
 * AI 에게 준다(두 곳 복제 허용 지점 — 키 목록이 같아야 한다).
 *
 * 빈 글 = 엔트리 단위의 기본값(개인 = 소속 (팀) · 팀 · 그 외 = 비워 두기). 기본값을 고르면 빈 글로 저장한다 —
 * 세 줄이 빈 개인 · 팀 대회는 잠긴 옛 지시문을 그대로 쓰고(지시서 §7), 빈 초안 판정도 그대로다.
 * 옛 초안의 자유 글은 목록 이름과 같으면 그 키로, 아니면 그대로 둔다(백필 없음 · 다음에 고를 때 목록 값이 된다).
 */
import type { EntryUnit } from "@/lib/types/tournament";
import { MESSAGES, type MessageKey } from "@/lib/i18n/messages";

export const EXTRA_OPTIONS = ["team", "artist", "actor", "work", "maker", "channel", "blank"] as const;
export type ExtraOption = (typeof EXTRA_OPTIONS)[number];

export function isExtraOption(v: unknown): v is ExtraOption {
  return typeof v === "string" && (EXTRA_OPTIONS as readonly string[]).includes(v);
}

export function defaultExtraFor(unit: EntryUnit): ExtraOption {
  return unit === "individual" ? "team" : "blank";
}

/** 화면에 골라져 보이는 값 — 빈 글이면 단위의 기본값, 옛 자유 글이면 그 글. */
export function effectiveExtra(extra: string, unit: EntryUnit): string {
  const v = extra.trim();
  return v === "" ? defaultExtraFor(unit) : v;
}

/** 저장할 값 — 단위의 기본값과 같으면 빈 글. */
export function extraForUnit(extra: string, unit: EntryUnit): string {
  const v = extra.trim();
  return v === defaultExtraFor(unit) ? "" : v;
}

export function extraLabelKey(o: ExtraOption): MessageKey {
  return `lab.brief.extra.${o}` as MessageKey;
}

const fold = (s: string) => s.trim().toLocaleLowerCase();

/** 옛 자유 글이 목록 이름(세 언어 중 하나)과 같으면 그 키. */
export function matchLegacyExtra(text: string): ExtraOption | null {
  const t = fold(text);
  if (!t) return null;
  for (const o of EXTRA_OPTIONS) {
    const m = MESSAGES[extraLabelKey(o)] as { ko: string; en: string; es?: string };
    if ([m.ko, m.en, m.es ?? ""].some((l) => fold(l) === t)) return o;
  }
  return null;
}
