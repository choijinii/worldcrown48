/**
 * relevance — "이 영상이 이 Contestant의 영상인가" 규칙 판정 (LAB-EV-2 §5 A).
 *
 * 왜 규칙이 먼저인가: 후보 하나하나를 모델에 물으면 48명 × 3후보 = 144콜이다.
 * 제목·채널명만 봐도 대부분은 명백하다("BLACKPINK JISOO Solo Stage" / 채널
 * "BLACKPINK"). 규칙이 못 가르는 것만 Haiku 배치 1콜로 넘긴다.
 *
 * 한글 이름 ↔ 로마자 제목("지수" vs "JISOO")은 토큰 매칭으로 못 잇는다 — 그게
 * 정확히 ambiguous로 떨어져 AI가 받는 몫이다. 힌트(`imageSearchKeyword`)가 대개
 * 영문이라 실제로는 힌트 토큰이 이 간극을 메운다.
 *
 * §6 Auto-STOP 3번: ambiguous 비율이 30%를 넘으면 멈추고 보고한다. 그래서
 * `judgeRelevance`는 판정만이 아니라 **왜 그 판정인지(점수·매칭 토큰)**를 돌려준다.
 *
 * AI-2 (2026-08-18): "이 인물의 영상인가"와 "대회 카드에 걸 영상인가"는 다른
 * 질문이다. 학폭 논란 해명 영상은 앞 질문에 확실히 예라서 규칙이 통과시킨다 —
 * 부정 키워드 감점(NEGATIVE_TITLE_TERMS)이 그런 영상을 **정상 무대 뒤로** 민다.
 */
import { hintTokens, tokenize } from "./searchQuery";

export type RelevanceVerdict = "relevant" | "ambiguous" | "irrelevant";

export interface RelevanceScore {
  verdict: RelevanceVerdict;
  /** 0~6. 임계값은 아래 THRESHOLD_* 참조. */
  score: number;
  /** 제목·채널에서 실제로 발견된 이름 토큰 — 운영자 진단용. */
  matchedNameTokens: string[];
  /**
   * 감점을 부른 부정 키워드 (AI-2). 비어 있으면 감점 없음.
   * 배지 툴팁에 그대로 실려 운영자가 "왜 이 영상이 밀렸나"를 본다.
   */
  demotedTerms: string[];
}

/**
 * 공식·방송사 채널 가점 힌트 (킥 §5 A 문면 그대로).
 * 소문자 부분일치라 "1theK (원더케이)"·"Mnet K-POP"·"KBS WORLD TV"가 다 걸린다.
 */
export const CHANNEL_ALLOW_HINTS = [
  "official",
  "mnet",
  "kbs",
  "sbs",
  "mbc",
  "m2",
  "1thek",
] as const;

/** 이 점수 이상이면 규칙만으로 통과. */
export const THRESHOLD_RELEVANT = 3;

/** 이 점수 이하면 규칙만으로 탈락(모델에 묻지 않는다 — 물어봐야 아니다). */
export const THRESHOLD_IRRELEVANT = 0;

/**
 * 부정 키워드 (AI-2 · 킥 §5 B2). 논란·해명·탈퇴를 다루는 영상은 **그 인물의
 * 영상이 맞다** — 관련성은 높은데 팬 투표 대회 카드에 걸 영상은 아니다.
 *
 * 그래서 **제외가 아니라 감점**이다. 정상 무대 영상이 하나라도 있으면 그쪽이
 * 먼저 가고, 이것뿐이면 그래도 후보로 남아 운영자가 판단한다(§6 Auto-STOP —
 * 감점이 정상 무대를 밀어내면 폭을 조정한다).
 *
 * 소문자 부분 일치다. 한국어는 "학폭논란"처럼 붙어 나오므로 낱말 단위로는 못 잡는다.
 * `사과`는 과일과 겹치지만(먹방 제목) 감점일 뿐이라 최악이 순위 한 칸이다.
 */
export const NEGATIVE_TITLE_TERMS = [
  "논란",
  "해명",
  "사과",
  "학폭",
  "학교폭력",
  "탈퇴",
  "활동 중단",
  "활동중단",
  "은퇴",
  "혐의",
  "controversy",
  "apology",
  "apologiz",
  "scandal",
  "allegation",
  "lawsuit",
] as const;

/**
 * 감점 폭. 이름이 완전히 맞는 후보(3.0 = THRESHOLD_RELEVANT)를 ambiguous로
 * 끌어내려 **정상 후보 뒤로 보내는** 최소값이다. 더 키우면 정상 무대까지 밀려난다.
 */
export const NEGATIVE_PENALTY = 1.5;

/**
 * 감점 후 바닥. 감점만으로 THRESHOLD_IRRELEVANT까지 떨어지면 "제외 아님"이 깨진다
 * — 원래 통과선을 넘던 후보는 감점 뒤에도 이 위에서 멈춘다.
 */
export const PENALTY_FLOOR = THRESHOLD_IRRELEVANT + 0.5;

/** 제목·채널명에서 발견된 부정 키워드. 없으면 빈 배열. */
export function findNegativeTerms(text: string): string[] {
  const lower = (text ?? "").toLowerCase();
  return NEGATIVE_TITLE_TERMS.filter((term) => lower.includes(term));
}

function fraction(found: number, total: number): number {
  return total === 0 ? 0 : found / total;
}

/** 채널명이 공식·방송사 힌트를 포함하는가. */
export function hasChannelHint(channelTitle: string): boolean {
  const lower = (channelTitle ?? "").toLowerCase();
  return CHANNEL_ALLOW_HINTS.some((hint) => lower.includes(hint));
}

