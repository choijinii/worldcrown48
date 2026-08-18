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
 *
 * ── AI-2 (2026-08-18) 오염 힌트 폐기 + 중복 정규화 ─────────────────────
 * 2026-08-17 스모크에서 Sonnet 5가 **확신 없는 인물의 `imageSearchKeyword`에
 * 자기 메모를 흘렸다**: `NewJeans Sullyoon 아님 Hyein 확인`. 그 칸은 LAB-EV-2
 * 자동 소싱이 **그대로 YouTube 검색창에 넣는 문자열**이라, 메모가 섞이면 검색은
 * 0건이 되고 search 콜(하루 100)만 탄다. 6칸이 전부 그렇게 죽었다.
 *
 * 프롬프트 계약(aiFillCore)이 1차 방어고, 여기가 2차다. 판정되면 **힌트만 비우지
 * 않고 항목 자체를 버린다** — 증거에서 오염된 힌트는 늘 소속·실존 오류를 달고
 * 나왔다(설윤을 NewJeans로 오기, NMIXX에 없는 "미도리"). 힌트만 지우면 폴백
 * 검색어로 그 틀린 인물을 계속 찾는다. 과다 요청 여유분(2~4명)이 손실을 메운다.
 *
 * 중복도 같은 사건에서 나왔다: `설윤`(오염)과 `설윤(엔믹스)`(정상)가 따로 등재됐다.
 * 이름을 그대로 비교하면 이 둘은 다른 사람이다 — 괄호 꼬리를 떼고 비교한다.
 *
 * 파이프라인: 이름 없음 폐기 → **오염 힌트 폐기** → **정규화 중복 제거** →
 *            앞에서부터 expectedCount개 → floor 미만이면 실패(기존 그대로)
 */

export const TOTAL_CONTESTANTS = 48;

/** 부족분 허용치. expectedCount 48 → 46명까지 통과, 45명이면 실패. */
export const SHORTFALL_TOLERANCE = 2;

/**
 * 힌트 길이 상한. 계약(aiFillCore 프롬프트)이 "최대 6단어"를 요구하므로 60자면
 * 정상 검색어에는 넉넉하고, 문장으로 흘러나온 메모는 대부분 여기서 걸린다.
 */
export const HINT_MAX_LENGTH = 60;

/**
 * 메모 토큰 — **부분 문자열로도** 잡는다.
 * 고유명사·검색어 안에 이 자모열이 끼어들 일이 사실상 없는 것만 여기 둔다.
 * (증거의 `... 아님 ...` 형태가 전부 이쪽에 걸린다)
 */
const MEMO_SUBSTRINGS = [
  "아님",
  "아닌",
  "미확인",
  "불확실",
  "맞는지",
  "추정",
] as const;

/**
 * 메모 토큰 — **낱말이 통째로 같을 때만** 잡는다.
 *
 * 이쪽은 고유명사에 섞일 수 있다: `인지`는 골퍼 "박인지"의 일부고, `아마`는
 * "아마존"의 일부다. 부분 일치로 잡으면 멀쩡한 인물을 버린다(§6 Auto-STOP —
 * 검증기 오탐). 증거의 오염 힌트는 `확인`을 전부 **독립 낱말**로 썼으므로
 * 낱말 일치만으로 6/6이 잡힌다.
 *
 * 영어 토큰은 킥 ④ 초안에 없지만, 모델이 영문으로 같은 메모를 남길 수 있어
 * "검색어로는 절대 안 쓰는" 것만 좁게 넣었다(§10 보고 대상).
 */
const MEMO_WORDS = [
  "확인",
  "아마",
  "같음",
  "인지",
  "unverified",
  "unsure",
  "unknown",
  "tbd",
  "confirm",
  "verify",
] as const;

/**
 * 힌트 낱말 나누기 — 공백과 ASCII 구두점만 자른다.
 *
 * `\p{Letter}` 유니코드 속성 이스케이프는 쓰지 않는다(`/u` 필요 → 저장소
 * tsconfig에서 TS1501). searchQuery.ts와 같은 이유·같은 방식이다. 한글·한자·
 * 악센트 라틴은 나열되지 않았으므로 낱말에 그대로 남는다.
 */
const HINT_SEPARATORS = new RegExp(
  "[" +
    "\\s" +
    "\\u0021-\\u002F\\u003A-\\u0040\\u005B-\\u0060\\u007B-\\u007E" +
    "\\u00A0-\\u00BF\\u2000-\\u206F\\u3000-\\u303F" +
    "\\uFF00-\\uFF0F\\uFF1A-\\uFF20\\uFF3B-\\uFF40\\uFF5B-\\uFF65" +
    "]+",
  "g",
);

