/**
 * pressPrompt — TIO 외신 종합 초안 지시문 (PRESS-1 PR 1 · 지시서 3-2).
 *
 * 들어가는 것(지시서 3-2 그대로): 킥 v0.1 4절 TIO 쓰기 규칙 **전문** + 기사 뼈대(훅 · 사실 · 끝 한 줄) +
 * LANGUAGE.md 금지 낱말 + "오늘 날짜 기준 최근 24시간 소식을 먼저" + 키워드 목록에서 하나만.
 * 결과는 한 번에 3언어(ko · en · es) JSON — 번역 호출을 따로 하지 않는다(비용이 한 달 한도 안에 다 잡힌다).
 * 다시 쓰기(PR 2 콜러블)도 이 함수 하나로 — 옛 본문 · 옛 출처 · 대표의 고칠 점을 덧붙인다.
 */
import { PRESS_PHOTO_KEYWORDS, type ArticleCategory, type ArticleSource } from "../_news/articleDoc";
import { FORBIDDEN_WAR_WORDS } from "./newsPrompts";

/** 킥 v0.1 4절 — 글자 그대로(바꾸면 pressPrompt.test 가 막는다). */
export const PRESS_WRITING_RULES = [
  "- 사실(누가 · 무엇 · 언제 · 몇 위)만 가져오고, 남의 문장 · 표현 · 구성은 옮기지 않는다.",
  '- 서로 다른 매체 두 곳 이상에서 확인된 사실로 쓴다. 한 곳에만 있으면 "○○ 보도에 따르면"으로 밝힌다.',
  "- 따옴표 인용은 기사당 1~2개, 한 줄 이내.",
  '- 차트 인용(빌보드 등)은 필요한 순위 몇 개만 "빌보드 ○○ 차트(○월 ○일자) ○위" + 원문 링크. 차트 전체를 옮겨 싣지 않는다.',
  "- 확인 안 된 것 · 소문 · 사생활 · 추측은 쓰지 않는다. 날짜와 숫자는 출처와 대조.",
  "- 중국발 출처는 검증을 거쳐서만 쓴다(대표 소통 규칙 10).",
  "- 월크48 낱말 규칙 · 기사 뼈대(1절 11 · 12) 그대로.",
].join("\n");

/**
 * 고르는 주제 — 대표 문장(2026-11-26, 글자 그대로). 4절 "사생활은 쓰지 않는다"를 TIO 가
 * "공개 발표된 이혼은 써도 된다"로 읽어 이혼 기사를 낸 뒤 더함.
 */
export const PRESS_TOPIC_RULE =
  "열애 · 결혼 · 이혼 · 건강 · 가족 같은 사생활 소식은 기사의 주제로 고르지 않는다. 음악 · 활동 · 기록 · 사업 소식을 주제로 고른다. 다만 그런 기사 안에서, 본인이 공개 발표한 사실을 배경 설명으로 한두 문장 언급하는 것은 된다.";

/** 사진 키워드의 뜻 — 킥 v0.2 키워드 폴더 표 그대로. 키워드를 더하면 여기에도 한 줄(pressPrompt.test 가 막는다). */
export const PRESS_KEYWORD_MEANING: Readonly<Record<string, string>> = {
  default: "맞는 키워드가 없을 때",
  comeback: "컴백·신곡",
  chart: "차트",
  "reverse-run": "역주행",
  debut: "데뷔",
  stage: "무대",
  broadcast: "방송 출연",
  award: "시상식",
  concert: "콘서트·투어",
  fandom: "팬덤",
  challenge: "챌린지",
  record: "조회수·기록",
  collab: "협업",
  youtube: "유튜브",
  sns: "SNS",
  cover: "커버",
  revenue: "수익",
  business: "비즈니스",
  event: "행사",
};

/** LANGUAGE.md 금지 낱말(킥 v0.1 1절 12) — 기사 본문 어디에도 쓰지 않는다. */
const FORBIDDEN_WORDS = ["표", "투표", "참가자", "후보자", "48명", "FIFA"] as const;

const CATEGORY_LABEL: Record<ArticleCategory, string> = {
  kpop: "K-POP(케이팝 가수 · 그룹 · 음악 산업)",
  creator: "CREATOR(유튜버 · 스트리머 · 틱톡 등 온라인 크리에이터)",
};

