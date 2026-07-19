import { describe, it, expect } from "vitest";
import { localizedTitle } from "@/lib/tournamentTitle";

describe("localizedTitle (titleI18n[lang] || title)", () => {
  const full = {
    title: "테스트 토너먼트",
    titleI18n: { ko: "테스트 토너먼트", en: "Test Tournament", es: "Torneo de prueba" },
  };

  it("returns the translation for the active language", () => {
    expect(localizedTitle(full, "es")).toBe("Torneo de prueba");
    expect(localizedTitle(full, "en")).toBe("Test Tournament");
    expect(localizedTitle(full, "ko")).toBe("테스트 토너먼트");
  });

  it("falls back to the flat title for a legacy doc without titleI18n", () => {
    expect(localizedTitle({ title: "Legacy" }, "es")).toBe("Legacy");
    expect(localizedTitle({ title: "Legacy", titleI18n: null }, "en")).toBe("Legacy");
  });

  it("falls back to the flat title when the slot is empty/whitespace", () => {
    const partial = { title: "원문", titleI18n: { ko: "원문", en: "", es: "   " } };
    expect(localizedTitle(partial, "en")).toBe("원문");
    expect(localizedTitle(partial, "es")).toBe("원문");
    expect(localizedTitle(partial, "ko")).toBe("원문");
  });

  it("falls back when the slot is missing from a partial titleI18n", () => {
    const partial = { title: "원문", titleI18n: { ko: "원문" } };
    expect(localizedTitle(partial, "es")).toBe("원문");
  });
});
