/**
 * displayTerms — the 표시 용어 층 as prompt text, in ONE place (LANGUAGE.md v2.0 §1).
 *
 * Two rules travel together everywhere a model writes reader-facing prose, and they
 * are stated together because separating them is what broke twice:
 *
 *  1. §10 번역 불가 고유명사 stay in their English original, in every language.
 *  2. The participant 지칭 — and ONLY the 지칭 — becomes the display term 팬 / fan(s).
 *
 * Why both, always (two measured regressions on 2026-08-08):
 *  · Rule 2 alone → the model generalizes "don't write Voter" into "avoid English
 *    terms" and transliterates: Tournament → "토너먼트", WorldCrown48 → "월드크라운".
 *    (Fixed in newsPrompts 지침 6 by putting rule 1 first.)
 *  · Rule 2 enforced only at WRITE time → the 지칭 is correct in the ko source and
 *    then drifts in TRANSLATION: ko "팬" came back as es "aficionados". A display
 *    term is not a property of the source language; it has to be pinned per target.
 *
 * The counter-examples in the glossary are load-bearing. Without naming aficionado ·
 * votante · voter explicitly, a translator does the natural thing — which is exactly
 * the wrong thing here — because "fan" reads as a loanword it is being paid to remove.
 */

/**
 * §10 번역 불가 목록. English original in ko/en/es alike — never translated, never
 * transliterated into Hangul.
 */
export const UNTRANSLATABLE_PROPER_NOUNS = [
  "WorldCrown48",
  "Tournament",
  "Contestant",
  "Match",
  "Champion",
  "Crown",
  "Crown Card",
  "Crown Score",
  "AI-Report",
] as const;

/**
 * Glossary block appended to every translation prompt. Marker phrases here are a
 * contract surface (translateArticleCore.test.ts) — changing them updates the tests.
 */
export const TRANSLATION_GLOSSARY = [
  "용어집 (반드시 지킨다):",
  "- 다음 고유명사는 모든 언어에서 영문 원형 그대로 둔다. 번역·한글 음차 금지:",
  `  ${UNTRANSLATABLE_PROPER_NOUNS.join(" · ")}`,
  '- 참여자를 부르는 지칭은 표시 용어로 통일한다: ko "팬" → en "fan(s)" · es "fan(s)".',
  '  es 에서 "aficionado(s)"·"votante(s)"로, en 에서 "voter(s)"로 옮기지 않는다.',
  '  "fan"은 외래어처럼 보여도 확정된 표시 용어다. 더 자연스러운 현지어로 바꾸지 말 것.',
  '- 원문에 "Voter"가 남아 있어도 번역문에는 쓰지 않는다 — 지칭은 항상 fan(s).',
].join("\n");

/**
 * 순위를 정하는 세 비율의 정본 이름(대표 2026-11-28 · 원장 D-108 — D-106 "점유율" 바뀜 · 영어 · 스페인어 = 결정 L).
 * 차트 설명창 `lib/i18n/messages.ts` "chart.score.help" 의 낱말과 같아야 한다 — functions 는 lib 를 import 하지
 * 않으므로 newsNumberLock.test.ts 가 그 파일을 글자로 읽어 대조한다.
 */
export const CHART_RATE_TERMS = {
  /** 순위점수율 = placementRate */
  place: { ko: "순위점수율", en: "Placement score rate", es: "Tasa de puntuación por posición" },
  /** 우승율 = winRate */
  win: { ko: "우승율", en: "Champion rate", es: "Tasa de campeón" },
  /** 선택율 = shareRate · Match마다 선택받은 비율 */
  pick: { ko: "선택율", en: "Pick rate", es: "Tasa de elección" },
} as const;

/**
 * 세 비율을 가리키는 영어 · 스페인어 비정본 이름(결정 L · 2026-11-28) — 옛 설명창 낱말(Reach · Wins · Picks /
 * Alcance · Victorias · Elecciones) · 11/27 안(Share · Cuota) · 승 · 패 개념(win rate). 생성 뒤 검사(rate_name)가 쓴다.
 * 보통 낱말이기도 해서(fans' picks · las elecciones de los fans) 비율 자리 — 퍼센트 옆 · 숫자 칸 라벨 — 에서만 잡는다.
 */
export const NON_CANONICAL_RATE_NAMES_EN = ["Reach", "Wins", "Picks", "Share"] as const;
export const NON_CANONICAL_RATE_NAMES_ES = ["Alcance", "Victorias", "Elecciones", "Cuota"] as const;

/** 세 비율을 가리키는 정본이 아닌 이름(D-108) — 사실표 24번 · 생성 뒤 검사(rate_name)가 함께 쓴다. */
export const NON_CANONICAL_RATE_NAMES_KO = ["선택 비율", "점유율", "승률", "득표율", "1등 비율"] as const;
