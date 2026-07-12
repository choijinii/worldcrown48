/**
 * Parse Claude's AI-Fill response into exactly 48 Contestant suggestions.
 *
 * Server-only logic — lives inside the functions deploy package (functions
 * can't import the root `lib/`; cross-package constants are duplicated by
 * project precedent, e.g. cors.ts). Mirrors the client-side domain contract.
 *
 * Handoff §9 trap #8: the model reply is not guaranteed to be a bare JSON
 * array. Extract the first array, parse, enforce exactly 48 well-shaped
 * entries. Failures are typed (ContestantParseError) so the onCall wrapper
 * maps them to HttpsError and the UI can offer "retry".
 */

export const TOTAL_CONTESTANTS = 48;

export interface AiContestantSuggestion {
  name: string;
  nationality: string;
  position: string;
  imageSearchKeyword: string;
}

export type ContestantParseReason =
  | "unparseable"
  | "not_array"
  | "wrong_count";

export class ContestantParseError extends Error {
  constructor(
    public reason: ContestantParseReason,
    message: string,
    public received?: number,
  ) {
    super(message);
    this.name = "ContestantParseError";
  }
}

function toStr(v: unknown): string {
  return typeof v === "string" ? v : v == null ? "" : String(v);
}

export function parseAiContestants(
  text: string,
  expectedCount: number = TOTAL_CONTESTANTS,
): AiContestantSuggestion[] {
  const match = text.match(/\[[\s\S]*\]/);
  let parsed: unknown;
  try {
    parsed = JSON.parse(match ? match[0] : text);
  } catch {
    throw new ContestantParseError(
      "unparseable",
      "AI 응답에서 JSON 배열을 찾지 못했습니다.",
    );
  }

  if (!Array.isArray(parsed)) {
    throw new ContestantParseError(
      "not_array",
      "AI 응답이 배열 형식이 아닙니다.",
    );
  }

  // Full fill expects 48; blank-only fill (B-2) requests just the missing count.
  if (parsed.length !== expectedCount) {
    throw new ContestantParseError(
      "wrong_count",
      `정확히 ${expectedCount}명이 필요합니다 (받음: ${parsed.length}).`,
      parsed.length,
    );
  }

  return parsed.map((raw) => {
    const o = (raw ?? {}) as Record<string, unknown>;
    return {
      name: toStr(o.name),
      nationality: toStr(o.nationality),
      position: toStr(o.position),
      imageSearchKeyword: toStr(o.imageSearchKeyword),
    };
  });
}
