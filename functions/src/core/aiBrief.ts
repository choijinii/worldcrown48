/**
 * "AI에게 알려 줄 내용" 묶음 (LAB-FIX-4 · 원장 결정 A).
 *
 * 대회마다 AI에게 주는 정보를 한 묶음으로 모은다. 엔트리 단위(개인 · 팀 · 그 외)와 세 줄:
 *   entry = 엔트리는 어떤 것인가 — 칸의 이름 자리에 들어갈 대상(예: 춤춘 댄스 크루 · 노래 제목 · 드라마 배역)
 *   extra = 덧붙이는 정보 — 칸의 affiliation 자리에 들어갈 것(예: 가수 · 드라마 제목 · 비움)
 *   rules = 고르는 조건 — 누구를 넣고 뺄지 자유 글(예: 2026년에 영상을 올린 크루, 어린이 팀 제외)
 *
 * 세 AI 일(링크 제목 읽기 · 명단 채우기 · 이름 3언어)은 묶음이 있거나 단위가 "그 외"면 **새 지시문
 * 함수**로 가고, 이 묶음을 맨 위 규칙으로 받는다. 묶음이 비고 단위가 개인·팀이면 옛 지시문을 글자 그대로
 * 쓴다 — 골든 실측이 그 문장들 위에서 나왔다(labFix4PromptLocks.test.ts 가 sha256 으로 잠근다).
 *
 * lib/lab/aiBrief.ts 와 같은 한도 · 같은 정규화다(functions 는 lib 를 import 하지 않는다 — 두 곳 복제 허용 지점).
 */
import type { EntryUnit } from "./aiFillCore";

export interface AiBrief {
  entry: string;
  extra: string;
  rules: string;
}

/** 의도 = 한 줄로 읽히는 길이(40) · 설명 칸과 같은 길이(300). 팬용 설명의 한도는 정하지 않는다. */
export const AI_BRIEF_LIMITS = { entry: 40, extra: 40, rules: 300 } as const;

export const EMPTY_AI_BRIEF: AiBrief = { entry: "", extra: "", rules: "" };

const str = (v: unknown): string => (typeof v === "string" ? v.trim() : "");

/**
 * 요청의 묶음 읽기. 빠지거나 모양이 다르면 빈 묶음(옛 화면 호환). 앞뒤 공백은 지운다.
 * 한도를 넘으면 null — 호출자가 모델을 부르기 전에 invalid-argument 로 돌려보낸다.
 */
export function parseAiBrief(v: unknown): AiBrief | null {
  if (!v || typeof v !== "object") return { ...EMPTY_AI_BRIEF };
  const o = v as Record<string, unknown>;
  const b: AiBrief = { entry: str(o.entry), extra: str(o.extra), rules: str(o.rules) };
  if (
    b.entry.length > AI_BRIEF_LIMITS.entry ||
    b.extra.length > AI_BRIEF_LIMITS.extra ||
    b.rules.length > AI_BRIEF_LIMITS.rules
  ) {
    return null;
  }
  return b;
}

export function isAiBriefEmpty(b: AiBrief): boolean {
  return b.entry.trim() === "" && b.extra.trim() === "" && b.rules.trim() === "";
}

/** 새 지시문을 쓰는 때 — 묶음에 글자가 있거나, 단위가 사람도 팀도 아닌 "그 외". */
export function usesBriefPrompt(b: AiBrief, unit: EntryUnit): boolean {
  return unit === "other" || !isAiBriefEmpty(b);
}

/** 단위만 고르고 "엔트리는 어떤 것인가"를 비웠을 때 쓰는 말. */
const UNIT_DEFAULT_ENTRY: Record<EntryUnit, string> = {
  individual: "사람 한 명",
  group: "팀(그룹) 하나",
  other: "사람도 팀도 아닌 대상 하나(작품 · 사물 · 배역 등)",
};

/**
 * 덧붙이는 정보를 비웠을 때의 뜻(코티오 판단 · PR 설명에 적음): 개인 · 팀은 지금 지시문의 소속 규칙을
 * 그대로 두고(개인 = 소속 그룹 · 팀 = 소속사), "그 외"는 비운다 — 무엇을 적을지 정해 주지 않았으니
 * 지어내지 않는다.
 */
const UNIT_DEFAULT_EXTRA: Record<EntryUnit, string> = {
  individual: "그 사람의 소속(그룹 · 팀 · 소속사 · 채널). 영문 공식 표기가 있으면 그것. 모르면 빈 문자열",
  group: "그 팀의 소속사 또는 채널. 영문 공식 표기가 있으면 그것. 모르면 빈 문자열",
  other: "따로 정하지 않았다 — 빈 문자열로 둔다",
};

/**
 * 맨 위 규칙 줄 — 세 지시문이 같은 문장을 받는다. `rulesUse: "identify"`(링크 제목 읽기)는 영상이 이미 골라진 뒤라
 * 고르는 조건을 "누가 엔트리인지 가리는 데만" 쓰게 적는다(LAB-FIX-4b 실 AI — 조건을 이유로 자체 공연 영상 5칸을 비웠다).
 */
export function briefRuleLines(b: AiBrief, unit: EntryUnit, opts: { rulesUse?: "select" | "identify" } = {}): string[] {
  const lines = [
    "이 대회의 규칙(운영자가 정함 — 아래의 다른 모든 규칙보다 먼저 따른다):",
    `- 이 대회의 엔트리는 ${b.entry || UNIT_DEFAULT_ENTRY[unit]}이다. 엔트리 하나 = 칸 하나의 이름(name)`,
    b.extra
      ? `- 덧붙이는 정보(affiliation)는 ${b.extra}이다`
      : `- 덧붙이는 정보(affiliation): ${UNIT_DEFAULT_EXTRA[unit]}`,
  ];
  if (b.rules) {
    lines.push(
      opts.rulesUse === "identify"
        ? `- 고르는 조건: ${b.rules} — 이 조건은 한 영상에 이름이 여럿 나올 때 **누가 엔트리인지 가리는 데만** 쓴다. 영상은 운영자가 이미 골랐으므로, 조건에 맞지 않아 보인다는 이유로 엔트리를 비우지 않는다`
        : `- 고르는 조건: ${b.rules}`,
    );
  }
  return lines;
}