export interface PressRewriteInput {
  oldTitle: string;
  oldText: string;
  oldSources: ArticleSource[];
  note: string;
}

const OUTPUT_SPEC = [
  "출력은 JSON 객체 하나로만(앞뒤에 다른 글 없이):",
  "{",
  '  "ko": { "title": string, "subhead": string, "blocks": Block[] },',
  '  "en": { "title": string, "subhead": string, "blocks": Block[] },',
  '  "es": { "title": string, "subhead": string, "blocks": Block[] },',
  '  "sources": [ { "outlet": 매체 이름, "title": 기사 제목, "url": 주소 } ],',
  '  "photoKeyword": string',
  "}",
  "Block 은 이 순서로만: 맨 앞 lead 1개 → paragraph 1~4개 → 맨 끝 closer 1개.",
  '  { "type":"lead", "text": 훅 } · { "type":"paragraph", "text": 사실 } · { "type":"closer", "text": 끝 한 줄 }',
  "세 언어는 같은 기사다 — 사실 · 숫자 · 고유명사(영문 원형)를 똑같이 둔다.",
  '"sources" 에는 이번에 웹 검색 결과로 실제로 읽은 기사의 주소만 넣는다. 검색 결과에 없던 주소를 지어내지 않는다.',
].join("\n");

export function buildPressPrompt(args: {
  category: ArticleCategory;
  /** 오늘(KST · YYYY-MM-DD). */
  todayKst: string;
  rewrite?: PressRewriteInput;
}): string {
  const keywords = PRESS_PHOTO_KEYWORDS[args.category];
  const lines = [
    "당신은 WorldCrown48 뉴스룸의 뉴스 AI 'TIO' 다. 웹 검색으로 여러 매체의 보도를 찾아 읽고,",
    "그 사실을 재료로 자기 문장으로 새 기사 한 건을 쓴다.",
    "",
    `분야: ${CATEGORY_LABEL[args.category]}`,
    `오늘 날짜(KST): ${args.todayKst} — 오늘 날짜 기준 최근 24시간 소식을 먼저 찾는다. 없으면 가장 최근의 큰 소식.`,
    "",
    "쓰기 규칙(반드시 지킨다):",
    PRESS_WRITING_RULES,
    "",
    `주제 고르기: ${PRESS_TOPIC_RULE}`,
    "",
    "기사 뼈대 = 앞 훅(lead) · 가운데 사실(paragraph) · 끝 한 줄(closer).",
    "",
    `금지 낱말 — 어느 언어로도 쓰지 않는다: ${FORBIDDEN_WORDS.join(" · ")} · 그리고 전투 은유(${FORBIDDEN_WAR_WORDS.join(" · ")}).`,
    '팬의 선택을 셀 때는 "선택"이라고 쓴다.',
    "",
    `사진 키워드: 아래 목록에서 하나만 골라 "photoKeyword" 에 넣는다. 괄호 안이 그 키워드의 뜻이다.`,
    `  ${keywords.map((k) => `${k}(${PRESS_KEYWORD_MEANING[k] ?? k})`).join(", ")}`,
    "  기사의 중심 소식(제목과 첫 문장이 말하는 일)과 뜻이 맞는 키워드를 고른다. 본문에 숫자나 낱말이 한 번 나온다고 그 키워드를 고르지 않는다.",
    "  중심 소식과 뜻이 맞는 키워드가 없으면 default 를 고른다.",
  ];
  if (args.rewrite) {
    const r = args.rewrite;
    lines.push(
      "",
      "이번 일은 다시 쓰기다. 아래 옛 초안을 발행인의 고칠 점에 맞춰 새로 쓴다. 필요하면 다시 검색해도 된다.",
      `옛 제목: ${r.oldTitle}`,
      "옛 본문:",
      r.oldText,
      "옛 출처:",
      ...r.oldSources.map((s) => `  - ${s.outlet} · ${s.title} · ${s.url}`),
      `발행인의 고칠 점: ${r.note}`,
      "옛 출처 주소를 다시 쓰려면 이번에 검색해 결과로 다시 읽어야 한다(검색 결과에 있는 주소만 남는다).",
    );
  }
  lines.push("", OUTPUT_SPEC);
  return lines.join("\n");
}
