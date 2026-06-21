/**
 * aiFillCore — testable core of the aiFillContestants callable.
 *
 * Logic-extraction pyramid (대표 decision): all validation + prompt building +
 * parsing lives here as a pure async function with the model call INJECTED
 * (`deps.createMessage`). The onCall wrapper supplies the real Anthropic call;
 * tests supply a fake. No Firebase, no network in unit tests.
 *
 * Cost guard (handoff §9 trap #10): every cheap check (auth, title, category)
 * runs BEFORE the model is called, so a malformed request never spends a
 * paid Claude token.
 *
 * Category list is duplicated here (server-owned) — functions can't import the
 * root lib/; same boundary precedent as cors.ts.
 */
import {
  parseAiContestants,
  type AiContestantSuggestion,
} from "./parseContestants";

export const CATEGORIES = [
  "FOOTBALL",
  "KPOP",
  "ANIME",
  "GAMING",
  "MOVIE",
  "OTHER",
] as const;

export type Category = (typeof CATEGORIES)[number];

export function isValidCategory(value: unknown): value is Category {
  return (
    typeof value === "string" &&
    (CATEGORIES as readonly string[]).includes(value)
  );
}

const TITLE_MAX = 50;

export type AiFillReason = "unauthenticated" | "invalid-argument" | "ai-failed";

export class AiFillError extends Error {
  constructor(
    public reason: AiFillReason,
    message: string,
  ) {
    super(message);
    this.name = "AiFillError";
  }
}

export interface AiFillInput {
  uid: string | null | undefined;
  title: unknown;
  category: unknown;
}

export interface AiFillDeps {
  /** Sends the prompt to the model and resolves with the raw text reply. */
  createMessage: (prompt: string) => Promise<string>;
}

export function buildPrompt(title: string, category: Category): string {
  return `다음 Tournament 제목과 카테고리에 맞는 Contestant 48명을 추천해줘.
제목: "${title}"
카테고리: ${category}

각 Contestant를 JSON 배열로 반환:
[{ "name": string, "nationality": string, "position": string, "imageSearchKeyword": string }]

규칙:
- 정확히 48명
- 퍼포먼스 기반 공개 데이터만 사용
- 미성년자 금지
- 카테고리에 맞는 활동 영역 (position 필드)
- 한국적 요소에 치우치지 말 것 (글로벌 MZ)`;
}

export async function aiFillCore(
  input: AiFillInput,
  deps: AiFillDeps,
): Promise<AiContestantSuggestion[]> {
  if (!input.uid) {
    throw new AiFillError("unauthenticated", "로그인이 필요합니다.");
  }

  const title = typeof input.title === "string" ? input.title.trim() : "";
  if (!title) {
    throw new AiFillError("invalid-argument", "title이 필요합니다.");
  }
  if (title.length > TITLE_MAX) {
    throw new AiFillError(
      "invalid-argument",
      `title은 ${TITLE_MAX}자 이하여야 합니다.`,
    );
  }
  if (!isValidCategory(input.category)) {
    throw new AiFillError("invalid-argument", "유효한 category가 필요합니다.");
  }

  let text: string;
  try {
    text = await deps.createMessage(buildPrompt(title, input.category));
  } catch {
    throw new AiFillError("ai-failed", "AI 호출에 실패했습니다.");
  }

  // parseAiContestants throws ContestantParseError on bad/short output; the
  // onCall wrapper maps that to HttpsError('internal') with a retry hint.
  return parseAiContestants(text);
}
