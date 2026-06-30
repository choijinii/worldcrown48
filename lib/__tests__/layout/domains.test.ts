import { describe, it, expect } from "vitest";
import {
  SITE_DOMAINS,
  ACTIVE_DOMAINS,
  DISABLED_DOMAINS,
} from "@/lib/layout/domains";

/**
 * Phase F · SiteMapSheet data (handoff ⑤ + acceptance).
 * 7 domains; Locker Room (4) + Admin Dashboard (6) disabled ("Coming soon").
 */

describe("SITE_DOMAINS", () => {
  it("lists all 7 WorldCrown48 domains, numbered 0..6", () => {
    expect(SITE_DOMAINS).toHaveLength(7);
    expect(SITE_DOMAINS.map((d) => d.n)).toEqual([0, 1, 2, 3, 4, 5, 6]);
  });

  it("disables exactly Locker Room (4) and Admin Dashboard (6)", () => {
    expect(DISABLED_DOMAINS.map((d) => d.n)).toEqual([4, 6]);
  });

  it("links the built domains (0,1,2,3,5) with concrete routes", () => {
    expect(ACTIVE_DOMAINS.map((d) => d.n)).toEqual([0, 1, 2, 3, 5]);
    for (const d of ACTIVE_DOMAINS) expect(d.href).toMatch(/^\//);
  });

  it("points The Pitch at / and Launch Pad at /launch", () => {
    expect(SITE_DOMAINS.find((d) => d.n === 1)?.href).toBe("/");
    expect(SITE_DOMAINS.find((d) => d.n === 0)?.href).toBe("/launch");
  });
});
