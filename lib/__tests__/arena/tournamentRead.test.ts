/**
 * ARENA-2 PR 3 (원장 D-86) — 숨긴 대회는 기존 "찾을 수 없어요" 화면.
 *
 * 숨긴 대회(status hidden)는 규칙이 읽기를 거절한다(permission-denied). 그 거절을 "불러오지 못했어요 ·
 * 다시 시도"로 보이면 팬이 다시 시도만 반복한다 — 공개 대회는 누구나 읽으므로 거절 = 공개가 아님 = 찾을 수 없음.
 */
import { describe, expect, it } from "vitest";
import { tournamentReadFailureIsNotFound } from "@/lib/arena/tournamentRead";

describe("tournamentReadFailureIsNotFound", () => {
  it("규칙 거절(permission-denied)은 찾을 수 없음", () => {
    expect(tournamentReadFailureIsNotFound({ code: "permission-denied" })).toBe(true);
  });
  it("연결 끊김 등 그 밖의 실패는 다시 시도 화면", () => {
    expect(tournamentReadFailureIsNotFound({ code: "unavailable" })).toBe(false);
    expect(tournamentReadFailureIsNotFound(new Error("boom"))).toBe(false);
    expect(tournamentReadFailureIsNotFound(null)).toBe(false);
  });
});
