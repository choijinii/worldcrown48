/**
 * migrate-categories.lib.mjs — pure legacy→new category migration (TX-0 §4).
 *
 * No firebase-admin / no I/O so it unit-tests in the repo's node-env Vitest. The
 * runnable migrator (migrate-categories.mjs) imports these to plan + apply.
 *
 * ⛔ CATEGORY_MIGRATION is the 대표-confirmed ADR-TX0 table (2026-07-10) and is
 * FIXED — do not edit without a new 대표 decision:
 *   FOOTBALL→FOOTBALL · KPOP→KPOP · ANIME→ANIME_WEBTOON · GAMING→GAMING ·
 *   MOVIE→HOLLYWOOD · OTHER→OTHER
 */
import { SEED_CATEGORIES } from "./seed-categories.lib.mjs";

/** @type {Record<string, string>} legacy id → new id (§4 매핑표). */
export const CATEGORY_MIGRATION = {
  FOOTBALL: "FOOTBALL",
  KPOP: "KPOP",
  ANIME: "ANIME_WEBTOON",
  GAMING: "GAMING",
  MOVIE: "HOLLYWOOD",
  OTHER: "OTHER",
};

/** Ids that exist in the new taxonomy (a Tournament already on one is left alone). */
const NEW_IDS = new Set(SEED_CATEGORIES.map((c) => c.id));

/** Map a legacy category id to its new id, or null if it isn't a legacy id. */
export function mapLegacyCategory(oldId) {
  return Object.prototype.hasOwnProperty.call(CATEGORY_MIGRATION, oldId)
    ? CATEGORY_MIGRATION[oldId]
    : null;
}

/**
 * Plan the migration for a list of `{ id, category }` Tournaments (pure).
 * Returns:
 *   - changes[]   : { id, from, to } where the mapped new id DIFFERS (needs a write)
 *   - unchanged[] : ids that need no write (self-mapping legacy, or already a new id)
 *   - unknown[]   : { id, from } whose category is neither a legacy id nor a new id
 *                   — NEVER auto-written; the dry-run surfaces them for a human.
 */
export function planCategoryMigration(tournaments) {
  const changes = [];
  const unchanged = [];
  const unknown = [];

  for (const t of tournaments) {
    const from = t.category;
    const to = mapLegacyCategory(from);
    if (to === null) {
      // Not a legacy id. If it's already a valid new id, it's fine as-is;
      // otherwise it's genuinely unmappable and must be surfaced, not written.
      if (NEW_IDS.has(from)) unchanged.push(t.id);
      else unknown.push({ id: t.id, from });
      continue;
    }
    if (to === from) unchanged.push(t.id);
    else changes.push({ id: t.id, from, to });
  }

  return { changes, unchanged, unknown };
}
