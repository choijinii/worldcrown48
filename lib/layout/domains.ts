/**
 * Site map — the 7 WorldCrown48 domains (CLAUDE.md §7개 도메인).
 *
 * Single source for the ☰ SiteMapSheet (components/layout/SiteMapSheet) and any
 * future nav. `href` present → an active link; `href` null → "Coming soon"
 * (Domain 4 Locker Room = MVP2). Domain 6 Admin Dashboard went live with G-1.
 *
 * The Arena has no standalone index route, so Domain 3 points at the seeded
 * preview tournament (/arena/dev-preview) — the same target the Dev Nav uses.
 */

export interface SiteDomain {
  n: number;
  name: string;
  desc: string;
  href: string | null;
}

export const SITE_DOMAINS: readonly SiteDomain[] = [
  { n: 0, name: "Launch Pad", desc: "Pre-launch waitlist & teaser", href: "/launch" },
  { n: 1, name: "The Pitch", desc: "Trending tournament feed", href: "/" },
  { n: 2, name: "The Lab", desc: "Build & run a Tournament", href: "/admin/lab" },
  { n: 3, name: "The Arena", desc: "Vote Match by Match", href: "/arena/dev-preview" },
  { n: 4, name: "Locker Room", desc: "Your Crown Cards & profile", href: null },
  { n: 5, name: "Policy Hub", desc: "Privacy & terms", href: "/policies/privacy" },
  { n: 6, name: "Admin Dashboard", desc: "Operations console", href: "/admin" },
] as const;

export const ACTIVE_DOMAINS = SITE_DOMAINS.filter((d) => d.href !== null);
export const DISABLED_DOMAINS = SITE_DOMAINS.filter((d) => d.href === null);
