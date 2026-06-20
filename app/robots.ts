/**
 * robots.txt — keep the operator console out of search indexes.
 *
 * The /admin subtree is operator-only (handoff §5 DON'T + §9 trap #1); Voters
 * and crawlers have no business there. Paired with the middleware
 * X-Robots-Tag header for defense-in-depth.
 */
import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: "/admin/",
    },
  };
}