/** 괄호와 그 안 내용 — 반각·전각·대괄호·【】. 닫힘이 없어도(잘린 응답) 지운다. */
const PARENTHETICAL = new RegExp(
  "[\\u0028\\uFF08\\u005B\\uFF3B\\u3010]" +
    "[^\\u0029\\uFF09\\u005D\\uFF3D\\u3011]*" +
    "[\\u0029\\uFF09\\u005D\\uFF3D\\u3011]?",
  "g",
);

/**
 * 힌트가 검색어가 아니라 **메모**인가 (AI-2 규칙 ④).
 *
 *   (a) 메모 토큰 포함 · (b) 물음표 포함 · (c) HINT_MAX_LENGTH 초과
 *   (d) 빈 힌트는 **오염이 아니다** — 소싱에 "이름 + 카테고리 키워드" 폴백이 있다
 *
 * 한글 자체는 금지하지 않는다. 트로트처럼 한국어 검색이 맞는 카테고리가 있다
 * (`임영웅 무대`는 정상 힌트다).
 */
export function isPollutedHint(hint: string): boolean {
  const text = (hint ?? "").trim();
  if (!text) return false; // (d)
  if (text.length > HINT_MAX_LENGTH) return true; // (c)
  if (text.includes("?") || text.includes("\uFF1F")) return true; // (b) 반각·전각
  const lower = text.toLocaleLowerCase();
  if (MEMO_SUBSTRINGS.some((token) => lower.includes(token))) return true; // (a) 부분
  const words = new Set(lower.replace(HINT_SEPARATORS, " ").split(" ").filter(Boolean));
  return MEMO_WORDS.some((token) => words.has(token)); // (a) 낱말
}

/**
 * 중복 판정용 이름 키 (AI-2 규칙 ⑤).
 * 괄호 꼬리 제거 → 공백 제거 → 소문자. `설윤` = `설윤(엔믹스)` = `설 윤`.
 */
export function normalizeNameKey(name: string): string {
  return (name ?? "")
    .replace(PARENTHETICAL, " ")
    .toLocaleLowerCase()
    .replace(/\s+/g, "");
}

/** 중복 판정용 힌트 키. 대소문자·공백 무시. 빈 힌트는 중복 판정에서 뺀다. */
export function normalizeHintKey(hint: string): string {
  return (hint ?? "").toLocaleLowerCase().replace(/\s+/g, "");
}

/** 버려진 항목의 사유 — 골든이 표로 찍고 대표가 오탐을 눈으로 본다. */
export type DiscardReason =
  | "no-name"
  | "polluted-hint"
  | "duplicate-name"
  | "duplicate-hint";

export interface DiscardedContestant {
  reason: DiscardReason;
  name: string;
  imageSearchKeyword: string;
}

export interface ParseOptions {
  /**
   * 폐기된 항목을 하나씩 알려준다. 반환값 스키마를 건드리지 않고 폐기 목록을
   * 밖으로 빼는 유일한 통로다 (R1 — 출력 스키마 불변).
   */
  onDiscard?: (item: DiscardedContestant) => void;
}

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
  options: ParseOptions = {},
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

  // 순서대로 걸러 앞에서부터 expectedCount개만 취한다.
  // (Full fill = 48, blank-only fill(B-2) = 빈칸 수)
  const seenNames = new Set<string>();
  const seenHints = new Set<string>();
  const picked: AiContestantSuggestion[] = [];
  const discard = (
    reason: DiscardReason,
    name: string,
    imageSearchKeyword: string,
  ) => options.onDiscard?.({ reason, name, imageSearchKeyword });

  for (const raw of parsed) {
    const o = (raw ?? {}) as Record<string, unknown>;
    const name = toStr(o.name).trim();
    const hint = toStr(o.imageSearchKeyword).trim();
    if (!name) {
      discard("no-name", name, hint); // 이름 없는 항목은 슬롯을 못 채운다
      continue;
    }

    // AI-2: 힌트가 검색어가 아니라 메모면 그 **항목 자체를** 버린다(설계 결정 ③).
    if (isPollutedHint(hint)) {
      discard("polluted-hint", name, hint);
      continue;
    }

    // 괄호 꼬리·공백·대소문자만 다른 것은 같은 인물로 본다 (`설윤` = `설윤(엔믹스)`).
    const nameKey = normalizeNameKey(name);
    if (seenNames.has(nameKey)) {
      discard("duplicate-name", name, hint);
      continue;
    }
    // 같은 검색어를 가리키면 이름 표기가 달라도 같은 인물이다. 빈 힌트는 제외 —
    // 힌트가 빈 항목이 여럿이어도 서로 다른 인물일 수 있다.
    const hintKey = normalizeHintKey(hint);
    if (hintKey && seenHints.has(hintKey)) {
      discard("duplicate-hint", name, hint);
      continue;
    }
    seenNames.add(nameKey);
    if (hintKey) seenHints.add(hintKey);

    picked.push({
      name,
      nationality: toStr(o.nationality),
      position: toStr(o.position),
      imageSearchKeyword: hint,
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
