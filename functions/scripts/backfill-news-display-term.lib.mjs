/**
 * backfill-news-display-term.lib.mjs — pure text rules for healing ALREADY-PUBLISHED
 * articles written before the 표시 용어 층 (PR #60, LANGUAGE.md v2.0 §1).
 *
 * The publish path is already fixed (newsPrompts 지침 6 deployed 2026-08-08), so new
 * articles never say "Voter". This heals the old ones — 대표 결정 2026-08-08.
 *
 * ⚠️ MECHANICAL REPLACEMENT ONLY. These rules swap the 지칭 and nothing else: no
 * rewriting, no style polish, no reflowing. Every rule below is a closed, enumerated
 * pattern — if a phrasing is not on the list it is left ALONE and reported, never
 * guessed at. That is why the driver refuses to write when it meets an unknown form.
 *
 * Why rules and not a hand-written string table: the rules are idempotent (running
 * twice is a no-op) and survive small differences between what the page renders and
 * what Firestore stores. The unit tests pin them against the REAL strings harvested
 * from the three live articles, so the rules are verified on production text.
 *
 * Language notes — the whole reason this is not one regex:
 *  · ko — the 조사 (particle) is chosen by the previous syllable's final consonant.
 *    "Voter"(보터) ends in a vowel and takes 가/는/를; "팬" ends in ㄴ and takes
 *    이/은/을. A naive swap yields "팬가" (ungrammatical), so particles are corrected.
 *  · en — "Voter" was capitalized as a term of art. As a display term it becomes an
 *    ordinary noun: lowercase in prose, Title Case only in title-cased fields.
 *  · es — the translator emitted BOTH the untranslated "Voter/Voters" and the
 *    translated "votante(s)". Both are 지칭 of the same role; both become "fan(s)".
 */

export const BACKFILL_LANGS = ["ko", "en", "es"];

/**
 * Fields rendered in Title Case on the 지면 (기준본 v3): the article title/subhead and
 * the hero block's three text slots. In these, the display term keeps a capital F.
 * Everywhere else (lead · paragraph · closer · stats label · matchups note) is prose.
 */
export const TITLE_CASE_SLOTS = new Set([
  "title",
  "subhead",
  "hero.kicker",
  "hero.title",
  "hero.subtitle",
]);

/** Korean 조사 correction: vowel-final "Voter" → consonant-final "팬". */
const KO_PARTICLE = { 가: "이", 는: "은", 를: "을", 와: "과", 로: "으로", 라: "이라" };

/**
 * Ordered ko rules. `Voter Count` first so the bare-Voter rule cannot shred it.
 * `Voter들` before bare `Voter` so the plural marker is not orphaned.
 */
function replaceKo(text) {
  let out = text.replace(/Voter\s+Count/g, "참여 팬 수");
  out = out.replace(/Voters?들/g, "팬들");
  // Bare Voter + optional 조사 — the particle is rewritten only when it is glued on.
  out = out.replace(/Voters?([가는를와로라])?/g, (_m, particle) =>
    particle ? `팬${KO_PARTICLE[particle]}` : "팬",
  );
  return out;
}

