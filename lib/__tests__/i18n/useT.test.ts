import { describe, expect, it } from "vitest";
import { resolveMessage } from "@/lib/i18n/messages";

describe("resolveMessage", () => {
  it("returns the value for the active lang", () => {
    expect(resolveMessage("en", "pitch.hero.l2")).toBe("Ultimate Crown?");
    expect(resolveMessage("ko", "pitch.hero.cta.start")).toBe("투표 시작");
  });

  it("falls back to en when es is absent (never blank, never the key)", () => {
    // pitch.hero.l2 intentionally has no es override → en value.
    const es = resolveMessage("es", "pitch.hero.l2");
    expect(es).toBe("Ultimate Crown?");
    expect(es).not.toBe("");
    expect(es).not.toContain("pitch.hero");
  });

  it("uses the es value when present", () => {
    expect(resolveMessage("es", "pitch.hero.cta.start")).toBe("Empezar a votar");
  });

  it("interpolates {vars} (plural key)", () => {
    expect(
      resolveMessage("en", "pitch.trending.count.other", { count: 3 }),
    ).toBe("3 Tournaments · Live");
  });

  it("singular key is grammatically correct at count 1", () => {
    expect(
      resolveMessage("en", "pitch.trending.count.one", { count: 1 }),
    ).toBe("1 Tournament · Live");
  });

  it("preserves non-translatable proper nouns in every lang", () => {
    // launch.featured.pill is a pill label rendered in the catalog as
    // "FEATURED TOURNAMENT" (all-caps, matching other kicker/pill entries
    // like "NOW LIVE" / "TOURNAMENT HOST"), so the proper-noun check is
    // case-insensitive here (brief's original case-sensitive assertion
    // did not match the brief's own catalog value — see task-2-report.md).
    for (const lang of ["ko", "en", "es"] as const) {
      expect(resolveMessage(lang, "launch.featured.pill")).toMatch(/tournament/i);
    }
  });
});
