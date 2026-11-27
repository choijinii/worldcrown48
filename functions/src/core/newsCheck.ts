/**
 * newsCheck — 5층 생성 뒤 검사 (NEWS-1 · 결정 G · 대표 승인 목록 2026-11-27). 순수 모듈.
 *
 * 초안이 저장되기 직전에 ko · en · es 의 제목 · 부제 · 본문을 본다. 걸린 것은 초안 문서의 checkWarnings[] 에
 * 적는다 — **발행을 막지 않는다, 경고만.** 경고 표시(카드 위 글자)는 A줄 newsdesk 탭이 만든다.
 *
 *   검사 1 forbidden_word — 사실표 30 · 31번 낱말과 그 영어 · 스페인어 낱말
 *   검사 2 wrong_number   — 라운드와 Match 수가 맞지 않는 짝("48개 팀이 16경기") · 16강 · ROUND OF 16 · 48명
 *   검사 3 percent        — 비율 낱말(1등 비율 · 점유율 3언어 — newsDraftAssembly 의 isRateLabel)이 없는 문장의 퍼센트
 *
 * 잘못 걸리지 않게: 한국어 "표"는 낱말로 따로 쓰였을 때만("대표 · 발표 · 표시" ×) · "Official / Oficial" 은
 * 대문자로 시작할 때만 · "이상형 월드컵" 은 통과 · "경기도" 는 통과.
 */
import type { ArticleBlock, Lang, LocalizedBlocks, LocalizedText } from "../_news/articleDoc";
import { isRateLabel } from "./newsDraftAssembly";
import { EXTRA_WAR_WORDS, FORBIDDEN_WAR_WORDS } from "./tioKnowledge";

export type CheckRule = "forbidden_word" | "wrong_number" | "percent";

/** 초안 문서 checkWarnings[] 한 칸 — A줄 newsdesk 탭이 이 모양을 읽는다. */
export interface CheckWarning {
  rule: CheckRule;
  lang: Lang;
  /** "title" · "subhead" · "body.N"(N = 본문 블록 순서, 0부터) */
  field: string;
  /** 걸린 말 그대로 */
  match: string;
}

const L = "\\p{L}";
/** 글자(낱말 속)가 아닌 곳에서만 — \b 는 ó · ñ · 한글을 모른다. */
const word = (src: string, flags = "iu") => new RegExp(`(?<![${L}])(?:${src})(?![${L}])`, flags);

const KO: RegExp[] = [
  // "표" — 앞이 한글이 아니고, 뒤가 조사 · 한글 아님일 때만(1표 · 표를 · 표가 ○ / 대표 · 발표 · 표시 ×)
  /(?<![가-힣])표(?=[를가는의로와도]|[^가-힣]|$)/u,
  /투표/u,
  /득표율|득표/u,
  /참가자/u,
  /후보자/u,
  /48명/u,
  /경기(?!도)/u,
  /배틀/u,
  /FIFA/u,
  /(?<![A-Za-z])Official(?![A-Za-z])/u,
  /(?<!이상형\s?)월드컵/u,
  /예측/u,
  /배당/u,
  ...[...FORBIDDEN_WAR_WORDS, ...EXTRA_WAR_WORDS].map((w) => new RegExp(w, "u")),
];

const EN: RegExp[] = [
  word("vot(?:e|es|ed|ing|er|ers)"),
  word("candidates?"),
  word("participants?"),
  word("battles?"),
  word("wars?"),
  word("clash(?:es)?"),
  word("thrones?"),
  word("survival"),
  word("FIFA"),
  word("Official", "u"),
  word("World Cup"),
  word("predictions?"),
  word("betting|bets?"),
  word("odds"),
];

const ES: RegExp[] = [
  word("votos?|votar|votación|votaciones|votantes?"),
  word("candidat[oa]s?"),
  word("participantes?"),
  word("batallas?"),
  word("guerras?"),
  word("tronos?"),
  word("supervivencia"),
  word("FIFA"),
  word("Oficial", "u"),
  word("Mundial", "u"),
  word("predicci(?:ón|ones)|pronósticos?"),
  word("apuestas?"),
];

const BY_LANG: Record<Lang, RegExp[]> = { ko: KO, en: EN, es: ES };

