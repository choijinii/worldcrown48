/**
 * Site map — the 7 WorldCrown48 domains (CLAUDE.md §7개 도메인) + standalone
 * public routes that belong to no domain.
 *
 * Single source for the ☰ SiteMapSheet (components/layout/SiteMapSheet) and any
 * future nav. `href` present → an active link; `href` null → "Coming soon"
 * (Domain 4 Locker Room = MVP2). Domain 6 Admin Dashboard went live with G-1.
 *
 * The Arena has no standalone index route, so Domain 3 points at the seeded
 * preview tournament (/arena/dev-preview) — the same target the Dev Nav uses.
 *
 * The Newsroom (/news, ND-1) is NOT a domain — the 7-domain model is fixed, so
 * it carries `n: null` and its own eyebrow instead of a made-up "Domain 7".
 * It must stay publicly reachable: 인터넷신문 등록 심사에서 심사관이 뉴스
 * 페이지에 도달할 수 있어야 한다 — hence it sits next to The Pitch (public,
 * Voter-facing) rather than last, where the 360px drawer would scroll it away.
 */

export interface SiteDomain {
  /** Domain number 0..6, or null for an entry that is not one of the 7 domains. */
  n: number | null;
  name: string;
  desc: string;
  href: string | null;
  /** Overrides the "Domain {n}" eyebrow. Required when `n` is null. */
  eyebrow?: string;
}

export const SITE_DOMAINS: readonly SiteDomain[] = [
  { n: 0, name: "Launch Pad", desc: "Pre-launch waitlist & teaser", href: "/launch" },
  { n: 1, name: "The Pitch", desc: "Trending tournament feed", href: "/" },
  { n: null, name: "Newsroom", desc: "Published Tournament articles", href: "/news", eyebrow: "News" },
  { n: 2, name: "The Lab", desc: "Build & run a Tournament", href: "/admin/lab" },
  { n: 3, name: "The Arena", desc: "Vote Match by Match", href: "/arena/dev-preview" },
  { n: 4, name: "Locker Room", desc: "Your Crown Cards & profile", href: null },
  { n: 5, name: "Policy Hub", desc: "Privacy & terms", href: "/policies/privacy" },
  { n: 6, name: "Admin Dashboard", desc: "Operations console", href: "/admin" },
] as const;

/** Eyebrow text for a site map row — "Domain 3", or the entry's own label. */
export function siteMapEyebrow(d: SiteDomain): string {
  return d.eyebrow ?? `Domain ${d.n}`;
}

export const ACTIVE_DOMAINS = SITE_DOMAINS.filter((d) => d.href !== null);
export const DISABLED_DOMAINS = SITE_DOMAINS.filter((d) => d.href === null);
