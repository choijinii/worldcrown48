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
  type ContestantNotice,
  type DiscardedContestant,
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
  /**
   * ENTRY-UNIT-1 (원장 D-73) — 엔트리 단위. "individual"(기본) | "group".
   * 빠지면 개인이다 — 이 칸을 모르는 옛 화면의 요청은 지금과 똑같이 돈다.
   */
  entryUnit?: unknown;
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
  /**
   * 폐기 요약 로거 (AI-2). 검증기가 버린 항목을 서버 로그에 남긴다 — 오탐이
   * 프로덕션에서만 드러날 때 골든을 다시 돌리지 않고 확인할 수 있는 유일한 창이다.
   * R6: 프롬프트 전문·키는 절대 넣지 않는다. 폐기 항목의 이름·힌트·사유까지만.
   */
  logInfo?: (message: string) => void;
}

function toStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.map((x) => (typeof x === "string" ? x.trim() : "")).filter(Boolean);
}

/**
 * 엔트리 단위 (ENTRY-UNIT-1 · 원장 D-73). 대회 하나의 엔트리 48개가 무엇을 세는가.
 *   individual = 사람 한 명(지금까지의 유일한 경로)
 *   group      = 그룹(팀) 하나 — 멤버 개인은 넣지 않는다
 * lib/types/tournament.ts 의 EntryUnit 과 같은 값이다(functions 는 lib 를 import 하지 않는다).
 */
export type EntryUnit = "individual" | "group";

export const ENTRY_UNITS: readonly EntryUnit[] = ["individual", "group"];

export interface BuildPromptOptions {
  title: string;
  category: Category;
  description?: string;
  keywords?: string[];
  /** Names already present (blank-only mode) — the model must not repeat them. */
  existing?: string[];
  /** How many Contestants to return (48 for a full fill, fewer for blanks). */
  count: number;
  /** 엔트리 단위. 빠지면 개인 — 개인 경로 프롬프트는 한 글자도 바뀌지 않는다. */
  entryUnit?: EntryUnit;
}

/**
 * 과다 요청 폭. 필요한 수보다 이만큼 더 달라고 하고, 파서가 걸러낸 뒤 앞에서부터
 * 정확히 count명을 취한다. 골든 1차에서 "정확히 N명"이 자주 빗나가(49·47명) 응답
 * 전체가 버려졌던 것에 대한 대표 결정(AI-1)이 출발점이다.
 *
 * AI-2.2에서 2~4 → **3~5**로 넓혔다(대표 결정 2026-08-20). 폐기 경로가 늘었기
 * 때문이다: 제외 목록 + 확인된 중복 병합까지 더해지면서 골든 3차의 폐기가 회차당
 * 4·2·3건이었고, 51개를 받은 회차에서 여유분 3을 폐기 4가 넘어 47명이 됐다.
 *
 * 더 넓히지 않는 이유: 후보 풀은 유한하다. 56명을 요구하면 모델이 더 깊이 파고
 * 들어가는데, 골든 3차의 검수 플래그 9건 중 6건이 슬롯 33 이후에 몰렸다 —
 * 뒤로 갈수록 애매한 인물이 나온다는 신호다. 개수를 사려고 꼬리 품질을 팔지 않는다.
 */
const OVER_REQUEST_MIN = 3;
const OVER_REQUEST_MAX = 5;

/**
 * 프롬프트 고르기 (ENTRY-UNIT-1). 단위가 group 일 때만 팀 경로로 간다.
 *
 * 개인 경로(buildIndividualPrompt)는 **글자 그대로** 두었다 — AI-1·AI-2 골든 실측이
 * 그 문장들 위에서 나온 숫자라, 한 글자를 바꿔도 다시 재야 한다. 팀 경로는 별도
 * 함수로 따로 쓴다(개인 경로에 if 를 끼워 넣으면 개인 문장이 흔들린다).
 */
export function buildPrompt(opts: BuildPromptOptions): string {
  return opts.entryUnit === "group"
    ? buildGroupPrompt(opts)
    : buildIndividualPrompt(opts);
}