/** Capitalize the display term when it opens the string or a sentence. */
function fixSentenceCase(text) {
  return text.replace(/(^|[.!?…—]\s+|['"'"(]\s*)(fans?)\b/g, (_m, before, word) =>
    `${before}${word[0].toUpperCase()}${word.slice(1)}`,
  );
}

function replaceEn(text, titleCase) {
  const Fan = titleCase ? "Fan" : "fan";
  const Fans = titleCase ? "Fans" : "fans";
  let out = text.replace(/Voter\s+Count/g, "Fan Count");
  // Possessives first — "Voters'" must not be split by the plain plural rule.
  out = out.replace(/\bVoters'/g, `${Fans}'`);
  out = out.replace(/\bvoters'/g, "fans'");
  out = out.replace(/\bVoter's\b/g, `${Fan}'s`);
  out = out.replace(/\bvoter's\b/g, "fan's");
  out = out.replace(/\bVoters\b/g, Fans);
  out = out.replace(/\bvoters\b/g, "fans");
  out = out.replace(/\bVoter\b/g, Fan);
  out = out.replace(/\bvoter\b/g, "fan");
  return titleCase ? out : fixSentenceCase(out);
}

/**
 * Spanish takes no `titleCase` argument on purpose: Spanish headlines are sentence
 * case, not Title Case, so "Los Fans" would be a capitalization error where the
 * English "Fan Choices" is correct. Only sentence-initial position capitalizes.
 */
/**
 * Plural determiners that force number agreement. The translator treated "Voter" as
 * an invariant foreign proper noun and wrote "los Voter"; once it becomes an ordinary
 * Spanish noun it must agree, so "los Voter" → "los fans", not "los fan".
 */
const ES_PLURAL_DET =
  /\b(los|las|unos|unas|muchos|muchas|algunos|algunas|todos|todas|estos|estas|esos|esas|ambos|ambas|sus)(\s+)Voter\b/gi;

function replaceEs(text) {
  let out = text.replace(/Voter\s+Count/g, "Fan Count");
  // Number agreement BEFORE the bare singular rule can strand "los fan".
  out = out.replace(ES_PLURAL_DET, (_m, det, gap) => `${det}${gap}fans`);
  // Both the untranslated term and the translated "votantes" name the same role.
  out = out.replace(/\bVotantes\b/g, "fans");
  out = out.replace(/\bvotantes\b/g, "fans");
  out = out.replace(/\bVotante\b/g, "fan");
  out = out.replace(/\bvotante\b/g, "fan");
  out = out.replace(/\bVoters\b/g, "fans");
  out = out.replace(/\bvoters\b/g, "fans");
  out = out.replace(/\bVoter\b/g, "fan");
  out = out.replace(/\bvoter\b/g, "fan");
  return fixSentenceCase(out);
}

/**
 * Rewrite ONE text field. `slot` is the dotted field path ("subhead", "hero.title",
 * "paragraph.text") and decides Title Case; `lang` picks the rule set.
 */
export function replaceDisplayTerm(text, lang, slot = "") {
  if (typeof text !== "string" || text.length === 0) return text;
  const titleCase = TITLE_CASE_SLOTS.has(slot);
  if (lang === "ko") return replaceKo(text);
  if (lang === "en") return replaceEn(text, titleCase);
  if (lang === "es") return replaceEs(text);
  return text;
}

/**
 * Residue check — any 지칭 the rules did NOT convert. A non-empty result means the
 * article contains a form nobody enumerated, so the driver must abort rather than
 * write a half-converted document.
 */
export function findResidue(text, lang) {
  if (typeof text !== "string") return [];
  const patterns = lang === "es" ? [/Voters?/gi, /votantes?/gi] : [/Voters?/gi];
  const hits = [];
  for (const re of patterns) {
    for (const m of text.matchAll(re)) hits.push(m[0]);
  }
  return hits;
}

/** Translatable text slots of one block, as [dotted-slot, value, setter] triples. */
function blockSlots(block) {
  switch (block?.type) {
    case "hero":
      return [
        ["hero.kicker", block.kicker, (v) => (block.kicker = v)],
        ["hero.title", block.title, (v) => (block.title = v)],
        ["hero.subtitle", block.subtitle, (v) => (block.subtitle = v)],
      ];
    case "lead":
    case "paragraph":
    case "closer":
      return [[`${block.type}.text`, block.text, (v) => (block.text = v)]];
    case "stats":
      // `n` is a datum — never touched. Only the label is prose.
      return (block.items ?? []).map((it, i) => [
        `stats.items[${i}].l`,
        it.l,
        (v) => (it.l = v),
      ]);
    case "matchups":
      // pairs hold proper nouns — only the editorial note is prose.
      return [["matchups.note", block.note, (v) => (block.note = v)]];
    default:
      return [];
  }
}

/**
 * Plan one article. Returns `{ id, changes[], residue[], changed }` and, when
 * `mutate` is true, applies the rewrites onto the passed-in doc clone.
 *
 * `changes` is the audit trail the dry-run prints and the 대표 approves: one entry per
 * text slot that actually differs, carrying lang · slot · before · after.
 */
export function planArticleBackfill(doc, { mutate = false } = {}) {
  const changes = [];
  const residue = [];

  const consider = (lang, slot, value, setter) => {
    const next = replaceDisplayTerm(value, lang, slot);
    if (typeof value === "string" && next !== value) {
      changes.push({ lang, slot, before: value, after: next });
      if (mutate) setter(next);
    }
    const left = findResidue(mutate ? next : next, lang);
    if (left.length > 0) residue.push({ lang, slot, hits: left, text: next });
  };

  for (const lang of BACKFILL_LANGS) {
    for (const field of ["title", "subhead"]) {
      const holder = doc[field];
      if (holder && typeof holder === "object") {
        consider(lang, field, holder[lang], (v) => (holder[lang] = v));
      }
    }
    const blocks = doc.body?.[lang];
    if (!Array.isArray(blocks)) continue;
    for (const block of blocks) {
      for (const [slot, value, setter] of blockSlots(block)) {
        consider(lang, slot, value, setter);
      }
    }
  }

  return { id: doc.id, changes, residue, changed: changes.length > 0 };
}

/** Aggregate for the run summary. */
export function summarize(plans) {
  return {
    docs: plans.length,
    docsChanged: plans.filter((p) => p.changed).length,
    replacements: plans.reduce((n, p) => n + p.changes.length, 0),
    docsWithResidue: plans.filter((p) => p.residue.length > 0).length,
  };
}
