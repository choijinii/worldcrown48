import { describe, it, expect } from "vitest";
import {
  SITE_DOMAINS,
  ACTIVE_DOMAINS,
  DISABLED_DOMAINS,
  siteMapEyebrow,
} from "@/lib/layout/domains";

/**
 * Phase F · SiteMapSheet data (handoff ⑤ + acceptance).
 * 7 domains; only Locker Room (4) stays disabled ("Coming soon") — Admin
 * Dashboard (6) went live with G-1 (href "/admin", handoff §4.7 / trap #2).
 * Plus the Newsroom (/news, ND-1) as a non-domain entry (n: null).
 */

describe("SITE_DOMAINS", () => {
  it("lists all 7 WorldCrown48 domains, numbered 0..6", () => {
    expect(SITE_DOMAINS.filter((d) => d.n !== null).map((d) => d.n)).toEqual([
      0, 1, 2, 3, 4, 5, 6,
    ]);
  });

  it("disables exactly Locker Room (4) after G-1 activated Admin Dashboard (6)", () => {
    expect(DISABLED_DOMAINS.map((d) => d.n)).toEqual([4]);
  });

  it("links the built domains (0,1,2,3,5,6) with concrete routes", () => {
    expect(ACTIVE_DOMAINS.map((d) => d.n)).toEqual([0, 1, null, 2, 3, 5, 6]);
    for (const d of ACTIVE_DOMAINS) expect(d.href).toMatch(/^\//);
  });

  it("points Admin Dashboard (6) at /admin", () => {
    expect(SITE_DOMAINS.find((d) => d.n === 6)?.href).toBe("/admin");
  });

  it("points The Pitch at / and Launch Pad at /launch", () => {
    expect(SITE_DOMAINS.find((d) => d.n === 1)?.href).toBe("/");
    expect(SITE_DOMAINS.find((d) => d.n === 0)?.href).toBe("/launch");
  });
});

/**
 * The Newsroom must stay reachable from the ☰ site map — 인터넷신문 등록 심사에서
 * 심사관이 뉴스 페이지에 도달할 수 있어야 한다. It is NOT one of the 7 domains.
 */
describe("Newsroom entry (/news)", () => {
  const news = SITE_DOMAINS.find((d) => d.href === "/news");

  it("is a live link in the site map", () => {
    expect(news).toBeDefined();
    expect(ACTIVE_DOMAINS).toContain(news);
    expect(DISABLED_DOMAINS).not.toContain(news);
  });

  it("carries no domain number — the 7-domain model is fixed", () => {
    expect(news?.n).toBeNull();
    expect(SITE_DOMAINS.filter((d) => d.n === null)).toHaveLength(1);
  });

  it("sits next to The Pitch so the 360px drawer never scrolls it out of view", () => {
    expect(SITE_DOMAINS.indexOf(news!)).toBe(
      SITE_DOMAINS.findIndex((d) => d.n === 1) + 1,
    );
  });

  it("renders its own eyebrow instead of 'Domain null'", () => {
    expect(siteMapEyebrow(news!)).toBe("News");
    expect(siteMapEyebrow(SITE_DOMAINS.find((d) => d.n === 6)!)).toBe("Domain 6");
  });
});
