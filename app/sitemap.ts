/**
 * sitemap.xml — 검색 엔진에 공개 페이지 목록을 알려 준다 (SEO-1, 2026-09-28).
 *
 * 무엇을 넣고 빼는지는 `lib/seo/sitemapEntries.ts` 한 곳에서 정한다(단위 테스트 있음).
 * 이 파일은 데이터를 읽어 넘기는 얇은 접착층이다.
 *
 * 요청 때마다 만든다(force-dynamic) — newsServer 와 같은 방식. 빌드 도중 Firestore 에
 * 접속하지 않게 해서 배포 빌드가 데이터베이스 상태에 묶이지 않도록 한다. 읽기는 공개
 * 대회 몇 개 + 발행 기사 몇 개뿐이고, 검색 로봇은 사이트맵을 드물게 가져간다.
 */
import type { MetadataRoute } from "next";
import { buildSitemapEntries } from "@/lib/seo/sitemapEntries";
import { loadSitemapArticles, loadSitemapTournaments } from "@/lib/seo/sitemapData";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [tournaments, articles] = await Promise.all([
    loadSitemapTournaments(),
    loadSitemapArticles(),
  ]);
  return buildSitemapEntries({ tournaments, articles });
}
