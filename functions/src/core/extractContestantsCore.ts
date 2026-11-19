/**
 * extractContestantsCore — 붙여넣은 유튜브 링크의 **제목·채널명에서** 인물을 읽어낸다
 * (LAB-UX-1 마무리 ③, 대표 확정 2026-08-26).
 *
 * 운영자가 링크 48개를 붙이면 지금까지는 영상만 슬롯에 꽂혔다. 이름·소속은 전부
 * 손으로 쳐야 했다. 그런데 그 정보는 대개 제목에 이미 적혀 있다
 * (`[KARINA FOCUS] aespa 카리나 직캠`). 검수 단계에서 제목·채널을 이미 받아오므로
 * (LinkVerdict.title/channelTitle) **추가 API 없이** 그 문자열만 모델에 넘긴다.
 *
 * ── 이 프롬프트는 위험군이다 ──────────────────────────────────────────────
 * "영상 제목을 보고 사람 이름을 적어라"는 지시는 AI-1의 허구 인물 생성 사고와
 * 같은 종류다([[feedback_prompt_rule_overgeneralizes]]). 그래서 계약을 뒤집는다:
 * **모르면 비워라.** 빈 이름은 실패가 아니라 정상 출력이고, 화면은 그 칸을
 * "수동 필요"로 표시해 사람에게 넘긴다. 지어낸 이름 하나가 48명 명단에 박히는
 * 것보다 빈칸 하나가 낫다.
 *
 * 표기도 같은 원칙의 연장이다(2026-08-27 골든): 제목에 적힌 그대로 쓰고 **로마자로
 * 옮기지 않는다.** 옮기는 것도 제목에 없는 문자열을 만드는 일이고, AI 채우기는 한글로
 * 채우므로 섞이면 같은 사람이 `카리나`와 `Karina`로 두 번 앉는다.
 *
 * 국가도 같은 원칙이다 — 제목에 국적이 적히는 일은 드물다. 확실할 때만 채운다
 * (대표 확정). 소속은 제목·채널에 그룹명이 그대로 나오는 경우가 많아 이름보다
 * 신뢰도가 높지만, 역시 없으면 비운다.
 *
 * 소속(affiliation)은 이름과 반대로 **로마자 표기를 우선**한다(2026-08-29 대표 확정,
 * name-i18n-gap.md ②) — 화면 전체 소속 표기를 영문 공식명(aespa·IVE)으로 통일하는
 * 결정과 맞추기 위해서다. 이름은 한글 고정(중복 판정용 정본), 소속은 영문 고정
 * (표시용) — 서로 다른 이유로 반대 방향을 향하니 헷갈리지 말 것.
 *
 * 주입식 deps(`createMessage`)는 aiFillCore·aiSuggestKeywordsCore와 같은 모양이라
 * Firebase·네트워크 없이 단위 테스트가 돈다.
 *
 * 엔트리 단위(원장 D-73 · LAB-FIX-2 2026-11-08): 팀 대회면 `buildTeamExtractPrompt` 로 **그룹**을
 * 읽는다. 개인 지시문(`buildExtractPrompt`)은 한 글자도 바꾸지 않았다 — 골든 실측이 그 문장 위에서
 * 나온 결과라서(aiFillCore 의 개인/팀 분리와 같은 원칙). 시험이 개인 지시문의 sha256 을 잠근다.
 */
import { parseEntryUnit, type EntryUnit } from "./aiFillCore";
import { NAME_SCRIPT_RULE, briefRuleLines, parseAiBrief, usesBriefPrompt, type AiBrief } from "./aiBrief";

/** 추출 대상 1건 — 검수기가 이미 받아 둔 값만 넘긴다(추가 API 0콜). */
export interface ExtractItem {
  videoId: string;
  title: string;
  channelTitle: string;
}

/** 추출 결과 1건. 이름이 비면 `confident: false`이고 화면은 "수동 필요"로 그린다. */
export interface ExtractedContestant {
  videoId: string;
  /** 확신할 수 없으면 **빈 문자열**. 지어내지 않는다. */
  name: string;
  /** 그룹·팀·채널. 없으면 빈 문자열. */
  affiliation: string;
  /** ISO 3166-1 alpha-2. 확실할 때만. 없으면 빈 문자열. */
  nationality: string;
  /** 이름을 확신하는가 — 화면 배지(제안 / 수동 필요)를 가른다. */
  confident: boolean;
}

