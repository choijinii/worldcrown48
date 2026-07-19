import { describe, it, expect } from "vitest";
import { resolveFeaturedView, formatClosesAt } from "@/lib/launch/featured";

/**
 * Hotfix-1 regression guard (A-1 PR): FeaturedTournament must read the CANONICAL
 * Tournament schema (tournamentDeadline / totalContestants) and never call
 * .toDate() on an absent deadline.
 *
 * The crash: the A-1 seed's featured tournament uses the canonical fields, but
 * FeaturedTournament read the legacy names (closesAt / contestantsCount) → the
 * deadline was undefined → undefined.toDate() threw a client-side exception on
 * /launch ~1s after the query resolved.
 */

const ts = (iso: string) => ({ toDate: () => new Date(iso) });

describe("resolveFeaturedView", () => {
  it("reads the canonical schema (tournamentDeadline / totalContestants)", () => {
    const v = resolveFeaturedView("a1-preview-1", {
      title: "Strikers of the Century",
      totalContestants: 48,
      tournamentDeadline: ts("2026-07-12T00:00:00Z"),
    });
    expect(v.id).toBe("a1-preview-1");
    expect(v.title).toBe("Strikers of the Century");
    expect(v.contestantsCount).toBe(48);
    expect(v.closesAt).not.toBeNull();
  });

  it("falls back to legacy field names (closesAt / contestantsCount)", () => {
    const v = resolveFeaturedView("legacy", {
      title: "Legacy",
      contestantsCount: 48,
      closesAt: ts("2026-06-20T00:00:00Z"),
    });
    expect(v.contestantsCount).toBe(48);
    expect(v.closesAt).not.toBeNull();
  });

  it("yields a null closesAt when no deadline is set (no crash)", () => {
    const v = resolveFeaturedView("nodate", { title: "No date", totalContestants: 48 });
    expect(v.closesAt).toBeNull();
    expect(v.contestantsCount).toBe(48);
  });

  it("carries titleI18n through for localized display (B-2.1)", () => {
    const v = resolveFeaturedView("i18n", {
      title: "테스트",
      titleI18n: { ko: "테스트", en: "Test", es: "Prueba" },
    });
    expect(v.titleI18n).toEqual({ ko: "테스트", en: "Test", es: "Prueba" });
  });

  it("leaves titleI18n undefined for a legacy doc without it", () => {
    const v = resolveFeaturedView("legacy", { title: "Legacy" });
    expect(v.titleI18n).toBeUndefined();
  });
});

describe("formatClosesAt", () => {
  it("formats a timestamp as short 'MMM D'", () => {
    expect(formatClosesAt(ts("2026-06-20T12:00:00Z"))).toBe("Jun 20");
  });

  it("returns '' for null/undefined (the regression guard)", () => {
    expect(formatClosesAt(null)).toBe("");
    expect(formatClosesAt(undefined)).toBe("");
  });
});
