/**
 * translateContestantNamesCore — 발행 때 엔트리 이름의 공식 영어 철자를 받는다
 * (NAME-I18N-1 · 원장 D-61).
 *
 * 48명을 **Haiku 1번**에 보낸다(이름마다 따로 부르지 않는다 — 비용과 철자 일관성).
 * 결과는 입력과 같은 순서의 `{ko,en,es}`: ko = 한글 정본 `name`, en = 공식 로마자 활동명,
 * **es = en 복사**(K-POP·크리에이터 고유명사는 스페인어권도 같은 철자 — 대표 2026-10-21).
 *
 * 실패 처리는 translateTournamentMetaCore 와 같다: **던지지 않는다.** 모델 오류·읽을 수 없는
 * 응답·빠진 사람은 그 칸의 en·es 를 빈칸으로 두고 로그를 남긴다. 화면은 `localizedName` 이
 * 한글로 폴백하고, 빈칸이라 백필이 나중에 다시 채울 수 있다. 응답은 번호(i)로 맞춘다 —
 * 순서가 섞이거나 사람이 빠져도 이름이 다른 엔트리에 붙지 않는다.
 *
 * **발음 대조(대표 2026-10-24 A안)**: 받은 영어 이름이 한글 발음과 맞지 않으면(설윤 → Yeji 처럼
 * 다른 엔트리의 이름) 쓰지 않는다 — en·es 빈칸 + `mismatch` 에 AI 가 낸 이름을 남긴다. 화면은
 * 한글로 보이고, 대표가 확인해 고칠 때까지 먼저 볼 이름에 남는다. 판정 = nameSoundsAlike.
 *
 * 이미 로마자인 이름(IVE)은 AI 에 보내지 않고 그대로 쓴다. 백필 스크립트도 이 파일을
 * 컴파일본으로 불러 쓴다(functions/scripts/backfill-name-i18n.mjs) — 프롬프트가 한 곳이다.
 */
import { nameSoundsAlike } from "./nameSoundsAlike";

export interface LocalizedName {
  ko: string;
  en: string;
  es: string;
}

export interface NameEntry {
  name: string;
  affiliation?: string;
}

export interface TranslateNamesInput {
  entries: NameEntry[];
  category?: string;
}

export interface TranslateNamesDeps {
  createMessage: (prompt: string) => Promise<string>;
  logError?: (message: string, err: unknown) => void;
}

export interface TranslateNamesResult {
  /** 입력과 같은 순서 · 같은 길이. */
  nameI18n: LocalizedName[];
  /** AI 가 공식 철자를 확신하지 못한 자리(0-based) — 대표 검수 대상. */
  unsure: number[];
  /** 영어 이름을 받지 못한 자리(0-based) — en·es 빈칸. */
  failed: number[];
  /** 발음이 안 맞아 쓰지 않은 자리(0-based)와 AI 가 낸 이름 — en·es 빈칸, 대표 확인 대상. */
  mismatch: { index: number; en: string }[];
}

export interface ParsedName {
  en: string;
  sure: boolean;
}

/** 한 번에 받는 상한 — 대회 하나(48명). */
export const MAX_NAME_ENTRIES = 48;

const HANGUL_RE = /[가-힣ᄀ-ᇿ㄰-㆏]/;
/** 라틴 문자(악센트 포함)·숫자·기호만 — 이미 로마자인 이름. */
const LATIN_ONLY_RE = /^[\x20-\x7E -ɏ]+$/;

/** `i` 를 생략하면 목록 순서(1부터)가 번호다. */
export function buildNamesPrompt(entries: (NameEntry & { i?: number })[], category: string): string {
  const lines = entries.map(
    (e, idx) =>
      `${e.i ?? idx + 1}. ${e.name}` + (e.affiliation?.trim() ? ` (소속: ${e.affiliation.trim()})` : ""),
  );
  return [
    "다음은 한 Tournament 의 Contestant 이름 목록이다" + (category ? ` (카테고리 ${category})` : "") + ".",
    "각 이름의 공식 영어 표기를 알려줘.",
    "",
    "규칙:",
    "- 공식 영어 표기 = 본인·소속사가 실제로 쓰는 로마자 활동명이다 (예: 뉴진스 → NewJeans, 에스파 → aespa, 아이유 → IU).",
    "- 발음 옮겨 적기가 아니다. 대소문자·띄어쓰기·기호까지 공식 표기 그대로 쓴다.",
    '- 공식 표기를 확실히 알면 "sure": true. 모르면 가장 그럴듯한 로마자를 쓰고 "sure": false.',
    "- 한글을 쓰지 않는다. 번호(i)는 아래 목록의 번호 그대로.",
    "",
    ...lines,
    "",
    '반환은 JSON 객체 하나: { "names": [ { "i": number, "en": string, "sure": boolean } ] }',
    "JSON 외 텍스트 금지.",
  ].join("\n");
}

