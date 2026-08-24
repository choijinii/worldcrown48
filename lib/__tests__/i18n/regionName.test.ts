/**
 * LAB-UX-1 PR-2 — 국가 값을 보는 사람 언어로 그리는 층.
 *
 * 2026-08-23 대표 스크린샷의 실제 갭: `lang=es`에서도 국적이 "대한민국"이었다.
 * UI 문구는 멀쩡했고 **데이터가 자유 텍스트**라 번역될 여지가 없었다. 여기서
 * 잠그는 계약은 둘이다: 코드는 편다, **레거시는 건드리지 않는다.**
 */
import { describe, expect, it } from "vitest";
import { displayRegion, isRegionCode } from "@/lib/i18n/regionName";

describe("isRegionCode", () => {
  it("두 글자 라틴만 코드로 본다", () => {
    expect(isRegionCode("KR")).toBe(true);
    expect(isRegionCode("kr")).toBe(true);
    expect(isRegionCode(" JP ")).toBe(true);
  });

  it("나라 이름은 코드가 아니다", () => {
    expect(isRegionCode("대한민국")).toBe(false);
    expect(isRegionCode("Korea")).toBe(false);
    expect(isRegionCode("")).toBe(false);
  });
});

describe("displayRegion — 코드를 언어별 국가명으로", () => {
  it("같은 코드가 언어마다 다르게 나온다", () => {
    const ko = displayRegion("KR", "ko");
    const en = displayRegion("KR", "en");
    const es = displayRegion("KR", "es");
    expect(ko).toBe("대한민국");
    expect(en).toMatch(/Korea/);
    expect(es).toMatch(/Corea/);
    expect(new Set([ko, en, es]).size).toBe(3);
  });

  it("소문자·공백도 받아준다", () => {
    expect(displayRegion(" jp ", "ko")).toBe(displayRegion("JP", "ko"));
  });

  it("여러 나라를 편다", () => {
    expect(displayRegion("TH", "ko")).toBe("태국");
    expect(displayRegion("NZ", "ko")).toBe("뉴질랜드");
  });
});

describe("displayRegion — 레거시 자유 텍스트는 원문 그대로", () => {
  it("이미 발행된 528건의 '대한민국'을 코드로 추측해 바꾸지 않는다", () => {
    expect(displayRegion("대한민국", "en")).toBe("대한민국");
    expect(displayRegion("뉴질랜드", "es")).toBe("뉴질랜드");
  });

  it("빈 값은 빈 값", () => {
    expect(displayRegion("", "ko")).toBe("");
    expect(displayRegion("   ", "ko")).toBe("");
  });

  it("모르는 코드는 코드를 그대로 보여준다 — 빈칸으로 지우지 않는다", () => {
    // "ZZ"는 CLDR에 실재하는 특수 코드라("알려지지 않은 지역") 표본으로 못 쓴다.
    // 배정되지 않은 QQ를 쓴다 — Intl이 입력을 그대로 돌려주는 경로.
    expect(displayRegion("QQ", "ko")).toBe("QQ");
  });
});
