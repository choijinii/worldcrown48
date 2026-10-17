/**
 * Enter·쉼표로 무언가를 확정하는 입력칸의 IME(한글 조합) 규칙 — EDITOR-FIX-1.
 *
 * 조합 중 keydown 은 `isComposing === true`(또는 keyCode 229)로 온다. 그 순간 확정하면
 * 확정 직후 IME 가 조합 중이던 마지막 글자("키워드"의 "드")를 비워진 칸에 다시 써 넣어
 * 따로 칩이 된다. 조합 중에는 Enter·쉼표·Backspace 를 전부 IME 에 맡긴다.
 *
 * 조합 중 누른 쉼표는 조합이 끝난 뒤 **글자로** 들어온다 — 그래서 입력값에 쉼표가
 * 섞여 오면 onChange 쪽에서 `splitCommaDraft` 로 확정한다.
 */

export interface KeyLike {
  isComposing?: boolean;
  keyCode?: number;
}

/** keyCode 229 = 조합 중 키 (Safari 는 isComposing 없이 이것만 보낸다). */
export function isImeComposing(e: KeyLike): boolean {
  return e.isComposing === true || e.keyCode === 229;
}

export type ChipKeyAction = "commit" | "pop" | "none";

export function chipKeyAction(
  e: KeyLike & { key: string; draftEmpty: boolean; hasChips: boolean },
): ChipKeyAction {
  if (isImeComposing(e)) return "none";
  if (e.key === "Enter" || e.key === ",") return "commit";
  if (e.key === "Backspace" && e.draftEmpty && e.hasChips) return "pop";
  return "none";
}

/** 마지막 쉼표 앞은 확정할 조각, 뒤는 계속 치는 중인 글자. */
export function splitCommaDraft(text: string): { commits: string[]; rest: string } {
  const parts = text.split(",");
  const rest = parts.pop() ?? "";
  return { commits: parts, rest };
}