function buildIndividualPrompt(opts: BuildPromptOptions): string {
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
    `[{ "name": string, "nationality": string, "affiliation": string, "imageSearchKeyword": string }]`,
    "",
    "규칙:",
    `- ${askMin}~${askMax}명 (서버가 앞에서부터 ${count}명만 채택하니 확실한 인물부터 순서대로)`,
    "- 실존 인물만. 가상·합성 인물을 지어내지 말 것",
    "- 같은 인물을 두 번 넣지 말 것",
    "- 퍼포먼스 기반 공개 데이터만 사용",
    "- 미성년자 금지",
    "- affiliation = 소속. 그룹·팀·소속사·채널명 등 그 인물이 **어디 소속인가**를 적는다 (예: BLACKPINK · NMIXX). 직책·포지션(메인보컬·리더)이 아니다. 소속이 없는 솔로 활동가면 빈 문자열",
    "- nationality = **ISO 3166-1 alpha-2 국가 코드 두 글자 대문자** (예: KR · JP · US · TH). 나라 이름을 한글이나 영어로 적지 말 것 — 화면이 보는 사람의 언어로 바꿔 보여준다",
    // AI-1: 이전 문구 "한국적 요소에 치우치지 말 것 (글로벌 MZ)"는 불변 원칙 #3
    // (디자인·브랜딩 규칙)을 로스터 구성에 잘못 적용한 것이었다. Sonnet 5가 이걸
    // 문자 그대로 따르면서 실존 K-POP 아티스트(대부분 한국인)를 피하려다 인물을
    // 지어냈다 — 골든 1차에서 확인. 국적 규칙은 카테고리에 종속시킨다.
    "- 카테고리에 실제로 속한 인물이면 국적을 가리지 말 것 (K-POP이면 한국인 아티스트를 피하지 말 것). 국적 다양성은 카테고리 자체가 글로벌일 때만 고려한다",
    // AI-2 ⑥ 명단 적격성. AI-2.2(2026-08-20)에서 문구를 강화했다 — **한 번 실패한
    // 규칙이기 때문이다**. 2026-08-18에 아래 첫 줄을 넣었는데도 이튿날 골든 3회 중
    // 2회에서 탈퇴 멤버가 명단에 올랐다. 그래서 (a) 금지 항목을 번호로 쪼개 세고,
    // (b) 한 명씩 자문하는 절차를 시키고, (c) 뺀 자리는 채우라고 명시한다.
    // 그래도 모델 지시는 지시일 뿐이라 서버에 제외 목록을 따로 뒀다
    // (core/rosterExclusions.ts) — 이 문구가 또 뚫려도 거기서 막힌다.
    "- 명단 적격성 — 다음 세 부류는 넣지 않는다: ① 그룹에서 탈퇴·퇴출된 전 멤버 ② 해체했거나 활동을 중단한 팀의 멤버 ③ 학교폭력·범죄 등 중대한 사회적 물의로 논란이 된 인물",
    "- 특히 ①이 자주 틀린다. **지금 그 팀의 현재 공식 멤버**만 넣는다. 논란으로 팀을 떠난 전 멤버를 그 팀 이름과 함께 넣는 일이 없도록 할 것",
    "- 한 명을 적을 때마다 스스로 확인한다: \"지금 활동 중인가 · 탈퇴하지 않았나 · 논란이 없었나\". 셋 중 하나라도 걸리면 그 사람을 빼고 **다른 사람으로 채운다**",
  );
  // AI-2 ② 힌트 칸 계약. 이 칸은 LAB-EV-2 자동 소싱이 **그대로 유튜브 검색창에
  // 넣는 문자열**이다(§3 OUT "검색어 AI 재작성 금지"). 계약이 없던 탓에 모델이
  // 확신 없는 인물의 검색어 자리에 자기 메모를 흘렸다 — EVIDENCE_AI-2 6/6.
  // 규칙 목록에서 떼어 별도 블록으로 둔다: 필드 하나에 대한 형식 계약이라
  // 명단 규칙 사이에 끼면 묻힌다.
  lines.push(
    "",
    "imageSearchKeyword 규칙:",
    "- 이 칸은 유튜브 검색창에 그대로 붙여 넣을 검색어다. 메모장이 아니다",
    "- 형식: 그룹 영문명 + 활동명 영문 + stage 또는 performance. 3~4단어로 끝낸다",
    '- 예시 형식: "<그룹 영문명> <활동명 영문> stage"',
    // AI-2.5 (2026-08-22). 스모크에서 모델이 곡명을 넣기 시작했고
    // (`aespa Karina Supernova stage`) 그 한 낱말이 세 가지를 한꺼번에 망가뜨렸다:
    //   ① 검색이 지나치게 좁아져 0건 — `NewJeans Hyein OMG stage`는 인물도 곡도
    //      실존인데 "실존 의심"으로 떨어졌다(스모크 잔여 4건 중 3건이 이 유형)
    //   ② 같은 인물이 곡만 바꿔 두 번 오른다 — 인물 토큰이 부분만 겹쳐 병합되지
    //      않는다. 스모크에서 5쌍이 살아남아 48칸에 실제 인물은 43명뿐이었다
    //   ③ 곡명을 공유하는 다른 멤버끼리 "중복 의심" 오탐이 쏟아진다(골든 16/22)
    // 곡명은 검증기로 못 거른다(임의의 낱말이라 판별 근거가 없다) — 계약으로 막는다.
    "- 곡 제목·노래 이름은 넣지 말 것. 곡명이 들어가면 검색이 지나치게 좁아져 결과가 0건이 되고, 같은 인물이 곡만 바꿔 두 번 오른다",
    "- 메모·설명·의문·확인 요청·괄호 주석·물음표를 절대 넣지 말 것. \"X 아님 Y 확인\" 같은 문자열은 검색어가 아니다",
    "- 이 칸에 쓸 검색어를 확신할 수 없으면 그 인물을 목록에서 빼라. 요청 인원보다 여유 있게 요청했으니 빠져도 된다",
  );
  return lines.join("\n");
}

