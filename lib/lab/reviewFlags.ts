/**
 * reviewFlags — "손볼 칸"을 그리드에서 보이게 하는 순수 판정 (LAB-UX-1 A).
 *
 * AI-2가 서버(`parseContestants`)에 심어 둔 검수 플래그 두 가지 — 중복 의심과
 * 이름↔힌트 불일치 — 는 지금 **로그에만** 있다. 운영자는 48칸을 눈으로 훑다가
 * 같은 사람이 두 번 들어온 걸 놓친다. 그 판정을 화면 상태로 끌어올린다.
 *
 * 서버 판정을 그대로 실어오지 않고 **화면에서 다시 계산하는** 이유:
 *   · 운영자가 이름을 고치는 순간 판정이 따라 움직여야 한다. 채우기 시점에 얼어붙은
 *     서버 통지는 "고쳤는데 배지가 그대로"가 된다.
 *   · 손으로 입력한 칸·검수기로 붙인 칸에도 같은 눈이 필요하다. 서버 통지는
 *     AI 채우기 응답에만 존재한다.
 *
 * 서버와의 차이(의도된 축소): 서버는 `judgeSameContestant`로 "이름이 같은데 다른
 * 인물"까지 갈라내 조용히 병합/보존한다. 화면은 **버리지 않으므로** 가를 필요가
 * 없다 — 겹치면 사람에게 보여주고 사람이 고른다. 대신 §6의 오탐 조건(다른 그룹의
 * 동명이인)은 소속으로 먼저 걸러낸다.
 */
import { tokenize } from "@/lib/embed/sourcing/searchQuery";
import { normalizeNameKey, parentheticalOf } from "@/lib/lab/nameKey";

/**
 * 힌트에서 변별력 없는 낱말. `parseContestants`의 `HINT_FILLERS` 미러 —
 * 같은 낱말을 빼야 서버가 인물로 본 토큰을 화면도 인물로 본다.
 */
const HINT_FILLERS = new Set([
  "stage",
  "performance",
  "live",
  "fancam",
  "official",
  "mv",
  "video",
  "music",
  "clip",
  "무대",
  "직캠",
  "영상",
  "the",
  "of",
  "and",
  "a",
  "an",
]);

/**
 * 팀 토큰으로 인정할 최소 소유자 수 — `parseContestants.TEAM_TOKEN_MIN_OWNERS`와
 * 같은 값·같은 이유(2면 같은 인물이 두 번 오를 때 그 이름이 팀으로 오분류된다).
 */
export const TEAM_TOKEN_MIN_OWNERS = 3;

/** 그리드 한 칸에서 판정에 쓰는 것만. 슬롯 전체 타입에 묶지 않는다(PR-2 필드 개편 대비). */
export interface ReviewSlot {
  name: string;
  /** 소속(팀). PR-2 전에는 호출부가 `position`을 넘긴다. */
  affiliation: string;
  imageSearchKeyword: string;
}

export type ReviewFlagKind = "duplicate-suspect" | "name-hint-mismatch";

export interface SlotReviewFlag {
  kind: ReviewFlagKind;
  /** 중복 의심 — 겹친 상대 칸 index(0-based). 화면 번호는 +1. */
  pairedIndexes: number[];
  /** 이름↔힌트 불일치 — 힌트가 가리키는 인물 토큰(= 이름 정정 후보). */
  suggestedNameTokens: string[];
}

/** index → 그 칸에 붙은 플래그들. 깨끗한 칸은 키 자체가 없다. */
export type ReviewFlags = Record<number, SlotReviewFlag[]>;

/** 힌트의 뜻 있는 낱말만. 한 글자도 버리지 않는다(STAYC `윤`이 곧 활동명이다). */
export function hintTokens(hint: string): string[] {
  const seen = new Set<string>();
  for (const t of tokenize(hint)) {
    if (!HINT_FILLERS.has(t)) seen.add(t);
  }
  return Array.from(seen);
}

/**
 * 그리드 전체에서 **팀 토큰**을 추린다.
 *
 * 외부 DB 없이 명단 자체로 판별한다: 서로 다른 인물 셋 이상의 힌트에 나오는 낱말은
 * 개인이 아니라 소속을 가리킨다. 소유자는 이름이 아니라 **힌트의 알맹이**로 센다 —
 * 같은 인물이 `Sullyoon`·`설윤` 두 표기로 오르면 이름으로는 두 명이 된다.
 */
export function inferTeamTokens(slots: readonly ReviewSlot[]): Set<string> {
  const owners = new Map<string, Set<string>>();
  for (const slot of slots) {
    const tokens = hintTokens(slot.imageSearchKeyword);
    const owner = tokens.slice().sort().join(" ");
    if (!owner) continue;
    for (const token of tokens) {
      const set = owners.get(token) ?? new Set<string>();
      set.add(owner);
      owners.set(token, set);
    }
  }
  const teams = new Set<string>();
  owners.forEach((ownerSet, token) => {
    if (ownerSet.size >= TEAM_TOKEN_MIN_OWNERS) teams.add(token);
  });
  return teams;
}

/** 힌트에서 인물을 가리키는 낱말만(소속 낱말 제외). */
export function personTokens(hint: string, teamTokens: ReadonlySet<string>): string[] {
  return hintTokens(hint).filter((t) => !teamTokens.has(t));
}

