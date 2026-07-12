import { describe, it, expect } from "vitest";
import { fallbackMeta } from "@/lib/lab/translateMeta";

describe("fallbackMeta (translation failure → 원문 fallback, 발행은 성공)", () => {
  it("puts the source text in every language slot", () => {
    const r = fallbackMeta({
      title: "Best Idols",
      description: "글로벌 4세대",
      sourceLang: "ko",
    });
    expect(r.titleI18n).toEqual({
      ko: "Best Idols",
      en: "Best Idols",
      es: "Best Idols",
    });
    expect(r.descriptionI18n).toEqual({
      ko: "글로벌 4세대",
      en: "글로벌 4세대",
      es: "글로벌 4세대",
    });
  });

  it("keeps empty description as empty strings (설명 선택)", () => {
    const r = fallbackMeta({ title: "T", description: "", sourceLang: "en" });
    expect(r.descriptionI18n).toEqual({ ko: "", en: "", es: "" });
  });
});
