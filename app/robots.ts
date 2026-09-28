/**
 * robots.txt — keep the operator console out of search indexes.
 *
 * The /admin subtree is operator-only (handoff §5 DON'T + §9 trap #1); Voters
 * and crawlers have no business there. Paired with the middleware
 * X-Robots-Tag header for defense-in-depth.
 *
 * SEO-1 (2026-09-28): `Sitemap:` 줄을 더해 검색 엔진이 app/sitemap.ts 를 찾게 한다.
 */
import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo/sitemapEntries";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: "/admin/",
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
