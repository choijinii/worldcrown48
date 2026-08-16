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
 * TX-0 (2026-07-11): categories are Firestore DATA, not a code enum. aiFillCore
 * only builds a prompt from the category, so it enforces the SHAPE (a non-empty
 * string) — the authoritative id-membership check lives at Tournament creation
 * (buildTournamentDoc, data-driven), so a bad category can never become a real
 * Tournament. This keeps the pure core free of any Firestore read and its caller
 * contract unchanged, and drops the duplicated tuple.
 */
import {
  parseAiContestants,
  TOTAL_CONTESTANTS,
  type AiContestantSuggestion,
} from "./parseContestants";

/** A category id (UPPER_SNAKE). Validated as data at Tournament creation. */
export type Category = string;

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
  /** Optional participant-scope blurb — an extra prompt hint (B-2). */
  description?: unknown;
  /** Optional keyword hints (B-2) — steer the roster toward the host's intent. */
  keywords?: unknown;
  /** B-2 blank-only mode: names already filled → excluded, only blanks requested. */
  existing?: unknown;
}

export interface AiFillDeps {
  /** Sends the prompt to the model and resolves with the raw text reply. */
  createMessage: (prompt: string) => Promise<string>;
  /**
   * Optional structured logger (B-2 / DP-1 fix). The onCall wrapper passes
   * `logger.error` so the ORIGINAL model error is captured server-side instead
   * of being swallowed by the generic ai-failed message.
   */
  logError?: (message: string, err: unknown) => void;
}

function toStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.map((x) => (typeof x === "string" ? x.trim() : "")).filter(Boolean);
}

export interface BuildPromptOptions {
  title: string;
  category: Category;
  description?: string;
  keywords?: string[];
  /** Names already present (blank-only mode) — the model must not repeat them. */
  existing?: string[];
  /** How many Contestants to return (48 for a full fill, fewer for blanks). */
  count: number;
}

/**
 * 과다 요청 폭 (AI-1). 필요한 수보다 2~4명 더 달라고 하고, 파서가 중복 제거 후
 * 앞에서부터 정확히 count명을 취한다. 골든 1차에서 "정확히 N명"이 자주 빗나가
 * (49·47명) 응답 전체가 버려졌던 것에 대한 대표 결정.
 */
const OVER_REQUEST_MIN = 2;
const OVER_REQUEST_MAX = 4;

export function buildPrompt(opts: BuildPromptOptions): string {
  const { title, category, description, keywords, existing, count } = opts;
  const askMin = count + OVER_REQUEST_MIN;
  const askMax = count + OVER_REQUEST_MAX;
  const lines = [
    `다음 Tournament 제목과 카테고리에 맞는 Contestant를 ${askMin}~${askMax}명 추천해줘.`,
    `제목: "${title}"`,
    `카테고리: ${category}`,
  ];
  if (description && description.trim()) {
    lines.push(`설명(참가 대상): ${description.trim()}`);
  }
  if (keywords && keywords.length > 0) {
    lines.push(`키워드 힌트: ${keywords.join(", ")}`);
  }
  if (existing && existing.length > 0) {
    lines.push(
      `이미 ${existing.length}명이 채워져 있어. 아래 이름과 겹치지 않는 새 인물만 추천해줘 (제외 목록): ${existing.join(", ")}`,
    );
  }
  lines.push(
    "",
    "각 Contestant를 JSON 배열로 반환:",
    `[{ "name": string, "nationality": string, "position": string, "imageSearchKeyword": string }]`,
    "",
    "규칙:",
    `- ${askMin}~${askMax}명 (서버가 앞에서부터 ${count}명만 채택하니 확실한 인물부터 순서대로)`,
    "- 실존 인물만. 가상·합성 인물을 지어내지 말 것",
    "- 같은 인물을 두 번 넣지 말 것",
    "- 퍼포먼스 기반 공개 데이터만 사용",
    "- 미성년자 금지",
    "- 카테고리에 맞는 활동 영역 (position 필드)",
    // AI-1: 이전 문구 "한국적 요소에 치우치지 말 것 (글로벌 MZ)"는 불변 원칙 #3
    // (디자인·브랜딩 규칙)을 로스터 구성에 잘못 적용한 것이었다. Sonnet 5가 이걸
    // 문자 그대로 따르면서 실존 K-POP 아티스트(대부분 한국인)를 피하려다 인물을
    // 지어냈다 — 골든 1차에서 확인. 국적 규칙은 카테고리에 종속시킨다.
    "- 카테고리에 실제로 속한 인물이면 국적을 가리지 말 것 (K-POP이면 한국인 아티스트를 피하지 말 것). 국적 다양성은 카테고리 자체가 글로벌일 때만 고려한다",
  );
  return lines.join("\n");
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
  const category =
    typeof input.category === "string" ? input.category.trim() : "";
  if (!category) {
    throw new AiFillError("invalid-argument", "유효한 category가 필요합니다.");
  }

  const description =
    typeof input.description === "string" ? input.description : "";
  const keywords = toStringArray(input.keywords);
  const existing = toStringArray(input.existing);

  // Blank-only mode: request just the missing slots. Guard the degenerate
  // "nothing to fill" case BEFORE the model is called (cost guard, trap #10).
  const count = TOTAL_CONTESTANTS - existing.length;
  if (count <= 0) {
    throw new AiFillError("invalid-argument", "채울 빈칸이 없습니다.");
  }

  let text: string;
  try {
    text = await deps.createMessage(
      buildPrompt({ title, category, description, keywords, existing, count }),
    );
  } catch (e) {
    // DP-1 fix: capture the original error instead of swallowing it.
    deps.logError?.("aiFillCore createMessage failed", e);
    throw new AiFillError("ai-failed", "AI 호출에 실패했습니다.");
  }

  // parseAiContestants throws ContestantParseError on bad/short output; the
  // onCall wrapper maps that to HttpsError('internal') with a retry hint.
  return parseAiContestants(text, count);
}
