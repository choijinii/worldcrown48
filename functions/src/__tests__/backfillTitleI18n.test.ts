import { describe, it, expect } from "vitest";
import {
  titleLangsNeedingBackfill,
  planTitleBackfill,
  mergeTitleI18n,
} from "../../scripts/backfill-title-i18n.lib.mjs";

describe("titleLangsNeedingBackfill", () => {
  const title = "테스트 토너먼트";

  it("flags a slot that equals the flat title (silent Korean fallback) + missing", () => {
    // ko = source (=title), en = real translation, es = broken (=title) → [ko, es]
    const langs = titleLangsNeedingBackfill(title, {
      ko: "테스트 토너먼트",
      en: "Test Tournament",
      es: "테스트 토너먼트",
    });
    expect(langs).toEqual(["ko", "es"]);
  });

  it("returns only the source slot for a fully-translated doc", () => {
    const langs = titleLangsNeedingBackfill(title, {
      ko: "테스트 토너먼트",
      en: "Test Tournament",
      es: "Torneo de prueba",
    });
    expect(langs).toEqual(["ko"]); // just the source
  });

  it("treats a legacy doc without titleI18n as all langs missing", () => {
    expect(titleLangsNeedingBackfill(title, undefined)).toEqual(["ko", "en", "es"]);
    expect(titleLangsNeedingBackfill(title, { ko: "  " })).toEqual(["ko", "en", "es"]);
  });
});

describe("planTitleBackfill", () => {
  it("separates docs needing work (>1 candidate) from complete ones", () => {
    const plan = planTitleBackfill([
      { id: "broken", title: "테스트", titleI18n: { ko: "테스트", en: "Test", es: "테스트" } },
      { id: "done", title: "테스트", titleI18n: { ko: "테스트", en: "Test", es: "Prueba" } },
      { id: "legacy", title: "테스트", titleI18n: undefined },
    ]);
    expect(plan.needs.map((n) => n.id)).toEqual(["broken", "legacy"]);
    expect(plan.needs[0].langs).toEqual(["ko", "es"]);
    expect(plan.ok).toEqual(["done"]);
  });

  it("skips docs with no flat title to anchor a translation", () => {
    const plan = planTitleBackfill([{ id: "x", title: "", titleI18n: {} }]);
    expect(plan.skipped).toEqual([{ id: "x", reason: "no flat title to anchor" }]);
    expect(plan.needs).toHaveLength(0);
  });
});

describe("mergeTitleI18n", () => {
  const title = "테스트";

  it("overwrites translated slots, preserves untouched good ones", () => {
    const merged = mergeTitleI18n(
      title,
      { ko: "테스트", en: "Test", es: "테스트" }, // existing (es broken)
      { ko: "테스트", es: "Prueba" }, // freshly translated ko(source)+es
    );
    expect(merged).toEqual({ ko: "테스트", en: "Test", es: "Prueba" });
  });

  it("falls back an empty translation to the flat title (never writes '')", () => {
    const merged = mergeTitleI18n(title, {}, { en: "", es: "Prueba" });
    expect(merged.en).toBe("테스트"); // empty → source fallback
    expect(merged.es).toBe("Prueba");
    expect(merged.ko).toBe("테스트"); // absent → base empty → source fallback
  });
});