/**
 * 팀 경로 프롬프트 (ENTRY-UNIT-1 · 원장 D-73).
 *
 * 2026-10-27 대표 실측: 런칭 대회 ①("…최고의 무대를 연출한 팀은 누구?")을 개인 경로로
 * 채웠더니 팀이 아니라 멤버 48명이 나왔다. 제목으로 단위를 짐작하게 두지 않고
 * 운영자가 STEP 1에서 고른 단위가 여기까지 온다.
 *
 * 개인 경로의 규칙을 팀 단위로 옮겨 썼다:
 *   - 수를 "명"이 아니라 "개"로 센다(원장 D-31 — 엔트리는 48"개")
 *   - 적격성: 탈퇴 멤버 규칙은 팀에 없으니 빠지고, 중대한 논란만 팀 단위로. 해체·활동 중단 제외는 2026-11-01 D-75로 삭제(런칭 대회 ① "전설" — 옛 그룹도 들어가야 맞다)
 *   - 검색어: 활동명 자리가 없다 — "<그룹 영문명> stage|performance" 2~3단어.
 *     곡명 금지 · 메모 금지는 개인 경로와 같은 이유(AI-2 · AI-2.5)로 그대로
 *
 * 서버 그물(rosterExclusions · 중복 판정)은 경로와 상관없이 같은 것을 쓴다 — 그룹
 * 이름에서 잘못 걸리지 않는 것은 aiFillCore.test.ts 의 팀 명단 시험이 지킨다.
 */
function buildGroupPrompt(opts: BuildPromptOptions): string {
  const { title, category, description, keywords, existing, count } = opts;
  const askMin = count + OVER_REQUEST_MIN;
  const askMax = count + OVER_REQUEST_MAX;
  const lines = [
    `다음 Tournament 제목과 카테고리에 맞는 엔트리를 ${askMin}~${askMax}개 추천해줘.`,
    "이 대회의 엔트리 단위는 **팀(그룹)**이다 — 엔트리 하나 = 그룹 하나.",
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
      `이미 엔트리 ${existing.length}개가 채워져 있어. 아래 그룹과 겹치지 않는 새 그룹만 추천해줘 (제외 목록): ${existing.join(", ")}`,
    );
  }
  lines.push(
    "",
    "각 엔트리를 JSON 배열로 반환:",
    `[{ "name": string, "nationality": string, "affiliation": string, "imageSearchKeyword": string }]`,
    "",
    "규칙:",
    `- ${askMin}~${askMax}개 (서버가 앞에서부터 ${count}개만 채택하니 확실한 그룹부터 순서대로)`,
    "- 각 항목은 **그룹(팀) 하나**다. 멤버 개인은 넣지 않는다. 솔로 활동가도 넣지 않는다",
    "- 실존 그룹만. 가상·합성 그룹을 지어내지 말 것",
    "- 같은 그룹을 두 번 넣지 말 것",
    "- 퍼포먼스 기반 공개 데이터만 사용",
    // 2026-10-29 사전 점검: 이 줄이 "그룹 이름"뿐이었을 때 48개가 전부 영어(BTS·BLACKPINK)로 왔다.
    // 개인 경로는 한글(지민·제니)로 온다 — 원장 D-61 "정본 = 한글 name"(중복 판정·검색 기준,
    // 영어는 발행 때 nameI18n.en 으로 따로 받는다). 팀도 같은 규칙을 지키게 한글을 못 박는다.
    "- name = 그룹의 **한글 이름** (예: 방탄소년단 · 블랙핑크 · 뉴진스). 영어 표기는 쓰지 말 것 — 영어 이름은 발행 때 따로 붙는다. 한글 표기가 없는 그룹만 공식 표기 그대로",
    "- affiliation = 그 그룹의 소속사 (예: YG Entertainment · JYP Entertainment). 소속사를 모르거나 없으면 빈 문자열",
    "- nationality = **ISO 3166-1 alpha-2 국가 코드 두 글자 대문자** (예: KR · JP · US · TH). 나라 이름을 한글이나 영어로 적지 말 것 — 화면이 보는 사람의 언어로 바꿔 보여준다",
    "- 카테고리에 실제로 속한 그룹이면 국적을 가리지 말 것 (K-POP이면 한국 그룹을 피하지 말 것). 국적 다양성은 카테고리 자체가 글로벌일 때만 고려한다",
    "- 명단 적격성 — 학교폭력·범죄 등 중대한 사회적 물의로 그룹 자체가 논란이 된 그룹은 넣지 않는다",
    "- 한 그룹을 적을 때마다 스스로 확인한다: \"논란이 없었나\". 걸리면 그 그룹을 빼고 **다른 그룹으로 채운다**",
  );
  lines.push(
    "",
    "imageSearchKeyword 규칙:",
    "- 이 칸은 유튜브 검색창에 그대로 붙여 넣을 검색어다. 메모장이 아니다",
    "- 형식: 그룹 영문명 + stage 또는 performance. 2~3단어로 끝낸다",
    '- 예시 형식: "<그룹 영문명> stage" 또는 "<그룹 영문명> performance"',
    "- 멤버 이름은 넣지 말 것. 엔트리는 그룹이다",
    "- 곡 제목·노래 이름은 넣지 말 것. 곡명이 들어가면 검색이 지나치게 좁아져 결과가 0건이 되고, 같은 그룹이 곡만 바꿔 두 번 오른다",
    "- 메모·설명·의문·확인 요청·괄호 주석·물음표를 절대 넣지 말 것. \"X 아님 Y 확인\" 같은 문자열은 검색어가 아니다",
    "- 이 칸에 쓸 검색어를 확신할 수 없으면 그 그룹을 목록에서 빼라. 요청 개수보다 여유 있게 요청했으니 빠져도 된다",
  );
  return lines.join("\n");
}