/** 여러 규칙이 같은 자리를 잡으면(득표율 ⊃ 득표) 가장 긴 것만. */
function collect(text: string, patterns: RegExp[]): string[] {
  const hits: { at: number; end: number; s: string }[] = [];
  for (const p of patterns) {
    const g = new RegExp(p.source, p.flags.includes("g") ? p.flags : p.flags + "g");
    for (const m of text.matchAll(g)) {
      const at = m.index ?? 0;
      hits.push({ at, end: at + m[0].length, s: m[0] });
    }
  }
  const kept = hits.filter((h) => !hits.some((o) => o !== h && o.at <= h.at && o.end >= h.end && o.end - o.at > h.end - h.at));
  return [...new Set(kept.sort((a, b) => a.at - b.at).map((h) => h.s))];
}

/** 검사 1 — 그 언어의 금지 낱말. */
export function findForbidden(lang: Lang, text: string): string[] {
  return collect(text, BY_LANG[lang]);
}

const WRONG_ROUND_NAMES = [
  /(?<!\d)(?:16|8|4)강/u,
  word("ROUND OF 16"),
  word("QUARTER-?FINALS?"),
  word("SEMI-?FINAL(?:S|ES)?"),
  word("cuartos de final|octavos de final"),
  /48명/u,
];

/** 라운드 엔트리 수 → 그 라운드의 Match 수(사실표 9번). */
const MATCHES_OF: Record<string, number> = { "48": 24, "24": 12, "12": 6, "6": 3 };
const PAIR =
  /(?<!\d)(48|24|12|6)(?!\d)[^.!?。\n]{0,25}?(?:Match(?:es)?\s*(\d+)|(\d+)\s*(?:개의?\s*)?(?:Match(?:es)?|경기|matches|partidos|duelos))/giu;

/** 검사 2 — 사실과 다른 숫자 · 라운드 이름. */
export function findWrongNumbers(text: string): string[] {
  const out = collect(text, WRONG_ROUND_NAMES);
  for (const m of text.matchAll(PAIR)) {
    const r = m[1];
    const n = Number(m[2] ?? m[3]);
    if (n !== MATCHES_OF[r]) out.push(m[0]);
  }
  return out;
}

/** 검사 3 — 비율 낱말이 없는 문장의 퍼센트. */
export function findStrayPercents(text: string): string[] {
  const out: string[] = [];
  for (const sentence of text.split(/(?<=[.!?。])\s+/u)) {
    if (isRateLabel(sentence)) continue;
    for (const m of sentence.matchAll(/\d+(?:[.,]\d+)?\s*%/gu)) out.push(m[0]);
  }
  return out;
}

/** 블록에서 읽을 글(고유명사 칸 matchups group · title 과 숫자 칸 stats.n 은 데이터라 빼고, 퍼센트는 문장만). */
function blockTexts(b: ArticleBlock): { prose: string[]; labels: string[] } {
  switch (b.type) {
    case "hero":
      return { prose: [b.kicker, b.title, b.subtitle], labels: [] };
    case "lead":
    case "paragraph":
    case "closer":
      return { prose: [b.text], labels: [] };
    case "stats":
      return { prose: [], labels: b.items.map((i) => i.l) };
    case "matchups":
      return { prose: [b.note], labels: [] };
    default:
      return { prose: [], labels: [] };
  }
}

const LANGS: Lang[] = ["ko", "en", "es"];

export function checkDraftText(d: { title: LocalizedText; subhead: LocalizedText; body: LocalizedBlocks }): CheckWarning[] {
  const out: CheckWarning[] = [];
  const seen = new Set<string>();
  const push = (w: CheckWarning) => {
    const k = `${w.rule}|${w.lang}|${w.field}|${w.match}`;
    if (!seen.has(k)) {
      seen.add(k);
      out.push(w);
    }
  };
  const scan = (lang: Lang, field: string, prose: string[], labels: string[] = []) => {
    for (const t of [...prose, ...labels]) {
      for (const match of findForbidden(lang, t ?? "")) push({ rule: "forbidden_word", lang, field, match });
      for (const match of findWrongNumbers(t ?? "")) push({ rule: "wrong_number", lang, field, match });
    }
    for (const t of prose) for (const match of findStrayPercents(t ?? "")) push({ rule: "percent", lang, field, match });
  };
  for (const lang of LANGS) {
    scan(lang, "title", [d.title?.[lang] ?? ""]);
    scan(lang, "subhead", [d.subhead?.[lang] ?? ""]);
    (d.body?.[lang] ?? []).forEach((b, i) => {
      const { prose, labels } = blockTexts(b);
      scan(lang, `body.${i}`, prose, labels);
    });
  }
  return out;
}
