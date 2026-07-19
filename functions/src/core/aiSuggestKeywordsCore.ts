/**
 * aiSuggestKeywordsCore — testable core of the aiSuggestKeywords callable (B-2).
 *
 * The ✨AI keyword button on STEP 1: title (+category, +optional description) →
 * 8~12 keyword suggestions the host can add/remove/edit. Same injected-deps
 * shape as aiFillCore (model call is `deps.createMessage`), so unit tests run
 * with no Firebase/network.
 *
 * Cost guard (trap #10): auth + input validation run BEFORE the model is called.
 * Keyword capture/normalization mirrors the client's validateKeywords contract
 * (trim, drop empties, case-insensitive dedupe, cap 12) — duplicated across the
 * functions↔root boundary by project precedent (functions can't import root lib).
 */
export type Category = string;

const TITLE_MAX = 50;
const KEYWORDS_MAX = 12;

export type SuggestKeywordsReason =
  | "unauthenticated"
  | "invalid-argument"
  | "ai-failed"
  | "unparseable";

export class SuggestKeywordsError extends Error {
  constructor(
    public reason: SuggestKeywordsReason,
    message: string,
  ) {
    super(message);
    this.name = "SuggestKeywordsError";
  }
}

export interface SuggestKeywordsInput {
  uid: string | null | undefined;
  title: unknown;
  category: unknown;
  description?: unknown;
}

export interface SuggestKeywordsDeps {
  createMessage: (prompt: string) => Promise<string>;
  logError?: (message: string, err: unknown) => void;
}

export function buildKeywordPrompt(
  title: string,
  category: Category,
  description: string,
): string {
  const lines = [
    `다음 Tournament에 어울리는 검색·추천 키워드 8~12개를 제안해줘.`,
    `제목: "${title}"`,
    `카테고리: ${category}`,
  ];
  if (description.trim()) {
    lines.push(`설명(참가 대상): ${description.trim()}`);
  }
  lines.push(
    "",
    `키워드는 JSON 문자열 배열로만 반환: ["keyword1", "keyword2", ...]`,
    "",
    "규칙:",
    "- 8~12개",
    "- 각 키워드는 짧게 (30자 이하)",
    "- 태그·해시태그(#) 형식 금지 — 순수 키워드만",
    "- 카테고리·주제에 실제로 관련된 검색어",
    "- 한국적 요소에 치우치지 말 것 (글로벌 MZ)",
  );
  return lines.join("\n");
}

/** Extract + normalize a JSON string-array from the model reply. */
function parseKeywords(text: string): string[] {
  const match = text.match(/\[[\s\S]*\]/);
  let parsed: unknown;
  try {
    parsed = JSON.parse(match ? match[0] : text);
  } catch {
    throw new SuggestKeywordsError(
      "unparseable",
      "AI 응답에서 키워드 배열을 찾지 못했습니다.",
    );
  }
  if (!Array.isArray(parsed)) {
    throw new SuggestKeywordsError(
      "unparseable",
      "AI 응답이 배열 형식이 아닙니다.",
    );
  }
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of parsed) {
    const s = typeof raw === "string" ? raw.trim() : "";
    if (!s) continue;
    const key = s.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(s);
    if (out.length >= KEYWORDS_MAX) break;
  }
  if (out.length === 0) {
    throw new SuggestKeywordsError(
      "unparseable",
      "유효한 키워드가 없습니다.",
    );
  }
  return out;
}

export async function aiSuggestKeywordsCore(
  input: SuggestKeywordsInput,
  deps: SuggestKeywordsDeps,
): Promise<string[]> {
  if (!input.uid) {
    throw new SuggestKeywordsError("unauthenticated", "로그인이 필요합니다.");
  }
  const title = typeof input.title === "string" ? input.title.trim() : "";
  if (!title) {
    throw new SuggestKeywordsError("invalid-argument", "title이 필요합니다.");
  }
  if (title.length > TITLE_MAX) {
    throw new SuggestKeywordsError(
      "invalid-argument",
      `title은 ${TITLE_MAX}자 이하여야 합니다.`,
    );
  }
  const category =
    typeof input.category === "string" ? input.category.trim() : "";
  if (!category) {
    throw new SuggestKeywordsError(
      "invalid-argument",
      "유효한 category가 필요합니다.",
    );
  }
  const description =
    typeof input.description === "string" ? input.description : "";

  let text: string;
  try {
    text = await deps.createMessage(
      buildKeywordPrompt(title, category, description),
    );
  } catch (e) {
    deps.logError?.("aiSuggestKeywordsCore createMessage failed", e);
    throw new SuggestKeywordsError("ai-failed", "AI 호출에 실패했습니다.");
  }

  return parseKeywords(text);
}
