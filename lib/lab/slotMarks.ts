/**
 * slotMarks — 칸 표시를 초안에 저장 · 불러오기 (LAB-FIX-5 §3-2 · §3-8).
 *
 *   ruleFlags     = 채운 뒤 "고르는 조건" 다시 검사(checkEntryRules)가 표시한 칸 · 사유 · **그때의 이름**.
 *                   운영자가 그 칸 이름을 고치면 표시는 사라진다(activeRuleFlags — reviewFlags 처럼 파생).
 *   sourcing      = 영상 · 이미지 찾기 상태(제안 · 수동 필요). 옛 동작은 초안에 저장하지 않아 새로고침하면
 *                   "제안 · 손볼 칸" 숫자가 0으로 돌아갔다(B줄 사전 점검).
 *   imageNotFound = 이미지를 못 찾은 칸.
 *
 * 순수 모듈 — 화면 · Firestore 를 모른다. 읽기는 모양이 다르면 버린다(옛 초안 · 손상된 값).
 */
import type { AiBrief } from "@/lib/lab/aiBrief";
import type { ContestantDraft } from "@/lib/lab/tournamentDoc";
import type { SlotSourcingState, SourcingStates } from "@/lib/lab/sourcingDraft";

const SLOT_COUNT = 48;
const REASON_MAX = 120;

export interface RuleFlag {
  slot: number;
  /** 표시할 때의 이름 — 지금 이름과 다르면 표시를 숨긴다. */
  name: string;
  reason: string;
}

const isSlot = (v: unknown): v is number => Number.isInteger(v) && (v as number) >= 0 && (v as number) < SLOT_COUNT;

/** 조건 검사는 "고르는 조건"이 있을 때만 — 빈 대회는 부르지 않는다(비용 · 옛 동작 보호). */
export function shouldCheckRules(brief: AiBrief): boolean {
  return brief.rules.trim() !== "";
}

/** 검사에 보낼 칸 — 이름 있는 칸만, 칸 번호(0부터) 그대로. */
export function rulesCheckEntries(contestants: readonly Pick<ContestantDraft, "name" | "affiliation">[]) {
  const out: { slot: number; name: string; affiliation: string }[] = [];
  contestants.forEach((c, slot) => {
    const name = (c?.name ?? "").trim();
    if (name && slot < SLOT_COUNT) out.push({ slot, name, affiliation: (c.affiliation ?? "").trim() });
  });
  return out;
}

/** 서버 응답 → 저장할 표시(그때의 이름과 함께). 지금 비어 있는 칸의 표시는 버린다. */
export function ruleFlagsFromReply(
  flags: readonly { slot: number; reason: string }[],
  contestants: readonly Pick<ContestantDraft, "name">[],
): RuleFlag[] {
  const out: RuleFlag[] = [];
  for (const f of flags) {
    const name = (contestants[f.slot]?.name ?? "").trim();
    if (!isSlot(f.slot) || !name) continue;
    out.push({ slot: f.slot, name, reason: (f.reason ?? "").slice(0, REASON_MAX) });
  }
  return out;
}

/** 지금 화면에 보일 표시 — 칸 이름이 표시할 때와 같은 칸만. */
export function activeRuleFlags(
  flags: readonly RuleFlag[],
  contestants: readonly Pick<ContestantDraft, "name">[],
): Record<number, { name: string; reason: string }> {
  const out: Record<number, { name: string; reason: string }> = {};
  for (const f of flags) {
    if ((contestants[f.slot]?.name ?? "").trim() === f.name) out[f.slot] = { name: f.name, reason: f.reason };
  }
  return out;
}

export function readRuleFlags(v: unknown): RuleFlag[] {
  if (!Array.isArray(v)) return [];
  const out: RuleFlag[] = [];
  const seen = new Set<number>();
  for (const r of v) {
    if (!r || typeof r !== "object") continue;
    const { slot, name, reason } = r as Record<string, unknown>;
    if (!isSlot(slot) || seen.has(slot) || typeof name !== "string" || !name || typeof reason !== "string") continue;
    seen.add(slot);
    out.push({ slot, name, reason: reason.slice(0, REASON_MAX) });
  }
  return out;
}

const STATUSES = new Set(["suggested", "manual", "unknown-person"]);

export function readSourcingStates(v: unknown): SourcingStates {
  const out: SourcingStates = {};
  if (!v || typeof v !== "object" || Array.isArray(v)) return out;
  for (const [k, raw] of Object.entries(v as Record<string, unknown>)) {
    const slot = Number(k);
    if (!isSlot(slot) || !raw || typeof raw !== "object") continue;
    const r = raw as Record<string, unknown>;
    if (typeof r.status !== "string" || !STATUSES.has(r.status)) continue;
    const s: SlotSourcingState = { status: r.status as SlotSourcingState["status"] };
    if (typeof r.reason === "string") s.reason = r.reason as SlotSourcingState["reason"];
    if (Array.isArray(r.demotedTerms)) s.demotedTerms = r.demotedTerms.filter((x): x is string => typeof x === "string");
    out[slot] = s;
  }
  return out;
}

/** 저장 모양 — 키는 문자열 칸 번호 · 값은 undefined 없는 상태. */
export function sourcingForSave(states: SourcingStates): Record<string, SlotSourcingState> {
  const out: Record<string, SlotSourcingState> = {};
  for (const [k, s] of Object.entries(states)) {
    if (!s) continue;
    out[k] = {
      status: s.status,
      ...(s.reason ? { reason: s.reason } : {}),
      ...(s.demotedTerms?.length ? { demotedTerms: [...s.demotedTerms] } : {}),
    };
  }
  return out;
}

export function readImageNotFound(v: unknown): number[] {
  if (!Array.isArray(v)) return [];
  return Array.from(new Set(v.filter(isSlot))).sort((a, b) => a - b);
}
