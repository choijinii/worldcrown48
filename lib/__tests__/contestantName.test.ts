import { describe, it, expect } from "vitest";
import { localizedName } from "@/lib/contestantName";

// NAME-I18N-1 (원장 D-61): 언어에 맞는 이름 · 비면 en → ko 순서로 폴백 · 빈칸 금지.
describe("localizedName", () => {
  const full = {
    name: "뉴진스",
    nameI18n: { ko: "뉴진스", en: "NewJeans", es: "NewJeans" },
  };

  it("화면 언어의 이름을 고른다", () => {
    expect(localizedName(full, "ko")).toBe("뉴진스");
    expect(localizedName(full, "en")).toBe("NewJeans");
    expect(localizedName(full, "es")).toBe("NewJeans");
  });

  it("es 가 비면 en", () => {
    const c = { name: "아이유", nameI18n: { ko: "아이유", en: "IU", es: "" } };
    expect(localizedName(c, "es")).toBe("IU");
  });

  it("en 도 비면 한글(ko → name)", () => {
    const c = { name: "에스파", nameI18n: { ko: "에스파", en: " ", es: "" } };
    expect(localizedName(c, "en")).toBe("에스파");
    expect(localizedName(c, "es")).toBe("에스파");
  });

  it("nameI18n 이 없는 옛 문서는 name", () => {
    expect(localizedName({ name: "옛 엔트리" }, "en")).toBe("옛 엔트리");
    expect(localizedName({ name: "옛 엔트리", nameI18n: null }, "es")).toBe("옛 엔트리");
  });

  it("ko 칸이 비어도 정본 name 으로 — 빈칸이 나오지 않는다", () => {
    expect(localizedName({ name: "뉴진스", nameI18n: { en: "NewJeans" } }, "ko")).toBe("뉴진스");
  });
});
