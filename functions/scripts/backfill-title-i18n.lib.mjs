/**
 * backfill-title-i18n.lib.mjs — pure planner for the titleI18n backfill (B-2.1).
 *
 * No firebase-admin / no I/O, so it unit-tests in the repo's node-env Vitest. The
 * runnable backfiller (backfill-title-i18n.mjs) imports these to plan + apply.
 *
 * The bug it repairs: at publish, a per-language translation could silently fall
 * back to the source original (e.g. `titleI18n.es` = the Korean `title`), so an
 * ES Voter saw Korean. Already-published docs are not retroactively fixed by the
 * core fix — this backfill re-translates the affected slots.
 *
 * We never stored `sourceLang`, so the anchor is the flat `title` (always the
 * ORIGINAL text). A language slot is a backfill CANDIDATE when it is
 * missing/empty OR equals the flat `title`. The true source-language slot also
 * equals `title`, so a fully-translated doc has EXACTLY ONE candidate (the
 * source) — a doc needs work only when MORE than one slot is missing/===title.
 * Re-translating the source into its own language is a harmless near-identity.
 */
export const BACKFILL_LANGS = ["ko", "en", "es"];

function norm(v) {
  return typeof v === "string" ? v.trim() : "";
}

/** Langs whose title slot is missing/empty OR equals the flat original title. */
export function titleLangsNeedingBackfill(title, titleI18n) {
  const flat = norm(title);
  const i18n = titleI18n && typeof titleI18n === "object" ? titleI18n : {};
  return BACKFILL_LANGS.filter((l) => {
    const v = norm(i18n[l]);
    return v === "" || v === flat;
  });
}

/**
 * Plan the backfill for a list of `{ id, title, titleI18n }` (pure).
 *   - needs[] : { id, title, langs } — langs to (re)translate (incl. the source,
 *               which re-renders to itself)
 *   - ok[]    : ids already complete (≤1 candidate = only the source slot)
 *   - skipped[]: { id, reason } — no flat title to anchor a translation
 */
export function planTitleBackfill(tournaments) {
  const needs = [];
  const ok = [];
  const skipped = [];

  for (const t of tournaments) {
    const flat = norm(t.title);
    if (!flat) {
      skipped.push({ id: t.id, reason: "no flat title to anchor" });
      continue;
    }
    const langs = titleLangsNeedingBackfill(t.title, t.titleI18n);
    if (langs.length > 1) needs.push({ id: t.id, title: flat, langs });
    else ok.push(t.id);
  }

  return { needs, ok, skipped };
}

/**
 * Merge freshly-translated slots into the existing titleI18n (pure). Existing
 * good translations (not in `translated`) are preserved; a translation that came
 * back empty falls back to the original title (never writes "").
 */
export function mergeTitleI18n(title, existing, translated) {
  const flat = norm(title);
  const base = existing && typeof existing === "object" ? existing : {};
  const out = { ko: "", en: "", es: "" };
  for (const l of BACKFILL_LANGS) {
    if (Object.prototype.hasOwnProperty.call(translated, l)) {
      out[l] = norm(translated[l]) || flat;
    } else {
      out[l] = norm(base[l]) || flat;
    }
  }
  return out;
}
