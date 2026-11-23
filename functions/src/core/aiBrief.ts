/**
 * "AI에게 알려 줄 내용" 묶음 (LAB-FIX-4 · 원장 결정 A).
 *
 * 대회마다 AI에게 주는 정보를 한 묶음으로 모은다. 엔트리 단위(개인 · 팀 · 그 외)와 세 줄:
 *   entry = 엔트리는 어떤 것인가 — 칸의 이름 자리에 들어갈 대상(예: 춤춘 댄스 크루 · 노래 제목 · 드라마 배역)
 *   extra = 덧붙이는 정보 — 칸의 affiliation 자리에 들어갈 것. LAB-FIX-6 부터 목록 키 7개 중 하나(아래 EXTRA_OPTIONS)
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

/**
 * LAB-FIX-6 3-4(결정 H 다 · 대표 2026-11-22 16:51) — "덧붙이는 정보" 목록. 화면(lib/lab/extraInfo.ts)과 같은 키 7개.
 * 키는 AI 에게 그대로 보내지 않고 아래 **뜻 문장**으로 바꾼다. 빈 글 = 엔트리 단위의 기본값
 * (개인 = team · 팀 · 그 외 = blank). 목록 밖 글(옛 초안의 자유 글)은 지금처럼 그대로 싣는다(백필 없음).
 */
export const EXTRA_OPTIONS = ["team", "artist", "actor", "work", "maker", "channel", "blank"] as const;
export type ExtraOption = (typeof EXTRA_OPTIONS)[number];

export const EXTRA_MEANING: Record<ExtraOption, string> = {
  team: "개인 엔트리가 속한 팀 · 그룹 이름. 소속사(회사)는 적지 않는다. 영문 공식 표기가 있으면 그것. 속한 팀이 없거나 모르면 빈 문자열",
  artist: "그 노래를 부른 가수(사람 · 그룹) 이름. 피처링은 적지 않는다. 모르면 빈 문자열",
  actor: "그 배역을 연기한 배우 이름. 모르면 빈 문자열",
  work: "그 인물 · 배역이 나오는 작품(드라마 · 영화 · 애니 · 웹툰 등)의 제목. 모르면 빈 문자열",
  maker: "그 제품 · 서비스를 만든 회사(브랜드) 이름. 모르면 빈 문자열",
  channel: "그 크리에이터의 대표 채널 이름. 모르면 빈 문자열",
  blank: "적지 않는다 — 언제나 빈 문자열로 둔다",
};

export function isExtraOption(v: unknown): v is ExtraOption {
  return typeof v === "string" && (EXTRA_OPTIONS as readonly string[]).includes(v);
}

export function defaultExtraFor(unit: EntryUnit): ExtraOption {
  return unit === "individual" ? "team" : "blank";
}

/** 빈 글이면 단위의 기본값 키, 아니면 적힌 값(키 또는 옛 자유 글). */
function effectiveExtra(b: AiBrief, unit: EntryUnit): string {
  return b.extra.trim() === "" ? defaultExtraFor(unit) : b.extra.trim();
}

/** "비워 두기" — AI 가 무엇을 적든 서버가 둘째 줄(affiliation)을 비운다(잠긴 팀 지시문은 소속사를 채운다). */
export function extraIsBlank(b: AiBrief, unit: EntryUnit): boolean {
  return effectiveExtra(b, unit) === "blank";
}

/** 비워 두기면 모든 칸의 affiliation 을 빈 글로. 다른 값은 그대로 돌려준다. */
export function applyExtraBlank<T extends { affiliation?: string }>(rows: T[], b: AiBrief, unit: EntryUnit): T[] {
  return extraIsBlank(b, unit) ? rows.map((r) => ({ ...r, affiliation: "" })) : rows;
}

/**
 * 새 지시문을 쓰는 때 — 묶음에 글자가 있거나, 단위가 사람도 팀도 아닌 "그 외".
 * LAB-FIX-6: 덧붙이는 정보가 그 단위의 기본값(개인 = team · 팀 = blank)이면 글자가 없는 것과 같다 —
 * 세 줄이 빈 개인 · 팀 대회는 잠긴 옛 지시문 그대로(지시서 §7).
 */
