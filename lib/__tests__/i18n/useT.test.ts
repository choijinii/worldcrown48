import { describe, expect, it } from "vitest";
import { resolveMessage } from "@/lib/i18n/messages";

describe("resolveMessage", () => {
  it("returns the value for the active lang", () => {
    expect(resolveMessage("en", "pitch.card.featured")).toBe("FEATURED");
    // D-23 (2026-09-23 대표): "투표 시작" → "참가하기". 낱말 규칙 D-03.
    expect(resolveMessage("ko", "pitch.card.cta")).toBe("참가하기");
  });

  it("falls back to en when es is absent (never blank, never the key)", () => {
    // pitch.card.featured intentionally has no es override → en value.
    const es = resolveMessage("es", "pitch.card.featured");
    expect(es).toBe("FEATURED");
    expect(es).not.toBe("");
    expect(es).not.toContain("pitch.card");
  });

  it("uses the es value when present", () => {
    expect(resolveMessage("es", "pitch.card.cta")).toBe("Elige ahora");
  });

  it("interpolates {vars}", () => {
    expect(resolveMessage("en", "arenaHome.page.n", { n: 3 })).toBe("Page 3");
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
