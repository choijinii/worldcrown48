/**
 * menuKeys — 메뉴바 펼침 메뉴의 키보드 규칙 (NAV-1 B2 · 프롬프트 R6 · WAI-ARIA menu button).
 *
 * 부품(NavDropdown)은 이 판정대로 초점만 옮긴다. 순수 함수라 node 테스트로 못 박는다.
 *   ▾ 버튼   Enter · Space · ↓ = 열고 첫 줄 · ↑ = 열고 마지막 줄 · Esc = 닫기
 *   메뉴 안  ↑↓ 이동(끝에서 돌아감) · Home/End · Esc = 닫고 ▾ 버튼으로 · Tab = 닫기
 */

export type TriggerAction = "open-first" | "open-last" | "close";
export type MenuAction = "next" | "prev" | "first" | "last" | "close-return" | "close";

export function triggerKeyAction(key: string): TriggerAction | null {
  switch (key) {
    case "Enter":
    case " ":
    case "ArrowDown":
      return "open-first";
    case "ArrowUp":
      return "open-last";
    case "Escape":
      return "close";
    default:
      return null;
  }
}

export function menuKeyAction(key: string): MenuAction | null {
  switch (key) {
    case "ArrowDown":
      return "next";
    case "ArrowUp":
      return "prev";
    case "Home":
      return "first";
    case "End":
      return "last";
    case "Escape":
      return "close-return";
    case "Tab":
      return "close";
    default:
      return null;
  }
}

/** 초점 줄 번호. 끝에서 돌아간다. 빈 목록이면 -1. */
export function moveIndex(
  current: number,
  length: number,
  move: "next" | "prev" | "first" | "last",
): number {
  if (length <= 0) return -1;
  if (move === "first") return 0;
  if (move === "last") return length - 1;
  const step = move === "next" ? 1 : -1;
  return (current + step + length) % length;
}