/**
 * 응답 → 자리별 결과(길이 `count`, 1-based i). 읽을 수 없는 응답은 전부 null.
 * 한글이 섞인 en · 빈 en · 범위 밖 번호 · 중복 번호(두 번째부터)는 버린다.
 */
export function parseNamesReply(text: string, count: number): (ParsedName | null)[] {
  const out: (ParsedName | null)[] = Array.from({ length: count }, () => null);
  let rows: unknown;
  try {
    const m = text.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(m ? m[0] : text) as { names?: unknown };
    rows = parsed?.names;
  } catch {
    return out;
  }
  if (!Array.isArray(rows)) return out;
  for (const r of rows) {
    if (!r || typeof r !== "object") continue;
    const { i, en, sure } = r as { i?: unknown; en?: unknown; sure?: unknown };
    if (typeof i !== "number" || !Number.isInteger(i) || i < 1 || i > count) continue;
    if (out[i - 1]) continue;
    const v = typeof en === "string" ? en.trim() : "";
    if (!v || HANGUL_RE.test(v)) continue;
    out[i - 1] = { en: v, sure: sure === true };
  }
  return out;
}

export async function translateContestantNamesCore(
  input: TranslateNamesInput,
  deps: TranslateNamesDeps,
): Promise<TranslateNamesResult> {
  const names = input.entries.map((e) => (typeof e?.name === "string" ? e.name.trim() : ""));
  const nameI18n: LocalizedName[] = names.map((n) => ({ ko: n, en: "", es: "" }));
  const unsure: number[] = [];
  const failed: number[] = [];
  const mismatch: { index: number; en: string }[] = [];

  // AI 에 보낼 자리 — 빈 이름은 빼고, 이미 로마자인 이름은 그대로 쓴다.
  const ask: { i: number; name: string; affiliation?: string }[] = [];
  names.forEach((n, idx) => {
    if (!n) return;
    if (!HANGUL_RE.test(n) && LATIN_ONLY_RE.test(n)) {
      nameI18n[idx] = { ko: n, en: n, es: n };
      return;
    }
    ask.push({ i: idx + 1, name: n, affiliation: input.entries[idx]?.affiliation });
  });
  if (ask.length === 0) return { nameI18n, unsure, failed, mismatch };

  let text = "";
  try {
    text = await deps.createMessage(buildNamesPrompt(ask, input.category ?? ""));
  } catch (e) {
    deps.logError?.("translateContestantNames: model call failed — Korean fallback", e);
  }
  const parsed = text ? parseNamesReply(text, names.length) : names.map(() => null);
  if (text && parsed.every((p) => p === null)) {
    deps.logError?.("translateContestantNames: reply unparseable — Korean fallback", text.slice(0, 200));
  }

  for (const { i } of ask) {
    const got = parsed[i - 1];
    if (!got) {
      failed.push(i - 1);
      continue;
    }
    if (!nameSoundsAlike(names[i - 1], got.en)) {
      mismatch.push({ index: i - 1, en: got.en });
      continue;
    }
    nameI18n[i - 1] = { ko: names[i - 1], en: got.en, es: got.en };
    if (!got.sure) unsure.push(i - 1);
  }
  if (failed.length > 0) {
    deps.logError?.(`translateContestantNames: ${failed.length} name(s) without English — Korean fallback`, {
      failed: failed.map((idx) => names[idx]),
    });
  }
  if (mismatch.length > 0) {
    deps.logError?.(`translateContestantNames: ${mismatch.length} name(s) mismatch Korean sound — left empty`, {
      mismatch: mismatch.map((m) => `${names[m.index]} → ${m.en}`),
    });
  }
  return { nameI18n, unsure, failed, mismatch };
}
