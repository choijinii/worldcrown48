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
