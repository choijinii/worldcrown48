/**
 * Category runtime helpers (Domain 2 · The Lab).
 *
 * The `Category` union and `CATEGORIES` tuple live in lib/types/tournament so
 * both client and Cloud Function share one source of truth. This module adds
 * the runtime guard used at trust boundaries (Cloud Function input, Firestore
 * write) so a single-sport or typo value can never slip in (trap #4).
 */
import { CATEGORIES, type Category } from "@/lib/types/tournament";

export function isValidCategory(value: unknown): value is Category {
  return (
    typeof value === "string" &&
    (CATEGORIES as readonly string[]).includes(value)
  );
}
