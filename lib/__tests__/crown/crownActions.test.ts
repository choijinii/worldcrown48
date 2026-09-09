/**
 * crownActionState — v2.1 공유 개방 / 저장 잠금 (§16 2·3).
 *
 * v2.0까지는 `canShare` 하나가 공유·저장을 함께 잠갔다(HF-2 공유 게이트). v2.1에서 게스트의
 * 공유를 여는 이유는 유입이다 — 공유 링크에 uid가 없어(§16 실측 4) 열어도 안전하고, 게스트의
 * 선택은 어차피 랭킹에서 빠진다(PR 3). 로그인 유인은 "간직하려면"(저장)으로 옮겼다.
 */
import { describe, expect, it } from "vitest";
import { crownActionState } from "@/lib/crown/crownActions";

describe("crownActionState", () => {
  it("게스트도 공유할 수 있다 — v2.1의 핵심 변경", () => {
    expect(crownActionState({ isSignedIn: false })).toEqual({
      canShare: true,
      canSave: false,
    });
  });

  it("게스트는 저장(다운로드)할 수 없다", () => {
    expect(crownActionState({ isSignedIn: false }).canSave).toBe(false);
  });

  it("로그인하면 둘 다 열린다", () => {
    expect(crownActionState({ isSignedIn: true })).toEqual({
      canShare: true,
      canSave: true,
    });
  });

  it("공유는 로그인 여부와 무관하게 언제나 열려 있다", () => {
    for (const isSignedIn of [true, false]) {
      expect(crownActionState({ isSignedIn }).canShare).toBe(true);
    }
  });
});