export type ExtractErrorReason = "unauthenticated" | "invalid-argument" | "ai-failed";

export class ExtractError extends Error {
  constructor(
    public reason: ExtractErrorReason,
    message: string,
  ) {
    super(message);
    this.name = "ExtractError";
  }
}

/** 한 콜에 담을 최대 항목 수 — 48칸을 한 번에 붙여도 1콜로 끝난다. */
export const MAX_EXTRACT_ITEMS = 48;

export interface ExtractDeps {
  createMessage: (prompt: string) => Promise<string>;
  logInfo?: (message: string) => void;
  logError?: (message: string, err: unknown) => void;
}

function toStr(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

/** 국가 값 정규화 — parseContestants.normalizeCountry와 같은 규칙(두 곳 복제 허용 지점). */
function normalizeCountry(value: string): string {
  const trimmed = toStr(value);
  return /^[A-Za-z]{2}$/.test(trimmed) ? trimmed.toUpperCase() : "";
}

export function buildExtractPrompt(items: readonly ExtractItem[]): string {
  const rows = items
    .map(
      (it, i) =>
        `${i + 1}. id="${it.videoId}" | 제목="${it.title}" | 채널="${it.channelTitle}"`,
    )
    .join("\n");

  return [
    "아래는 유튜브 영상의 제목과 채널명이다. 각 줄이 **어떤 인물의 영상인지** 읽어라.",
    "",
    "규칙:",
    // 이 세 줄이 이 프롬프트의 전부다. 나머지는 형식이다.
    "- 제목·채널에 적힌 것만 근거로 삼는다. 바깥 지식으로 보충하지 마라",
    "- 인물을 **확신할 수 없으면 name을 빈 문자열로 두고 confident를 false로** 한다. 빈칸은 정상이고, 사람이 나중에 채운다",
    "- 절대로 그럴듯한 이름을 지어내지 마라. 틀린 이름 하나가 빈칸 하나보다 훨씬 나쁘다",
    "",
    "- name: 인물 한 명의 활동명. 그룹 전체 영상이라 한 명을 특정할 수 없으면 비운다",
    // 2026-08-27 골든: `카리나`가 적힌 제목에서 `Karina`가 돌아왔다. 로마자로 옮기는
    // 것도 **제목에 없는 문자열을 만드는 일**이라 "지어내지 마라"의 연장이다.
    // 게다가 AI 채우기(aiFillContestants)는 한글로 채우므로, 한 토너먼트에
    // `카리나`와 `Karina`가 같이 앉고 중복 판정도 못 잡는다
    // (normalizeNameKey는 한글↔로마자를 같은 키로 묶지 않는다 — AI-2가 "변환표는
    //  범위 밖"으로 명시한 지점이다).
    "- name은 **제목·채널에 적힌 표기를 그대로** 쓴다. 로마자로 옮기거나 번역하지 마라",
    "- 한글 표기와 로마자 표기가 둘 다 있으면 **한글 표기**를 쓴다 (예: 제목이 `아이브 장원영 직캠 IVE JANGWONYOUNG`이면 `장원영`)",
    // 소속 표기 통일(2026-08-28 대표 확정, name-i18n-gap.md ②) — AI 채우기(aiFillCore)와
    // 같은 규칙: 영문 공식명이 있으면 그걸 쓰고, 없으면 제목·채널에 적힌 원문 그대로,
    // 그마저 없으면(솔로·소속 미표기) 빈칸.
    "- affiliation: 그룹·팀·채널명. **영문(로마자) 공식 표기가 있으면 그걸 쓴다** (예: aespa · IVE · BLACKPINK)",
    "- 공식 로마자 표기가 없는 팀·채널이면 제목·채널에 적힌 원문 그대로 쓴다. 솔로 활동가이거나 제목·채널에 소속이 드러나지 않으면 빈 문자열로 비운다",
    "- nationality: ISO 3166-1 alpha-2 두 글자 대문자. **제목만 보고 국적을 추측하지 마라** — 확실하지 않으면 비운다",
    "- confident: name을 확신하면 true, 비웠거나 애매하면 false",
    "",
    "- 목록에 있는 id만 쓴다. 새 id를 만들지 마라",
    "- 줄 수와 결과 수를 같게 한다",
    "- 설명·머리말 없이 JSON 한 줄만 출력한다",
    "",
    "출력 형식:",
    '{"extractions":[{"id":"<id>","name":"","affiliation":"","nationality":"","confident":false}]}',
    "",
    "목록:",
    rows,
  ].join("\n");
}

/**
 * 팀 단위 추출 지시문 (D-73 적용 · LAB-FIX-2). 자제 규칙("모르면 비워라 · 지어내지 마라")과 항목·출력
 * 형식은 개인과 같다 — 같은 파서(parseExtractions)가 읽는다. 다른 것은 name 이 **그룹**이라는 점:
 * 표기는 aiFillCore 팀 지시문과 같은 규칙(한글 정본 · 원장 D-61)이다.
 */
export function buildTeamExtractPrompt(items: readonly ExtractItem[]): string {
  const rows = items
    .map(
      (it, i) =>
        `${i + 1}. id="${it.videoId}" | 제목="${it.title}" | 채널="${it.channelTitle}"`,
    )
    .join("\n");

  return [
    "아래는 유튜브 영상의 제목과 채널명이다. 각 줄이 **어느 그룹(팀)의 영상인지** 읽어라.",
    "",
    "규칙:",
    "- 제목·채널에 적힌 것과, 거기 적힌 이름이 속한 그룹만 근거로 삼는다",
    "- 그룹을 **확신할 수 없으면 name을 빈 문자열로 두고 confident를 false로** 한다. 빈칸은 정상이고, 사람이 나중에 채운다",
    "- 절대로 그럴듯한 그룹 이름을 지어내지 마라. 틀린 이름 하나가 빈칸 하나보다 훨씬 나쁘다",
    "",
    "- name: 그룹(팀) 하나의 **한글 이름** (예: 방탄소년단 · 블랙핑크 · 베이비몬스터). 영어 표기는 쓰지 말 것 — 영어 이름은 발행 때 따로 붙는다. 한글 표기가 없는 그룹만 공식 표기 그대로",
    "- 멤버 개인 영상이면 그 멤버가 속한 **그룹**을 name에 적는다. 멤버 이름은 적지 않는다. 그룹이 없는 솔로 활동가면 비운다",
    "- affiliation: 그 그룹의 소속사 또는 채널. **영문(로마자) 공식 표기가 있으면 그걸 쓴다** (예: YG Entertainment · JYP Entertainment). 모르면 빈 문자열",
    "- nationality: ISO 3166-1 alpha-2 두 글자 대문자 (예: KR · JP · US). 그룹의 국적이 확실할 때만, 아니면 비운다",
    "- confident: 그룹을 특정하면 true, 비웠거나 애매하면 false",
    "",
    "- 목록에 있는 id만 쓴다. 새 id를 만들지 마라",
    "- 줄 수와 결과 수를 같게 한다",
    "- 설명·머리말 없이 JSON 한 줄만 출력한다",
    "",
    "출력 형식:",
    '{"extractions":[{"id":"<id>","name":"","affiliation":"","nationality":"","confident":false}]}',
    "",
    "목록:",
    rows,
  ].join("\n");
}

export interface BriefExtractContext {
  brief: AiBrief;
  entryUnit: EntryUnit;
  /** 대회 제목 · 설명 — AI 가 "이 대회가 무엇을 뽑는가"를 알게 한다(지시서 §3-2 ①). */
  tournamentTitle: string;
  tournamentDescription: string;
}

/**
 * 묶음 지시문 (LAB-FIX-4 · 원장 결정 A · E). 2026-11-18 대표 실측: 커버 영상 제목
 * `TEMPEST (템페스트) - 'BAD NEWS' Dance Cover by W-UNIT from Vietnam` 에서 팀 지시문이 원곡 그룹
 * "템페스트 · KR"을 골랐다(맞는 값 W-Unit · VN). 팀 지시문은 아이돌 영상을 전제로 "적힌 이름이 속한 그룹"을
 * 시키고, AI 는 대회가 무엇을 뽑는지 받지 못했다. 그래서 대회 제목 · 설명과 운영자의 세 줄을 맨 위 규칙으로
 * 준다. 자제 규칙("모르면 비워라 · 지어내지 마라")과 출력 형식은 옛 지시문과 같다 — 같은 파서가 읽는다.
 */
export function buildBriefExtractPrompt(
  items: readonly ExtractItem[],
  ctx: BriefExtractContext,
): string {
  const rows = items
    .map(
      (it, i) =>
        `${i + 1}. id="${it.videoId}" | 제목="${it.title}" | 채널="${it.channelTitle}"`,
    )
    .join("\n");
  const head = [
    "아래는 유튜브 영상의 제목과 채널명이다. 각 줄에서 **이 대회의 엔트리에 해당하는 것**을 읽어라.",
    "",
    `대회 제목: "${ctx.tournamentTitle}"`,
  ];
  if (ctx.tournamentDescription) head.push(`대회 설명: ${ctx.tournamentDescription}`);

  return [
    ...head,
    "",
    ...briefRuleLines(ctx.brief, ctx.entryUnit, { rulesUse: "identify" }),
    "",
    "규칙:",
    "- 먼저 위 규칙의 **엔트리가 어떤 종류인지** 본다. 엔트리가 노래 · 작품 · 제품 · 배역처럼 사람이나 팀이 아니면, 사람 · 팀 · 채널 이름은 name 이 될 수 없다 — 그 사람(예: 노래의 가수)은 덧붙이는 정보(affiliation)일 수 있다",
    "- 제목·채널에서 위 규칙의 엔트리에 해당하는 것을 찾아 name 에 적는다 (예: 엔트리가 노래 제목이면 제목의 따옴표 안 곡명)",
    "- 한 제목에 이름이 여럿 나오면 어느 것이 엔트리인지 위 규칙으로 가른다. 커버·리액션·리뷰 영상에서는 원곡 가수 · 리뷰 대상 · 영상을 올린 사람 중 누가 엔트리인지 따진다. **엔트리가 아닌 이름**(예: 엔트리가 춤춘 팀일 때 커버 영상의 원곡 가수, 리뷰 채널 이름)은 name 에 적지 마라",
    "- 영상을 올린 사람(채널)은 위 규칙이 그 사람을 엔트리로 정할 때만 엔트리다",
    // LAB-FIX-4b — 아래 세 줄은 엔트리가 사람 · 팀일 때만. 노래 대회에 그대로 쓰면 가수를 엔트리로 고른다(다른 묶음 확인 6회차).
    "- 엔트리가 사람 · 팀일 때만: 제목에서 찾은 엔트리 이름과 채널 이름이 같은 엔트리를 가리키면(채널 이름이 그 이름으로 시작하거나 그 이름을 담고 있으면) **채널 이름**(꾸밈말 `Official` · `• Official` · `Dance Studio` · `official` 과 기호를 뺀 것)을 name 으로 쓴다. 채널 쪽이 더 완전한 이름이기 때문이다 (예: 제목 `… Dance Cover by NOVA`, 채널 `NOVA Dance Crew • Official` → NOVA Dance Crew). 채널이 다른 이름이면 제목의 이름을 쓴다",
    "- 엔트리가 사람 · 팀일 때만: 제목에 엔트리 이름이 없거나 어느 것이 엔트리인지 가를 수 없을 때, 채널이 위 규칙의 엔트리에 해당하면(엔트리가 스스로 올린 영상) 채널 이름을 엔트리로 쓴다. 채널이 엔트리가 아니면(방송사 · 소속사 · 리뷰 채널 등) 쓰지 않는다",
    "- 엔트리가 사람 · 팀일 때만: 제목에 사람·팀 이름이 하나뿐이고 위 규칙이 그 이름을 엔트리가 아니라고 하지 않으면(예: 제목 `2026 NOVA Concert`), 그 이름이 엔트리다",
    "- 한 이름 안에 한글 표기와 로마자 표기를 함께 쓰지 않는다(예: `노바 NOVA` ×). 둘 다 있으면 아래 이름 표기 규칙에 맞는 하나만",
    "- 이 영상들은 운영자가 이미 골라 붙여 넣은 것이다. 고르는 조건은 **누가 엔트리인지 가리는 데만** 쓰고, 조건에 맞지 않아 보인다는 이유로 name 을 비우지 마라",
    "- 제목·채널에 적힌 것만 근거로 삼는다. 바깥 지식으로 보충하지 마라",
    "- 엔트리를 **확신할 수 없으면 name을 빈 문자열로 두고 confident를 false로** 한다. 빈칸은 정상이고, 사람이 나중에 채운다",
    "- 절대로 그럴듯한 이름을 지어내지 마라. 틀린 이름 하나가 빈칸 하나보다 훨씬 나쁘다",
    "",
    "- name 은 **제목·채널에 적힌 표기를 그대로** 쓴다. 로마자로 옮기거나 번역하지 마라",
    // LAB-FIX-5 결정 F — 옛 줄 "둘 다 있으면 한글"은 외국 크루 · 인물도 한글로 고르게 했다.
    NAME_SCRIPT_RULE,
    "- 한글 표기만 있는 외국 엔트리는 적힌 그대로 두고 로마자로 옮기지 마라(제목에 없는 문자열을 만들지 않는다). 사람 · 팀이 아닌 엔트리(노래 · 작품)는 제목에 적힌 공식 표기 그대로",
    "- affiliation: 위 규칙의 덧붙이는 정보 — 제목·채널에 드러나면 적는다(예: 엔트리가 노래 제목이고 덧붙이는 정보가 가수면 제목에 적힌 그 노래의 가수). 드러나지 않으면 빈 문자열",
    // LAB-FIX-5 §3-5 — B줄 사전 점검: 29번 베베 칸 소속에 원곡 가수 "YOUNG POSSE". 서버 그물(dropOriginalArtistExtra)도 함께.
    "- 엔트리가 사람 · 팀일 때: 커버 · 리액션 · 리뷰 영상의 원곡 가수 · 원작자는 affiliation 에도 적지 않는다. 원곡 가수는 그 엔트리의 소속이 아니다. 소속을 알 수 없으면 빈 문자열",
    "- nationality: ISO 3166-1 alpha-2 두 글자 대문자. 제목에 `from Vietnam` · `from FRANCE` 같은 나라 문구가 있으면 그 나라로 정한다. 그런 문구가 없으면 엔트리의 나라가 제목·채널에서 확실할 때만 적고, 아니면 비운다. 원곡 가수의 나라를 엔트리의 나라로 적지 마라",
    "- confident: 제목·채널에서 엔트리 이름을 찾았으면 true, 찾지 못해 비웠으면 false. 고르는 조건에 맞는지 애매하다는 것은 false 로 할 이유가 아니다",
    "",
    "- 목록에 있는 id만 쓴다. 새 id를 만들지 마라",
    "- 줄 수와 결과 수를 같게 한다",
    "- 설명·머리말 없이 JSON 한 줄만 출력한다",
    "",
    "출력 형식:",
    '{"extractions":[{"id":"<id>","name":"","affiliation":"","nationality":"","confident":false}]}',
    "",
    "목록:",
    rows,
  ].join("\n");
}

/** 채널 이름 뒤에 붙어도 "같은 엔트리의 더 완전한 이름"으로 보는 낱말 — 크루 · 팀을 나타내는 말만(허용 목록). */
const ENTITY_SUFFIX = new Set(["crew", "dance", "team", "dc", "squad", "company", "collective", "unit", "group"]);
/** 채널 꾸밈말 — 이름이 아니다. */
const CHANNEL_DECORATION = new Set(["official", "offical", "공식"]);

/**
 * 서버 그물 (LAB-FIX-4b). 제목에 적힌 줄인 이름(HANABI)을 채널의 전체 이름(Hanabi Dance Crew)으로 바꾼다.
 * 지시문으로도 시켰지만 실 AI 회차마다 지켰다 안 지켰다 했다(3·5회차 지킴 · 1·2·8회차 안 지킴) — 규칙은 코드가 지킨다.
 *
 * 바꾸는 때는 좁다: 이름이 채널 이름의 **앞부분**(낱말 경계)이고, 채널 쪽 나머지가 크루 · 팀 말(ENTITY_SUFFIX) 또는
 * 두 글자 대문자 지역 표시(PH)뿐일 때. 꾸밈말(Official)만 남거나 · 방송사 · 소속사 · 채널(YouTube Channel ·
 * Entertainment) 같은 말이 섞이거나 · 한글 병기면 그대로 둔다. 대소문자는 채널의 것을 쓴다.
 */
export function preferChannelFullName(name: string, channel: string): string {
  const n = toStr(name);
  if (!n) return n;
  const clean = toStr(channel).replace(/[•|·]/g, " ").replace(/\s+/g, " ").trim();
  if (!clean.toLowerCase().startsWith(n.toLowerCase())) return n;
  const rest = clean.slice(n.length);
  if (rest !== "" && !/^\s/.test(rest)) return n; // 낱말 경계가 아니다(NOVA → NOVAK)
  const tail = rest.trim().split(" ").filter((t) => t && !CHANNEL_DECORATION.has(t.toLowerCase()));
  if (tail.length === 0 || tail.length > 3) return n;
  const ok = tail.every((t) => ENTITY_SUFFIX.has(t.toLowerCase()) || /^[A-Z]{2}$/.test(t));
  if (!ok) return n;
  return [clean.slice(0, n.length), ...tail].join(" ");
}

/**
 * 서버 그물 (LAB-FIX-5 §3-5). 제목에 원곡 표시가 **글자로 적혀 있고**(`원곡: X` · `Original: X` · `original song by X`)
 * 소속 칸이 그 X 와 같으면 소속을 비운다. 엔트리가 사람 · 팀인 세 줄 지시문에서만 쓴다 — 노래 · 작품 대회(그 외)는
 * 가수가 덧붙이는 정보일 수 있다. 원곡 표시가 없는 제목은 건드리지 않는다(제목 앞 이름은 그 사람의 소속일 수 있다 — aespa 카리나 직캠).
 */
const ORIGINAL_MARK_RE = /(?:원곡|original(?:\s+(?:song|artist))?(?:\s+by)?)\s*[:：]?\s*([^)\]|\n]+)/gi;
export function dropOriginalArtistExtra(title: string, extra: string): string {
  const e = toStr(extra);
  if (!e) return e;
  const key = (v: string) => v.toLowerCase().replace(/[\s._\-'’()]/g, "");
  const ek = key(e);
  for (const m of toStr(title).matchAll(ORIGINAL_MARK_RE)) {
    if (key(m[1] ?? "") === ek) return "";
  }
  return e;
}

/**
 * 모델 응답 → 항목별 결과.
 *
 * 파싱 실패·누락 id는 **보수적으로 빈 결과**다: 못 읽은 칸은 "수동 필요"로 남아
 * 사람에게 가는 게, 엉뚱한 값이 들어가는 것보다 낫다. 요청한 id만 살린다 —
 * 모델이 만들어 낸 id는 버린다.
 */
export function parseExtractions(
  raw: string,
  items: readonly ExtractItem[],
): ExtractedContestant[] {
  const blank = (videoId: string): ExtractedContestant => ({
    videoId,
    name: "",
    affiliation: "",
    nationality: "",
    confident: false,
  });

  const byId = new Map<string, ExtractedContestant>();
  const text = (raw ?? "").trim();
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");

  if (start >= 0 && end > start) {
    try {
      const parsed = JSON.parse(text.slice(start, end + 1)) as {
        extractions?: unknown;
      };
      const list = Array.isArray(parsed.extractions) ? parsed.extractions : [];
      for (const entry of list) {
        const o = (entry ?? {}) as Record<string, unknown>;
        const videoId = toStr(o.id) || toStr(o.videoId);
        if (!videoId) continue;
        const name = toStr(o.name);
        // 이름이 비면 confident는 무조건 false다 — 모델이 true를 줘도 믿지 않는다.
        const confident = name !== "" && o.confident === true;
        byId.set(videoId, {
          videoId,
          name: confident ? name : "",
          affiliation: toStr(o.affiliation),
          nationality: normalizeCountry(toStr(o.nationality)),
          confident,
        });
      }
    } catch {
      // 형식이 깨졌으면 전부 빈 결과 — 아래 map이 채운다.
    }
  }

  return items.map((it) => byId.get(it.videoId) ?? blank(it.videoId));
}

export interface ExtractInput {
  uid: string | null | undefined;
  items: unknown;
  /** 엔트리 단위(D-73). 빠지면 개인 — 옛 화면 호환(aiFillCore 와 같은 읽기 함수). */
  entryUnit?: unknown;
  /** LAB-FIX-4 — "AI에게 알려 줄 내용" 묶음. 빠지면 빈 묶음(옛 지시문). */
  aiBrief?: unknown;
  /** LAB-FIX-4 — 대회 제목 · 설명(묶음 지시문에만 실린다). */
  tournamentTitle?: unknown;
  tournamentDescription?: unknown;
}

export async function extractContestantsCore(
  input: ExtractInput,
  deps: ExtractDeps,
): Promise<ExtractedContestant[]> {
  if (!input.uid) {
    throw new ExtractError("unauthenticated", "로그인이 필요합니다.");
  }
  const entryUnit: EntryUnit | null = parseEntryUnit(input.entryUnit);
  if (!entryUnit) {
    throw new ExtractError("invalid-argument", "entryUnit은 individual · group · other 중 하나여야 합니다.");
  }
  const brief = parseAiBrief(input.aiBrief);
  if (!brief) {
    throw new ExtractError("invalid-argument", "AI에게 알려 줄 내용이 글자 수 한도를 넘었습니다.");
  }
  if (!Array.isArray(input.items) || input.items.length === 0) {
    throw new ExtractError("invalid-argument", "추출할 영상이 없습니다.");
  }
  if (input.items.length > MAX_EXTRACT_ITEMS) {
    throw new ExtractError(
      "invalid-argument",
      `한 번에 최대 ${MAX_EXTRACT_ITEMS}건까지 처리할 수 있습니다.`,
    );
  }

  const items: ExtractItem[] = [];
  for (const raw of input.items) {
    const o = (raw ?? {}) as Record<string, unknown>;
    const videoId = toStr(o.videoId);
    if (!videoId) continue;
    items.push({
      videoId,
      title: toStr(o.title),
      channelTitle: toStr(o.channelTitle),
    });
  }
  if (items.length === 0) {
    throw new ExtractError("invalid-argument", "videoId가 있는 항목이 없습니다.");
  }

  let text: string;
  try {
    text = await deps.createMessage(
      usesBriefPrompt(brief, entryUnit)
        ? buildBriefExtractPrompt(items, {
            brief,
            entryUnit,
            tournamentTitle: toStr(input.tournamentTitle).slice(0, 200),
            tournamentDescription: toStr(input.tournamentDescription).slice(0, 2000),
          })
        : entryUnit === "group"
          ? buildTeamExtractPrompt(items)
          : buildExtractPrompt(items),
    );
  } catch (e) {
    deps.logError?.("extractContestantsCore createMessage failed", e);
    throw new ExtractError("ai-failed", "AI 호출에 실패했습니다.");
  }

  const parsed = parseExtractions(text, items);
  // LAB-FIX-4b 서버 그물 — 묶음 지시문 · 사람/팀 단위에서만(노래 · 작품 대회와 옛 지시문은 그대로).
  const out =
    usesBriefPrompt(brief, entryUnit) && entryUnit !== "other"
      ? parsed.map((x, i) => {
          const y = { ...x, affiliation: dropOriginalArtistExtra(items[i].title, x.affiliation) };
          return y.confident ? { ...y, name: preferChannelFullName(y.name, items[i].channelTitle) } : y;
        })
      : parsed;
  const named = out.filter((x) => x.confident).length;
  deps.logInfo?.(
    `extractContestants(${entryUnit}): ${items.length}건 중 이름 확정 ${named}건 · 수동 필요 ${items.length - named}건`,
  );
  return out;
}
