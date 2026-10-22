import { describe, it, expect } from "vitest";
import { fallbackNames, namesForPublish } from "@/lib/lab/translateNames";

// NAME-I18N-1: 이름 번역이 실패해도 발행은 성공한다 — en·es 는 빈칸(화면은 한글 폴백,
// 백필이 나중에 채울 수 있다). 빈칸으로 두는 이유: en 에 한글을 넣으면 "이미 채워짐"으로
// 보여 백필이 건너뛴다.
describe("fallbackNames", () => {
  it("ko = name · en·es 빈칸", () => {
    expect(fallbackNames(["뉴진스", "IVE"])).toEqual([
      { ko: "뉴진스", en: "", es: "" },
      { ko: "IVE", en: "", es: "" },
    ]);
  });
});

describe("namesForPublish", () => {
  const drafts = [{ name: " 뉴진스 " }, { name: "에스파" }];

  it("응답 길이가 맞으면 그대로", () => {
    const got = [
      { ko: "뉴진스", en: "NewJeans", es: "NewJeans" },
      { ko: "에스파", en: "aespa", es: "aespa" },
    ];
    expect(namesForPublish(drafts, got)).toEqual(got);
  });

  it("응답이 없거나 길이가 다르면 전부 폴백 — 이름이 엉뚱한 사람에게 붙지 않게", () => {
    expect(namesForPublish(drafts, null)).toEqual(fallbackNames(["뉴진스", "에스파"]));
    expect(namesForPublish(drafts, [{ ko: "뉴진스", en: "NewJeans", es: "NewJeans" }])).toEqual(
      fallbackNames(["뉴진스", "에스파"]),
    );
  });

  it("ko 칸이 그 자리 이름과 다르면 그 칸만 폴백", () => {
    const got = [
      { ko: "에스파", en: "aespa", es: "aespa" },
      { ko: "에스파", en: "aespa", es: "aespa" },
    ];
    expect(namesForPublish(drafts, got)[0]).toEqual({ ko: "뉴진스", en: "", es: "" });
    expect(namesForPublish(drafts, got)[1].en).toBe("aespa");
  });
});
