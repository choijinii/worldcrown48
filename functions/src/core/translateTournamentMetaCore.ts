/**
 * translateTournamentMetaCore — testable core of translateTournamentMeta (B-2 §3 #4).
 *
 * The host writes title + description in ONE language; at publish we translate
 * each MISSING language with its OWN Haiku call (Option A, B-2.1) and return
 * {ko,en,es} for each. The source-language slot is always the untouched original.
 *
 * Why per-language: a single all-languages JSON reply could silently drop a slot
 * (Haiku returned `en` but not `es` → es fell back to the Korean original,
 * shipped bug). One call per language makes each slot independent; a per-slot
 * failure falls back to the source original AND is logged (never silent). Only
 * validation errors (uid/title/sourceLang) throw; the CLIENT
 * (lib/lab/translateMeta.ts) still degrades to all-original on a callable error
 * so publish always succeeds (ADR-B2 §4). Injected-deps mirror aiFillCore.
 */
export type Lang = "ko" | "en" | "es";
const LANGS: Lang[] = ["ko", "en", "es"];
const TITLE_MAX = 50;

export type TranslateMetaReason =
  | "unauthenticated"
  | "invalid-argument"
  | "ai-failed"
  | "unparseable";

export class TranslateMetaError extends Error {
  constructor(
    public reason: TranslateMetaReason,
    message: string,
  ) {
    super(message);
    this.name = "TranslateMetaError";
  }
}

export interface LocalizedText {
  ko: string;
  en: string;
  es: string;
}

export interface TranslateMetaInput {
  uid: string | null | undefined;
  title: unknown;
  description: unknown;
  sourceLang: unknown;
}

export interface TranslateMetaDeps {
  createMessage: (prompt: string) => Promise<string>;
  logError?: (message: string, err: unknown) => void;
}

export interface TranslateMetaResult {
  titleI18n: LocalizedText;
  descriptionI18n: LocalizedText;
}

function isLang(v: unknown): v is Lang {
  return v === "ko" || v === "en" || v === "es";
}

const LANG_NAME: Record<Lang, string> = {
  ko: "Korean(한국어)",
  en: "English",
  es: "Spanish(español)",
};

/**
 * Prompt for ONE target language (Option A, B-2.1). One reply carries exactly one
 * language, so a single flaky JSON can never drop a *different* language's slot —
 * the failure mode that shipped the Korean-fallback es bug.
 */
export function buildTranslatePrompt(
  title: string,
  description: string,
  target: Lang,
): string {
  return [
    `다음 Tournament 메타데이터를 ${LANG_NAME[target]}(${target})로 자연스럽게 번역해줘.`,
    `제목: "${title}"`,
    description ? `설명: "${description}"` : "설명: (없음)",
    "",
    `JSON 객체 하나로만 반환: { "title": string, "description": string }`,
    "",
    "규칙:",
    "- 고유명사(Tournament·Contestant 등)와 사람 이름은 원문 유지",
    "- 설명이 없으면 description은 빈 문자열",
    "- JSON 외 텍스트 금지",
  ].join("\n");
}

function toStr(v: unknown): string {
  return typeof v === "string" ? v : "";
}

/**
 * Translate into a single language. Resilient by design: a model throw, an
 * unparseable reply, or an empty title all resolve to `{title:"",description:""}`
 * AND are logged — the caller then falls back THAT slot to the source original.
 * A language that DID translate is never lost to another language's failure.
 */
async function translateOneLang(
  title: string,
  description: string,
  target: Lang,
  deps: TranslateMetaDeps,
): Promise<{ title: string; description: string }> {
  let text: string;
  try {
    text = await deps.createMessage(
      buildTranslatePrompt(title, description, target),
    );
  } catch (e) {
    deps.logError?.(`translateTournamentMeta: ${target} model call failed`, e);
    return { title: "", description: "" };
  }
  const match = text.match(/\{[\s\S]*\}/);
  try {
    const parsed = JSON.parse(match ? match[0] : text) as Record<string, unknown>;
    return {
      title: toStr(parsed.title).trim(),
      description: toStr(parsed.description).trim(),
    };
  } catch {
    deps.logError?.(
      `translateTournamentMeta: ${target} reply unparseable`,
      text.slice(0, 200),
    );
    return { title: "", description: "" };
  }
}

export async function translateTournamentMetaCore(
  input: TranslateMetaInput,
  deps: TranslateMetaDeps,
): Promise<TranslateMetaResult> {
  if (!input.uid) {
    throw new TranslateMetaError("unauthenticated", "로그인이 필요합니다.");
  }
  const title = typeof input.title === "string" ? input.title.trim() : "";
  if (!title) {
    throw new TranslateMetaError("invalid-argument", "title이 필요합니다.");
  }
  if (title.length > TITLE_MAX) {
    throw new TranslateMetaError(
      "invalid-argument",
      `title은 ${TITLE_MAX}자 이하여야 합니다.`,
    );
  }
  if (!isLang(input.sourceLang)) {
    throw new TranslateMetaError(
      "invalid-argument",
      "sourceLang은 ko/en/es 중 하나여야 합니다.",
    );
  }
  const sourceLang = input.sourceLang;
  const description =
    typeof input.description === "string" ? input.description.trim() : "";

  const targets = LANGS.filter((l) => l !== sourceLang);

  // Source slot = the untouched original.
  const titleI18n = { ko: "", en: "", es: "" } as LocalizedText;
  const descriptionI18n = { ko: "", en: "", es: "" } as LocalizedText;
  titleI18n[sourceLang] = title;
  descriptionI18n[sourceLang] = description;

  // One INDEPENDENT call per target (in parallel). A per-slot failure falls back
  // to the source original and is LOGGED — never a silent Korean-only slot, and
  // a working language is never lost to a sibling's failure (ADR-B2 §4 / B-2.1).
  const results = await Promise.all(
    targets.map((l) => translateOneLang(title, description, l, deps)),
  );
  targets.forEach((l, i) => {
    const got = results[i];
    if (!got.title) {
      deps.logError?.(
        `translateTournamentMeta: ${l} title empty — falling back to source`,
        { title },
      );
    }
    titleI18n[l] = got.title || title;
    descriptionI18n[l] = description ? got.description || description : "";
  });

  return { titleI18n, descriptionI18n };
}
