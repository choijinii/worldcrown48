/**
 * newsServer — server-side single-article fetch for generateMetadata (ND-1 §3 #9).
 *
 * NOT "use client": runs in the Next server runtime. Uses the isomorphic Firebase
 * client SDK (getDoc is a one-shot network read) to fetch a published article so
 * the article page can emit per-article <title>/<description> (심사용 사이트 기본기).
 * Fails soft — a read error returns null and the page renders its fallback meta.
 * Public read is limited to `status:'published'` by firestore.rules.
 */
import { doc, getDoc } from "firebase/firestore";
import { getDb } from "@/lib/firebase";
import { toArticleRecord, type ArticleRecord } from "./articleRecord";

export async function getPublishedArticleServer(
  slug: string,
): Promise<ArticleRecord | null> {
  try {
    const snap = await getDoc(doc(getDb(), "news", slug));
    if (!snap.exists()) return null;
    const record = toArticleRecord(snap.id, snap.data() as Record<string, unknown>);
    // Defense-in-depth: only a published article is a real page.
    return record.status === "published" ? record : null;
  } catch {
    return null;
  }
}
