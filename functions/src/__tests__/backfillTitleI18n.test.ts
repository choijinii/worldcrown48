import { describe, it, expect } from "vitest";
import {
  hasHangul,
  titleLangsNeedingBackfill,
  planTitleBackfill,
  mergeTitleI18n,
} from "../../scripts/backfill-title-i18n.lib.mjs";

describe("hasHangul", () => {
  it("detects Korean syllables/jamo, ignores Latin", () => {
    expect(hasHangul("테스트")).toBe(true);
    expect(hasHangul("Test Tournament")).toBe(false);
    expect(hasHangul("Torneo de prueba")).toBe(false);
    expect(hasHangul("")).toBe(false);
  });
});

describe("titleLangsNeedingBackfill (v2 — source-aware Hangul detection)", () => {
  const title = "테스트 토너먼트"; // Korean source

  it("flags an en/es slot that EQUALS the flat title (silent fallback)", () => {
    const langs = titleLangsNeedingBackfill(title, {
      ko: "테스트 토너먼트",
      en: "Test Tournament",
      es: "테스트 토너먼트", // == flat
    });
    expect(langs).toEqual(["es"]); // ko is source (skipped), en is clean
  });

  it("flags an es slot that holds Korean DIFFERING from flat (the shipped bug)", () => {
    // v1 missed this: es != flat and != empty, but is still Korean → must backfill.
    const langs = titleLangsNeedingBackfill(title, {
      ko: "테스트 토너먼트",
      en: "Test Tournament",
      es: "테스트 대회-3", // Korean, but not byte-equal to the flat title
    });
    expect(langs).toEqual(["es"]);
  });

  it("returns [] for a fully-translated doc (source slot never counted)", () => {
    const langs = titleLangsNeedingBackfill(title, {
      ko: "테스트 토너먼트",
      en: "Test Tournament",
      es: "Torneo de prueba",
    });
    expect(langs).toEqual([]);
  });

  it("treats a legacy doc without titleI18n as en+es missing (ko is source)", () => {
    expect(titleLangsNeedingBackfill(title, undefined)).toEqual(["en", "es"]);
    expect(titleLangsNeedingBackfill(title, { ko: "테스트 토너먼트" })).toEqual([
      "en",
      "es",
    ]);
  });

  it("does not flag a legit Spanish translation that keeps a Hangul proper noun-free title", () => {
    expect(
      titleLangsNeedingBackfill(title, {
        ko: "테스트 토너먼트",
        en: "Test",
        es: "Torneo",
      }),
    ).toEqual([]);
  });
});

describe("planTitleBackfill", () => {
  it("separates docs with a real translation gap from complete ones", () => {
    const plan = planTitleBackfill([
      // es holds Korean ≠ flat → the regression the dry-run wrongly passed
      { id: "broken-b", title: "테스트", titleI18n: { ko: "테스트", en: "Test", es: "테스트-3 대회" } },
      { id: "done", title: "테스트", titleI18n: { ko: "테스트", en: "Test", es: "Prueba" } },
      { id: "legacy", title: "테스트", titleI18n: undefined },
    ]);
    expect(plan.needs.map((n) => n.id).sort()).toEqual(["broken-b", "legacy"]);
    expect(plan.needs.find((n) => n.id === "broken-b").langs).toEqual(["es"]);
    expect(plan.needs.find((n) => n.id === "legacy").langs).toEqual(["en", "es"]);
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
      { ko: "테스트", en: "Test", es: "테스트 대회" }, // existing (es broken Korean)
      { es: "Prueba" }, // only es re-translated
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
