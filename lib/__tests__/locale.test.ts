import { describe, expect, it } from "vitest";
import {
  LOCALE_META,
  SUPPORTED_LOCALES,
  buildLangHref,
  isLang,
} from "../locale";

describe("SUPPORTED_LOCALES", () => {
  it("contains ko and en (MVP1 — two options)", () => {
    expect(SUPPORTED_LOCALES).toContain("ko");
    expect(SUPPORTED_LOCALES).toContain("en");
    expect(SUPPORTED_LOCALES).toHaveLength(2);
  });
});

describe("LOCALE_META", () => {
  it("ko → 한국어 / KO abbrev", () => {
    expect(LOCALE_META.ko.label).toBe("한국어");
    expect(LOCALE_META.ko.abbrev).toBe("KO");
  });
  it("en → English / EN abbrev", () => {
    expect(LOCALE_META.en.label).toBe("English");
    expect(LOCALE_META.en.abbrev).toBe("EN");
  });
});

describe("buildLangHref", () => {
  it("adds ?lang= when absent", () => {
    expect(buildLangHref("https://x.com/policies", "en")).toBe(
      "https://x.com/policies?lang=en",
    );
  });

  it("replaces an existing lang query (no duplicate)", () => {
    expect(buildLangHref("https://x.com/policies?lang=ko", "en")).toBe(
      "https://x.com/policies?lang=en",
    );
  });

  it("preserves other query params and the hash", () => {
    expect(
      buildLangHref("https://x.com/arena/t1?foo=1&lang=ko#vs", "en"),
    ).toBe("https://x.com/arena/t1?foo=1&lang=en#vs");
  });

  it("accepts a relative href (path-only)", () => {
    expect(buildLangHref("/policies/privacy", "ko")).toBe(
      "/policies/privacy?lang=ko",
    );
  });
});

describe("isLang", () => {
  it("true for supported codes", () => {
    expect(isLang("ko")).toBe(true);
    expect(isLang("en")).toBe(true);
  });
  it("false for unsupported / empty (edge case: ?lang=xx falls back)", () => {
    expect(isLang("xx")).toBe(false);
    expect(isLang("")).toBe(false);
    expect(isLang(null)).toBe(false);
    expect(isLang(undefined)).toBe(false);
  });
});