/** 소속 비교용 키. 비어 있으면 "모름"이고, 모름은 누구와도 겹칠 수 있다. */
function affiliationKey(value: string): string {
  return (value ?? "").toLocaleLowerCase().replace(/\s+/g, "");
}

/**
 * 이름 꼬리(괄호 안)가 힌트와 **정면으로 어긋나는가** — 라틴 문자일 때만.
 *
 * `설윤(NMIXX)` + 힌트 `NewJeans Sullyoon`이 이 경로다. 괄호가 한글이면
 * (`김채원(허윤진)`) 로마자 힌트와 문자가 달라 여기서는 판단하지 않는다 —
 * 추측으로 이름을 고치면 AI-1의 허구 인물 사고를 다른 층에서 반복한다.
 */
export function parentheticalContradictsHint(name: string, hint: string): boolean {
  const inner = parentheticalOf(name);
  if (!inner) return false;
  const tail = hintTokens(inner).filter((t) => /^[a-z0-9]+$/.test(t));
  if (tail.length === 0) return false; // 한글 괄호 — 판단 보류
  const hints = hintTokens(hint);
  if (hints.length === 0) return false;
  return !tail.some((t) => hints.includes(t));
}

function addFlag(flags: ReviewFlags, index: number, flag: SlotReviewFlag): void {
  const list = flags[index] ?? [];
  const existing = list.find((f) => f.kind === flag.kind);
  if (existing) {
    for (const paired of flag.pairedIndexes) {
      if (!existing.pairedIndexes.includes(paired)) existing.pairedIndexes.push(paired);
    }
    existing.pairedIndexes.sort((a, b) => a - b);
    return;
  }
  list.push(flag);
  flags[index] = list;
}

function pairUp(flags: ReviewFlags, group: readonly number[]): void {
  for (const index of group) {
    const others = group.filter((i) => i !== index);
    if (others.length === 0) continue;
    addFlag(flags, index, {
      kind: "duplicate-suspect",
      pairedIndexes: others,
      suggestedNameTokens: [],
    });
  }
}

/**
 * 중복 의심 — 두 갈래로 잡는다.
 *
 *   ① 이름 키가 같다. 단 **소속이 둘 다 적혀 있고 서로 다르면 동명이인**이라 넘긴다
 *      (§6 오탐 조건). 한쪽이라도 비어 있으면 "모름"이므로 사람에게 보여준다.
 *   ② 검색 힌트가 통째로 같다. 이름이 달라도 같은 사람을 검색하고 있다는 뜻이고,
 *      AI-2 골든의 중복 6쌍이 정확히 이 모양이었다(이름·표기는 달랐다).
 */
function flagDuplicates(slots: readonly ReviewSlot[], flags: ReviewFlags): void {
  const byName = new Map<string, number[]>();
  const byHint = new Map<string, number[]>();

  slots.forEach((slot, index) => {
    const nameKey = normalizeNameKey(slot.name);
    if (nameKey) byName.set(nameKey, [...(byName.get(nameKey) ?? []), index]);
    const hintKey = (slot.imageSearchKeyword ?? "").toLocaleLowerCase().replace(/\s+/g, "");
    if (hintKey) byHint.set(hintKey, [...(byHint.get(hintKey) ?? []), index]);
  });

  byName.forEach((group) => {
    if (group.length < 2) return;
    // 소속이 전부 적혀 있고 서로 다 다르면 동명이인 — 배지를 달지 않는다.
    const keys = group.map((i) => affiliationKey(slots[i].affiliation));
    const allKnown = keys.every((k) => k !== "");
    const allDistinct = new Set(keys).size === keys.length;
    if (allKnown && allDistinct) return;
    pairUp(flags, group);
  });

  byHint.forEach((group) => {
    if (group.length < 2) return;
    pairUp(flags, group);
  });
}

/**
 * 이름↔힌트 불일치 — 이름 칸이 힌트가 가리키는 인물과 어긋난다.
 *
 * 힌트가 비어 있으면 판정하지 않는다. 힌트 없음은 오류가 아니라 정보 없음이고,
 * 소싱에는 "이름 + 카테고리 키워드" 폴백이 있다.
 */
function flagNameHintMismatch(
  slots: readonly ReviewSlot[],
  teamTokens: ReadonlySet<string>,
  flags: ReviewFlags,
): void {
  slots.forEach((slot, index) => {
    if (!slot.name.trim() || !slot.imageSearchKeyword.trim()) return;
    if (!parentheticalContradictsHint(slot.name, slot.imageSearchKeyword)) return;
    addFlag(flags, index, {
      kind: "name-hint-mismatch",
      pairedIndexes: [],
      suggestedNameTokens: personTokens(slot.imageSearchKeyword, teamTokens),
    });
  });
}

/** 그리드 한 판 → 칸별 검수 플래그. 입력을 바꾸지 않는다. */
export function deriveReviewFlags(slots: readonly ReviewSlot[]): ReviewFlags {
  const flags: ReviewFlags = {};
  const named = slots.filter((s) => s.name.trim() !== "");
  const teamTokens = inferTeamTokens(named);
  flagDuplicates(slots, flags);
  flagNameHintMismatch(slots, teamTokens, flags);
  return flags;
}

/** 배지가 붙은 칸의 수 = 카운터의 "손볼 칸". */
export function countFlaggedSlots(flags: ReviewFlags): number {
  return Object.keys(flags).length;
}
