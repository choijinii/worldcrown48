/**
 * 번역 중 언어 바꾸기 → 본문을 새로 그린다(둘째 겹). 번역기가 바꿔 끼운 글자 마디는 React 가 고쳐도 화면에 안 나와
 * 옛 언어 글자가 남는다(E2E: 피치 "참가하기" · "마감"). 번역 중일 때만 새로 그리고, 평소에는 그대로 둔다.
 */
import { describe, expect, it } from "vitest";
import { isPageTranslated, nextRemountEpoch } from "@/lib/dom/translateRemount";

describe("isPageTranslated — 크롬 번역은 <html> 에 translated-ltr / translated-rtl 을 단다", () => {
  it.each([
    ["translated-ltr", true],
    ["wc-root translated-rtl", true],
    ["", false],
    ["translated", false],
    ["not-translated-ltr", false],
  ])("%j → %s", (cls, want) => {
    expect(isPageTranslated(cls)).toBe(want);
  });
});

describe("nextRemountEpoch", () => {
  it("번역 중에 언어가 바뀌면 한 칸 올린다", () => {
    expect(nextRemountEpoch({ epoch: 0, prevLang: "ko", lang: "en", translated: true })).toBe(1);
  });
  it("번역이 아니면 그대로(평소 언어 바꾸기는 지금처럼 글자만 바꾼다)", () => {
    expect(nextRemountEpoch({ epoch: 3, prevLang: "ko", lang: "en", translated: false })).toBe(3);
  });
  it("언어가 그대로면 그대로(같은 언어로 다시 그려도 새로 만들지 않는다)", () => {
    expect(nextRemountEpoch({ epoch: 2, prevLang: "es", lang: "es", translated: true })).toBe(2);
  });
});
