/**
 * IMAGE-1 PR 3 (원장 D-92) — 편집기 그림 확인 창의 버튼 숨김 규칙.
 * 출처 페이지 열기 = sourcePage 가 있을 때만(검색) · 원본 그림 열기 = sourceUrl 이 있을 때만(검색 · 주소) · 파일은 둘 다 없음.
 * http(s) 가 아닌 주소(javascript: 등)는 링크로 만들지 않는다.
 */
import { describe, expect, it } from "vitest";
import { imageCheckLinks } from "@/lib/lab/imageCheck";

const d = (imageSource?: { origin: "upload" | "url" | "search"; sourceUrl?: string; sourcePage?: string }) => ({
  name: "A",
  nationality: "KR",
  affiliation: "",
  imageSearchKeyword: "",
  imageUrl: "https://firebasestorage.googleapis.com/x",
  imageSource,
});

describe("imageCheckLinks", () => {
  it("검색으로 들어온 그림 = 둘 다", () => {
    expect(imageCheckLinks(d({ origin: "search", sourceUrl: "https://cdn.people.com/a.jpg", sourcePage: "https://people.com/a" }))).toEqual({
      sourcePage: "https://people.com/a",
      sourceUrl: "https://cdn.people.com/a.jpg",
    });
  });
  it("주소로 넣은 그림 = 원본 그림만", () => {
    expect(imageCheckLinks(d({ origin: "url", sourceUrl: "https://x.com/a.jpg" }))).toEqual({ sourceUrl: "https://x.com/a.jpg" });
  });
  it("파일로 넣은 그림 · 출처 없음 = 둘 다 숨김", () => {
    expect(imageCheckLinks(d({ origin: "upload" }))).toEqual({});
    expect(imageCheckLinks(d())).toEqual({});
  });
  it("http(s) 가 아니면 숨김", () => {
    expect(imageCheckLinks(d({ origin: "search", sourceUrl: "javascript:alert(1)", sourcePage: "ftp://x/y" }))).toEqual({});
  });
});
