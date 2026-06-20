/**
 * Parse Claude's AI-Fill response into exactly 48 Contestant suggestions
 * (Domain 2 · The Lab, Step 1).
 *
 * Handoff §9 trap #8: the model's reply is NOT guaranteed to be a bare JSON
 * array — it may be wrapped in prose. We extract the first array, parse it,
 * and enforce exactly 48 well-shaped entries. Every failure is a typed
 * ContestantParseError so the Cloud Function can map it to an HttpsError and
 * the UI can offer "retry".
 *
 * Lives in lib/ (not functions/) so it's unit-testable in the node-env vitest
 * harness and the function stays a thin adapter around it.
 */
import {
  TOTAL_CONTESTANTS,
  type AiContestantSuggestion,
} from "@/lib/types/tournament";

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

export function parseAiContestants(text: string): AiContestantSuggestion[] {
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

  if (parsed.length !== TOTAL_CONTESTANTS) {
    throw new ContestantParseError(
      "wrong_count",
      `정확히 ${TOTAL_CONTESTANTS}명이 필요합니다 (받음: ${parsed.length}).`,
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
