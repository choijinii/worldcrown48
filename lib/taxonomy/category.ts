/**
 * Category Taxonomy — the shared shape + pure validators (TX-0).
 *
 * WC48 categories are Firestore DATA (a `categories` collection), not a code
 * enum: adding/hiding/re-ordering a category is a data edit, never a deploy
 * (CLAUDE.md 대개편 · LANGUAGE.md §13 "Category Taxonomy"). This module owns the
 * doc shape and the pure guards every consumer shares — the Lab publish path,
 * the client dropdown, the seed and the migration.
 *
 * Validity is checked against a SUPPLIED id list (data-driven), never a
 * hard-coded tuple — that is the whole point of TX-0. No Firebase here so this
 * unit-tests in the node-env Vitest.
 */

/** Launch state of a category (§3 item 1 · LANGUAGE.md §13). */
export type CategoryStatus = "hidden" | "scheduled" | "live";

export const CATEGORY_STATUSES: readonly CategoryStatus[] = [
  "hidden",
  "scheduled",
  "live",
];

/**
 * A `categories/{id}` document.
 *  - id     — UPPER_SNAKE category id (표시명은 name.{ko,en,es})
 *  - name   — locale labels; all of ko/en/es required (§10 i18n)
 *  - status — hidden | scheduled | live
 *  - phase  — 순차 런칭 단계 (0 = 미배정/hidden, 1·2·3 = 1·2·3차)
 *  - order  — 표시 정렬 순서 (오름차순)
 */
export interface CategoryDoc {
  id: string;
  name: { ko: string; en: string; es: string };
  status: CategoryStatus;
  phase: number;
  order: number;
}

const ID_RE = /^[A-Z][A-Z0-9_]*$/;

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.length > 0;
}

function isNonNegInt(v: unknown): v is number {
  return typeof v === "number" && Number.isInteger(v) && v >= 0;
}

/**
 * Validate a raw value into a CategoryDoc, THROWING on any bad field. Used at
 * every trust boundary that ingests category data (seed, migration, admin
 * write) so a malformed doc can never enter the taxonomy silently.
 */
export function validateCategoryDoc(raw: unknown): CategoryDoc {
  if (typeof raw !== "object" || raw === null) {
    throw new Error("category: expected an object.");
  }
  const c = raw as Record<string, unknown>;

  if (!isNonEmptyString(c.id) || !ID_RE.test(c.id)) {
    throw new Error(`category: id must be UPPER_SNAKE (got ${JSON.stringify(c.id)}).`);
  }

  const name = c.name as Record<string, unknown> | undefined;
  if (
    typeof name !== "object" ||
    name === null ||
    !isNonEmptyString(name.ko) ||
    !isNonEmptyString(name.en) ||
    !isNonEmptyString(name.es)
  ) {
    throw new Error(`category ${c.id}: name.{ko,en,es} are all required and non-empty.`);
  }

  if (!CATEGORY_STATUSES.includes(c.status as CategoryStatus)) {
    throw new Error(
      `category ${c.id}: status must be one of ${CATEGORY_STATUSES.join("|")} (got ${JSON.stringify(c.status)}).`,
    );
  }

  if (!isNonNegInt(c.phase)) {
    throw new Error(`category ${c.id}: phase must be a non-negative integer.`);
  }
  if (!isNonNegInt(c.order)) {
    throw new Error(`category ${c.id}: order must be a non-negative integer.`);
  }

  return {
    id: c.id,
    name: { ko: name.ko, en: name.en, es: name.es },
    status: c.status as CategoryStatus,
    phase: c.phase,
    order: c.order,
  };
}

/**
 * Data-driven membership guard: is `value` one of the currently-valid category
 * ids? The id list comes from the `categories` collection (server) or the
 * preloaded client cache — never a hard-coded tuple. An empty list (a 0-category
 * fetch failure) rejects everything, so a broken load can never wave an
 * arbitrary category through.
 */
export function isValidCategoryId(
  value: unknown,
  validIds: readonly string[],
): value is string {
  return typeof value === "string" && validIds.includes(value);
}

/** The categories whose status is in `statuses`, sorted ascending by `order`. */
export function selectCategories(
  cats: readonly CategoryDoc[],
  statuses: readonly CategoryStatus[],
): CategoryDoc[] {
  return cats
    .filter((c) => statuses.includes(c.status))
    .slice()
    .sort((a, b) => a.order - b.order);
}

/** Just the ids — the list `isValidCategoryId` / Lab publish validate against. */
export function categoryIds(cats: readonly CategoryDoc[]): string[] {
  return cats.map((c) => c.id);
}
