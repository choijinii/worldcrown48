/**
 * sitemapData — 사이트맵용 공개 데이터를 서버에서 읽는다 (SEO-1).
 *
 * NOT "use client": Next 서버 런타임에서 돈다. `newsServer.ts` 와 같은 방식으로
 * Firebase **클라이언트 SDK**(비로그인)로 읽으므로, firestore.rules 가 공개로 허락한
 * 것만 읽힌다 — 대회는 `status == 'active'`, 기사는 `status == 'published'`.
 * 규칙이 곧 두 번째 안전망이다 (필터는 `sitemapEntries.ts` 가 한 번 더 건다).
 *
 * 실패해도 사이트맵은 죽지 않는다: 읽기 오류·시간 초과면 빈 목록을 돌려주고,
 * 사이트맵은 고정 공개 페이지만 담아 200 으로 나간다.
 */
import { collection, getDocs, query, where } from "firebase/firestore";
import { getDb } from "@/lib/firebase";
import { toMs } from "@/lib/news/articleRecord";
import type { SitemapArticle, SitemapTournament } from "./sitemapEntries";

/** Firestore 가 응답하지 않을 때 사이트맵을 붙잡고 있지 않도록 하는 한도. */
const READ_TIMEOUT_MS = 5000;

function withTimeout<T>(p: Promise<T>, fallback: T): Promise<T> {
  return Promise.race([
    p.catch(() => fallback),
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), READ_TIMEOUT_MS)),
  ]);
}

export async function loadSitemapTournaments(): Promise<SitemapTournament[]> {
  return withTimeout(
    (async () => {
      const snap = await getDocs(
        query(collection(getDb(), "tournaments"), where("status", "==", "active")),
      );
      return snap.docs.map((d) => {
        const data = d.data() as Record<string, unknown>;
        return {
          id: d.id,
          status: data.status,
          hostUid: data.hostUid,
          updatedAtMs: toMs(data.updatedAt) ?? toMs(data.createdAt),
        };
      });
    })(),
    [],
  );
}

export async function loadSitemapArticles(): Promise<SitemapArticle[]> {
  return withTimeout(
    (async () => {
      const snap = await getDocs(
        query(collection(getDb(), "news"), where("status", "==", "published")),
      );
      return snap.docs.map((d) => {
        const data = d.data() as Record<string, unknown>;
        return {
          slug: String(data.slug ?? d.id),
          status: data.status,
          publishedAtMs: toMs(data.publishedAt),
        };
      });
    })(),
    [],
  );
}
