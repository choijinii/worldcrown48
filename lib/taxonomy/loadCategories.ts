/**
 * loadCategories — client-side one-shot fetch of the `categories` collection
 * with a module cache (TX-0 · §4 "페이지 로드 시 1회 fetch + 모듈 캐시").
 *
 * Categories change rarely (an operator edit, not a live feed), so a realtime
 * subscription is overkill: we fetch once, validate each doc, and cache the
 * result for the page's lifetime. Malformed docs are skipped (not fatal) so one
 * bad row never blanks the whole Lab dropdown. A 0-category result is returned
 * as-is; callers treat an empty list as "no valid category" (the AI-Fill gate
 * and publish both reject against an empty id list — data-driven, no tuple).
 *
 * Reads all docs with NO where/orderBy, so no composite index is required
 * (filtering/sorting is done in memory via selectCategories) — see
 * [[feedback-firestore-composite-index]].
 */
import { collection, getDocs } from "firebase/firestore";
import { getDb } from "@/lib/firebase";
import { validateCategoryDoc, type CategoryDoc } from "./category";

let cache: CategoryDoc[] | null = null;
let inflight: Promise<CategoryDoc[]> | null = null;

export async function loadCategories(): Promise<CategoryDoc[]> {
  if (cache) return cache;
  if (inflight) return inflight;
  inflight = (async () => {
    const snap = await getDocs(collection(getDb(), "categories"));
    const cats: CategoryDoc[] = [];
    for (const d of snap.docs) {
      try {
        // Doc id is the canonical category id — it wins over any stored `id`.
        cats.push(validateCategoryDoc({ ...d.data(), id: d.id }));
      } catch (err) {
        if (process.env.NODE_ENV !== "production") {
          console.warn(`[taxonomy] skipping malformed category ${d.id}:`, err);
        }
      }
    }
    cache = cats;
    inflight = null;
    return cats;
  })();
  return inflight;
}

/** Clears the module cache — for hot-reload and tests only. */
export function resetCategoryCache(): void {
  cache = null;
  inflight = null;
}
