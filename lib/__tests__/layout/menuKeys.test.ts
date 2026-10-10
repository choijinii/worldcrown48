/**
 * NAV-1 B2 — 펼침 메뉴 키보드 모델 (R6 · 정본 29 설명 "마우스 올림·누름·Enter/↓ 열림 · Esc·바깥 누름 닫힘").
 */
import { describe, expect, it } from "vitest";
import { triggerKeyAction, menuKeyAction, moveIndex } from "@/lib/layout/menuKeys";

describe("▾ 버튼에서", () => {
  it.each([
    ["Enter", "open-first"],
    [" ", "open-first"],
    ["ArrowDown", "open-first"],
    ["ArrowUp", "open-last"],
    ["Escape", "close"],
    ["Tab", null],
    ["a", null],
  ])("%s → %s", (key, action) => {
    expect(triggerKeyAction(key)).toBe(action);
  });
});

describe("펼침 메뉴 안에서", () => {
  it.each([
    ["ArrowDown", "next"],
    ["ArrowUp", "prev"],
    ["Home", "first"],
    ["End", "last"],
    ["Escape", "close-return"],
    ["Tab", "close"],
    ["Enter", null],
  ])("%s → %s", (key, action) => {
    expect(menuKeyAction(key)).toBe(action);
  });
});

describe("moveIndex — 끝에서 돌아간다", () => {
  it("next / prev / first / last", () => {
    expect(moveIndex(0, 2, "next")).toBe(1);
    expect(moveIndex(1, 2, "next")).toBe(0);
    expect(moveIndex(0, 2, "prev")).toBe(1);
    expect(moveIndex(1, 3, "first")).toBe(0);
    expect(moveIndex(0, 3, "last")).toBe(2);
  });

  it("한 줄짜리 펼침(Newsroom · The Arena)에서도 제자리", () => {
    expect(moveIndex(0, 1, "next")).toBe(0);
    expect(moveIndex(0, 1, "prev")).toBe(0);
  });

  it("빈 목록은 -1", () => {
    expect(moveIndex(0, 0, "next")).toBe(-1);
  });
});
