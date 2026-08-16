/**
 * Parse Claude's AI-Fill response into exactly 48 Contestant suggestions.
 *
 * Server-only logic — lives inside the functions deploy package (functions
 * can't import the root `lib/`; cross-package constants are duplicated by
 * project precedent, e.g. cors.ts). Mirrors the client-side domain contract.
 *
 * Handoff §9 trap #8: the model reply is not guaranteed to be a bare JSON
 * array. Extract the first array, parse, normalize. Failures are typed
 * (ContestantParseError) so the onCall wrapper maps them to HttpsError and the
 * UI can offer "retry".
 *
 * ── AI-1 (2026-08-16) 관용도 확대 — 대표 결정 ──────────────────────────
 * 골든 1차에서 Sonnet 5가 "정확히 48명"을 자주 빗나갔다(49명·47명). 개수 하나
 * 때문에 48명치 토큰을 통째로 버리는 게 손해라, 프롬프트는 조금 더(50~52명)
 * 요청하고 여기서 정리한다:
 *
 *   이름 없는 항목 버림 → 이름 기준 중복 제거(먼저 나온 것 유지) → 앞에서부터
 *   expectedCount개만 취득 → 그래도 floor 미만이면 실패
 *
 * floor = expectedCount - SHORTFALL_TOLERANCE (48이면 46). 46~47명이면 그대로
 * 돌려준다 — 빈칸은 편집기에서 채우거나 빈칸만 다시 AI를 돌리면 되고(B-2), 이미
 * 지원되는 흐름이다.
 *
 * 출력 스키마는 불변이다 (RULE R1) — 필드 4개, 이름도 그대로. 바뀐 것은 몇 개를
 * 통과시키느냐뿐이라 클라이언트 계약은 손대지 않는다.
 */

export const TOTAL_CONTESTANTS = 48;

/** 부족분 허용치. expectedCount 48 → 46명까지 통과, 45명이면 실패. */
export const SHORTFALL_TOLERANCE = 2;

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

  // 순서대로 중복 제거 후 앞에서부터 expectedCount개만 취한다.
  // (Full fill = 48, blank-only fill(B-2) = 빈칸 수)
  const seen = new Set<string>();
  const picked: AiContestantSuggestion[] = [];

  for (const raw of parsed) {
    const o = (raw ?? {}) as Record<string, unknown>;
    const name = toStr(o.name).trim();
    if (!name) continue; // 이름 없는 항목은 슬롯을 못 채운다

    // 대소문자·공백만 다른 것은 같은 인물로 본다.
    const key = name.toLocaleLowerCase().replace(/\s+/g, " ");
    if (seen.has(key)) continue;
    seen.add(key);

    picked.push({
      name,
      nationality: toStr(o.nationality),
      position: toStr(o.position),
      imageSearchKeyword: toStr(o.imageSearchKeyword),
    });

    if (picked.length === expectedCount) break; // 과다 공급분은 버린다
  }

  const floor = Math.max(1, expectedCount - SHORTFALL_TOLERANCE);
  if (picked.length < floor) {
    throw new ContestantParseError(
      "wrong_count",
      `${expectedCount}명 중 최소 ${floor}명이 필요합니다 (중복 제거 후: ${picked.length}).`,
      picked.length,
    );
  }

  return picked;
}
