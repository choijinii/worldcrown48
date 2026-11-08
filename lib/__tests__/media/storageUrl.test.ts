/** IMAGE-1 — Storage 공개 주소(토큰 없음) · 출처 도메인 글자. */
import { describe, expect, it } from "vitest";
import { publicStorageUrl, sourceHost } from "@/lib/media/storageUrl";

describe("publicStorageUrl", () => {
  it("경로를 통째로 인코딩한 토큰 없는 주소", () => {
    expect(publicStorageUrl("wc48.firebasestorage.app", "entry-images/drafts/u1/d1/0.jpg")).toBe(
      "https://firebasestorage.googleapis.com/v0/b/wc48.firebasestorage.app/o/entry-images%2Fdrafts%2Fu1%2Fd1%2F0.jpg?alt=media",
    );
  });
  it("version 이 있으면 &v= 로 캐시를 깬다", () => {
    expect(publicStorageUrl("b", "a/0.jpg", 123)).toBe(
      "https://firebasestorage.googleapis.com/v0/b/b/o/a%2F0.jpg?alt=media&v=123",
    );
  });
});

describe("sourceHost", () => {
  it("www. 를 뗀 호스트만", () => {
    expect(sourceHost("https://www.Example.com/a/b?c=1")).toBe("example.com");
    expect(sourceHost("https://news.naver.com/x")).toBe("news.naver.com");
  });
  it("틀린 주소 · 비어 있음 · http(s) 아님 → 빈 글자", () => {
    expect(sourceHost(undefined)).toBe("");
    expect(sourceHost("")).toBe("");
    expect(sourceHost("not a url")).toBe("");
    expect(sourceHost("javascript:alert(1)")).toBe("");
  });
});