/**
 * 단위 값 읽기. 빠지면(undefined·null·빈 문자열) 개인 — 옛 화면 호환.
 * 그 밖의 모르는 값은 null(호출자가 invalid-argument 로 돌려보낸다 — 모델을 부르기 전에).
 */
export function parseEntryUnit(v: unknown): EntryUnit | null {
  if (v === undefined || v === null || v === "") return "individual";
  return typeof v === "string" && (ENTRY_UNITS as readonly string[]).includes(v)
    ? (v as EntryUnit)
    : null;
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

  const entryUnit = parseEntryUnit(input.entryUnit);
  if (!entryUnit) {
    throw new AiFillError("invalid-argument", "entryUnit은 individual 또는 group이어야 합니다.");
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
      buildPrompt({ title, category, description, keywords, existing, count, entryUnit }),
    );
  } catch (e) {
    // DP-1 fix: capture the original error instead of swallowing it.
    deps.logError?.("aiFillCore createMessage failed", e);
    throw new AiFillError("ai-failed", "AI 호출에 실패했습니다.");
  }

  // parseAiContestants throws ContestantParseError on bad/short output; the
  // onCall wrapper maps that to HttpsError('internal') with a retry hint.
  // AI-2: 검증기가 버린 항목은 요약 한 줄로 남긴다(R6 — 이름·힌트·사유까지만).
  const discarded: DiscardedContestant[] = [];
  const notices: ContestantNotice[] = [];
  const contestants = parseAiContestants(text, count, {
    onDiscard: (item) => discarded.push(item),
    onNotice: (item) => notices.push(item),
  });
  if (discarded.length > 0) {
    deps.logInfo?.(
      `aiFillCore discarded ${discarded.length} item(s): ` +
        discarded
          .map(
            (d) =>
              `[${d.reason}] ${d.name} 🔎${d.imageSearchKeyword}` +
              (d.detail ? ` — ${d.detail}` : ""),
          )
          .join(" | "),
    );
  }
  // AI-2.1: 버리지 않고 남긴 검수 플래그. 슬롯 번호를 함께 남겨 운영자가
  // 그리드에서 바로 찾을 수 있게 한다(index + 1 = 화면의 슬롯 번호).
  if (notices.length > 0) {
    deps.logInfo?.(
      `aiFillCore review flags ${notices.length}: ` +
        notices
          .map(
            (n) =>
              `[${n.flag}] 슬롯 ${n.index + 1} ${n.name} 🔎${n.imageSearchKeyword}` +
              (n.suggestedNameTokens?.length
                ? ` (정정 후보: ${n.suggestedNameTokens.join(" ")})`
                : "") +
              ` — ${n.detail}`,
          )
          .join(" | "),
    );
  }
  return contestants;
}