export function usesBriefPrompt(b: AiBrief, unit: EntryUnit): boolean {
  if (unit === "other") return true;
  const extra = b.extra.trim() === defaultExtraFor(unit) ? "" : b.extra;
  return !isAiBriefEmpty({ ...b, extra });
}

/** 단위만 고르고 "엔트리는 어떤 것인가"를 비웠을 때 쓰는 말. */
const UNIT_DEFAULT_ENTRY: Record<EntryUnit, string> = {
  individual: "사람 한 명",
  group: "팀(그룹) 하나",
  other: "사람도 팀도 아닌 대상 하나(작품 · 사물 · 배역 등)",
};

/**
 * 결정 F(대표 2026-11-19 16:44 · 원장 D-61 일부 바뀜) — 한글 이름은 한국 인물 · 팀에만. 세 줄이 있을 때 쓰는 새 지시문 셋
 * (명단 채우기 · 링크 제목 읽기 · 이름 3언어)이 이 한 문장을 같이 쓴다. 외국 이름을 한글로 옮기면 누구인지 확인할 수 없고
 * 이미지 검색어(= 칸의 이름)가 한글이 되어 엉뚱한 사진이 걸린다(LAB-FIX-5 TEST2 실측).
 * 사람 · 팀이 아닌 엔트리(노래 · 작품 · 제품)는 이 문장이 정하지 않는다 — 각 지시문의 표기 줄을 따른다.
 */
export const NAME_SCRIPT_RULE =
  "- 이름 표기: 엔트리가 사람 · 팀이면, 한국 인물 · 팀(한국에서 활동하며 한글 활동명이 공식으로 쓰이는 대상 — 예: 이사배 · 방탄소년단)은 한글 이름으로, 외국 인물 · 팀은 그 사람 · 팀이 스스로 쓰는 원래 공식 표기 그대로(예: Lisa Eldridge · W-Unit) 적는다. 외국 이름을 한글로 발음을 옮겨 적지 않는다";

/**
 * 맨 위 규칙 줄 — 세 지시문이 같은 문장을 받는다. `rulesUse: "identify"`(링크 제목 읽기)는 영상이 이미 골라진 뒤라
 * 고르는 조건을 "누가 엔트리인지 가리는 데만" 쓰게 적는다(LAB-FIX-4b 실 AI — 조건을 이유로 자체 공연 영상 5칸을 비웠다).
 */
export function briefRuleLines(b: AiBrief, unit: EntryUnit, opts: { rulesUse?: "select" | "identify" } = {}): string[] {
  const lines = [
    "이 대회의 규칙(운영자가 정함 — 아래의 다른 모든 규칙보다 먼저 따른다):",
    `- 이 대회의 엔트리는 ${b.entry || UNIT_DEFAULT_ENTRY[unit]}이다. 엔트리 하나 = 칸 하나의 이름(name)`,
    extraRuleLine(b, unit),
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

/**
 * 덧붙이는 정보 줄. 목록 키(빈 글 = 단위의 기본값)는 뜻 문장으로, 옛 자유 글은 지금 문장 그대로.
 * (LAB-FIX-4 의 "비웠을 때의 뜻"은 개인 = 소속 그룹 · 소속사 · 채널, 팀 = 소속사였다 — LAB-FIX-6 에서 단위의 기본값
 * 소속 (팀) · 비워 두기의 뜻으로 바뀌었다. 세 줄이 모두 빈 개인 · 팀 대회는 이 줄을 쓰지 않는다 — 옛 지시문.)
 */
function extraRuleLine(b: AiBrief, unit: EntryUnit): string {
  const v = effectiveExtra(b, unit);
  return isExtraOption(v) ? `- 덧붙이는 정보(affiliation): ${EXTRA_MEANING[v]}` : `- 덧붙이는 정보(affiliation)는 ${v}이다`;
}
