/**
 * IMAGE-1 PR 3 — 영상 대회 크라운 카드 사진: 첫 주소(hq720 · oar2)가 안 뜨면 hqdefault, 그것도 안 되면 이니셜.
 * 유튜브는 없는 썸네일 대신 120px 회색 자리 그림을 주기도 한다 — 그것도 실패다(서버 fetchFirstThumb 과 같은 판정).
 */
import { describe, expect, it } from "vitest";
import { isUsablePhoto, photoCandidates } from "@/lib/crown/photoFallback";

describe("photoCandidates", () => {
  it("photoUrl → photoFallbackUrl 순 · 없으면 빈 목록", () => {
    expect(photoCandidates({ photoUrl: "a", photoFallbackUrl: "b" })).toEqual(["a", "b"]);
    expect(photoCandidates({ photoUrl: "a" })).toEqual(["a"]);
    expect(photoCandidates({})).toEqual([]);
  });
});
describe("isUsablePhoto", () => {
  it("폭 120 이하(회색 자리 그림) = 실패", () => {
    expect(isUsablePhoto(120)).toBe(false);
    expect(isUsablePhoto(0)).toBe(false);
    expect(isUsablePhoto(480)).toBe(true);
  });
});
