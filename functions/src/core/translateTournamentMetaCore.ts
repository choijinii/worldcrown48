/**
 * translateTournamentMetaCore — testable core of translateTournamentMeta (B-2 §3 #4).
 *
 * The host writes title + description in ONE language; at publish we translate
 * the TWO missing languages in a single model call (Haiku, 1회) and return
 * {ko,en,es} for each. The source-language slot is always the untouched original.
 *
 * On failure the callable throws and the CLIENT (lib/lab/translateMeta.ts)
 * degrades to the original-in-every-slot fallback so publish still succeeds
 * (ADR-B2 §4). Injected-deps shape mirrors aiFillCore for node-only tests.
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

export function buildTranslatePrompt(
  title: string,
  description: string,
  targets: Lang[],
): string {
  return [
    "다음 Tournament 메타데이터를 아래 언어들로 자연스럽게 번역해줘.",
    `제목: "${title}"`,
    description ? `설명: "${description}"` : "설명: (없음)",
    "",
    `대상 언어: ${targets.map((l) => `"${l}"`).join(", ")}`,
    "",
    "각 언어별로 title, description을 JSON 객체로만 반환:",
    `{ ${targets.map((l) => `"${l}": { "title": string, "description": string }`).join(", ")} }`,
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

  let text: string;
  try {
    text = await deps.createMessage(
      buildTranslatePrompt(title, description, targets),
    );
  } catch (e) {
    deps.logError?.("translateTournamentMetaCore createMessage failed", e);
    throw new TranslateMetaError("ai-failed", "번역 호출에 실패했습니다.");
  }

  const match = text.match(/\{[\s\S]*\}/);
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(match ? match[0] : text) as Record<string, unknown>;
  } catch {
    throw new TranslateMetaError(
      "unparseable",
      "번역 응답에서 JSON을 찾지 못했습니다.",
    );
  }
  if (!parsed || typeof parsed !== "object") {
    throw new TranslateMetaError("unparseable", "번역 응답 형식이 올바르지 않습니다.");
  }

  // Assemble: source slot = original; each target slot = parsed translation
  // (fall back to original per-slot if a language is missing from the reply).
  const titleI18n = { ko: "", en: "", es: "" } as LocalizedText;
  const descriptionI18n = { ko: "", en: "", es: "" } as LocalizedText;
  titleI18n[sourceLang] = title;
  descriptionI18n[sourceLang] = description;
  for (const l of targets) {
    const entry = (parsed[l] ?? {}) as Record<string, unknown>;
    const t = toStr(entry.title).trim();
    titleI18n[l] = t || title;
    descriptionI18n[l] = description ? toStr(entry.description).trim() || description : "";
  }

  return { titleI18n, descriptionI18n };
}
