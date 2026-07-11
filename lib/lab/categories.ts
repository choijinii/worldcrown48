/**
 * Category runtime guard (Domain 2 · The Lab) — TX-0 data-driven rewrite.
 *
 * Categories are Firestore DATA now (a `categories` collection), so validity is
 * checked against the list of ids loaded from that collection — never a
 * hard-coded tuple. This Lab-facing wrapper just delegates to the shared
 * data-driven guard so the Lab publish path and the AI-Fill gate speak one
 * vocabulary. The caller supplies the loaded id list (preloaded client cache /
 * server query), so a typo or single-sport value still can't slip in (trap #4),
 * and an empty list (a 0-category fetch failure) rejects everything.
 */
import { isValidCategoryId } from "@/lib/taxonomy/category";

export function isValidCategory(
  value: unknown,
  validIds: readonly string[],
): value is string {
  return isValidCategoryId(value, validIds);
}
