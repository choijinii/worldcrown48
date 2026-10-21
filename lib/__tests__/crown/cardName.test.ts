import { describe, it, expect } from "vitest";
import { crownCardName } from "@/lib/crown/cardName";

// 원장 D-62: 크라운 카드 안 이름 = 언어와 상관없이 영어 이름 · 없으면 한글.
describe("crownCardName", () => {
  it("영어 이름", () => {
    expect(crownCardName({ name: "뉴진스", nameI18n: { ko: "뉴진스", en: "NewJeans", es: "NewJeans" } })).toBe(
      "NewJeans",
    );
  });

  it("es 만 따로 고쳐져 있어도 카드는 en", () => {
    expect(crownCardName({ name: "아이유", nameI18n: { ko: "아이유", en: "IU", es: "IU (ES)" } })).toBe("IU");
  });

  it("en 이 비면 한글", () => {
    expect(crownCardName({ name: "에스파", nameI18n: { ko: "에스파", en: "", es: "aespa" } })).toBe("에스파");
    expect(crownCardName({ name: "옛 엔트리" })).toBe("옛 엔트리");
  });

  it("언어 인자를 받지 않는다 — 화면 언어가 끼어들 자리가 없다", () => {
    expect(crownCardName.length).toBe(1);
  });
});