/**
 * 후보 1건 채점.
 *
 *   이름 토큰 적중률 × 3  (전부 맞으면 그것만으로 통과)
 * + 힌트 토큰 적중률 × 2  (로마자 제목 ↔ 한글 이름의 다리)
 * + 공식 채널 가점 × 1
 */
export function judgeRelevance(
  candidate: { title: string; channelTitle: string },
  target: { name: string; searchHint?: string },
): RelevanceScore {
  const nameTokens = tokenize(target.name).filter((t) => t.length > 1);
  const hints = hintTokens(target.searchHint ?? "", nameTokens);
  const haystack = new Set(tokenize(`${candidate.title} ${candidate.channelTitle}`));

  const matchedNameTokens = nameTokens.filter((t) => haystack.has(t));
  const matchedHints = hints.filter((t) => haystack.has(t));

  const raw =
    fraction(matchedNameTokens.length, nameTokens.length) * 3 +
    fraction(matchedHints.length, hints.length) * 2 +
    (hasChannelHint(candidate.channelTitle) ? 1 : 0);

  // AI-2: 논란·탈퇴를 다루는 영상은 감점해 차순위로 민다(제외 아님).
  const demotedTerms = findNegativeTerms(
    `${candidate.title} ${candidate.channelTitle}`,
  );
  const score =
    demotedTerms.length > 0 && raw > THRESHOLD_IRRELEVANT
      ? Math.max(PENALTY_FLOOR, raw - NEGATIVE_PENALTY)
      : raw;

  const verdict: RelevanceVerdict =
    score >= THRESHOLD_RELEVANT
      ? "relevant"
      : score <= THRESHOLD_IRRELEVANT
        ? "irrelevant"
        : "ambiguous";

  return { verdict, score, matchedNameTokens, demotedTerms };
}

/** AI 판정으로 넘길 항목 한 건. 콜러블이 배치로 모아 1콜에 묻는다. */
export interface AmbiguousItem {
  /** 결과를 되꽂을 키 — `${index}:${videoId}`. */
  key: string;
  name: string;
  searchHint: string;
  title: string;
  channelTitle: string;
}

/**
 * Haiku 배치 판정 프롬프트. **한 콜에 전부** 묻고 JSON 한 줄로 받는다.
 *
 * AI-1 사고([[feedback-prompt-rule-overgeneralizes]] · 허구 인물 생성)의 교훈을
 * 좁게 적용한다: 이 프롬프트는 **아무것도 생성하지 않는다**. 주어진 목록의 각 항목에
 * 대해 예/아니오만 고르게 하고, 목록에 없는 키를 만들지 말라고 못박는다.
 */
export function buildRelevancePrompt(items: AmbiguousItem[]): string {
  const rows = items
    .map(
      (it, i) =>
        `${i + 1}. key="${it.key}" | 후보 인물="${it.name}"${
          it.searchHint ? ` (검색 힌트: ${it.searchHint})` : ""
        } | 영상 제목="${it.title}" | 채널="${it.channelTitle}"`,
    )
    .join("\n");

  return [
    "아래 목록의 각 줄은 '후보 인물' 하나와 '유튜브 영상' 하나의 짝이다.",
    "각 짝에 대해, 그 영상이 **그 인물이 실제로 등장하거나 그 인물을 다루는 영상**인지 판정하라.",
    "",
    "판정 기준:",
    "- 인물 이름이 로마자/한글/현지 표기로 달라도 같은 인물이면 true (예: 지수 = JISOO).",
    "- 그룹 영상이라도 그 인물이 속한 그룹이면 true.",
    "- 리액션·커버·팬메이드·다른 인물의 영상이면 false.",
    "- 판단할 근거가 부족하면 false.",
    "",
    "규칙:",
    "- 목록에 있는 key만 사용한다. 새 key를 만들지 마라.",
    "- 인물·영상·채널에 대한 어떤 정보도 새로 지어내지 마라. 주어진 문자열만 보고 판정한다.",
    "- 설명·머리말 없이 JSON 한 줄만 출력한다.",
    "",
    "출력 형식:",
    '{"judgments":[{"key":"<key>","match":true|false}]}',
    "",
    "목록:",
    rows,
  ].join("\n");
}

/**
 * 모델 응답 → key별 판정. 파싱 실패·누락 key는 **보수적으로 false**다: 관련 없는
 * 영상이 슬롯에 들어가 발행되는 쪽이, 운영자가 그 칸을 손보는 쪽보다 나쁘다.
 */
export function parseRelevanceResponse(raw: string): Map<string, boolean> {
  const out = new Map<string, boolean>();
  const text = (raw ?? "").trim();
  if (!text) return out;

  // 모델이 ```json 펜스를 두르는 경우가 있다 — 첫 { 부터 마지막 } 까지만 본다.
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end <= start) return out;

  let parsed: unknown;
  try {
    parsed = JSON.parse(text.slice(start, end + 1));
  } catch {
    return out;
  }

  const judgments = (parsed as { judgments?: unknown })?.judgments;
  if (!Array.isArray(judgments)) return out;

  for (const j of judgments) {
    const key = (j as { key?: unknown })?.key;
    const match = (j as { match?: unknown })?.match;
    if (typeof key === "string" && key && typeof match === "boolean") {
      out.set(key, match);
    }
  }
  return out;
}

/** ambiguous 비율 — §6 Auto-STOP 3번(30% 초과 시 STOP)의 계측값. */
export function ambiguousRate(ambiguous: number, total: number): number {
  return total === 0 ? 0 : ambiguous / total;
}
