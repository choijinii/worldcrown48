/**
 * ARENA-2 PR 3 (원장 D-86) — 숨긴 대회는 모든 공개 목록에서 빠진다.
 * 공개 목록(피치 · 아레나 홈 · Record Room · 사이트맵 · 사전등록 추천)은 전부 isPublicTournament 를 지난다(D-66).
 */
import { describe, expect, it } from "vitest";
import { isPublicTournament } from "@/lib/seo/sitemapEntries";

describe("isPublicTournament — 숨김", () => {
  it("숨긴 대회(status hidden)는 실서비스·미리보기 모두에서 빠진다", () => {
    for (const env of ["production", "preview"] as const) {
      expect(isPublicTournament({ id: "t1", status: "hidden", hostUid: "op" }, env)).toBe(false);
    }
  });
  it("다시 보이면(status active) 다시 들어간다", () => {
    expect(isPublicTournament({ id: "t1", status: "active", hostUid: "op" }, "production")).toBe(true);
  });
});
