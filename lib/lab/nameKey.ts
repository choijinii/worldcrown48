/**
 * nameKey — 이름 칸을 "같은 인물인가"로 비교하는 키 (LAB-UX-1 A).
 *
 * `functions/src/core/parseContestants.ts`의 `normalizeNameKey`와 **같은 규칙**이다.
 * functions는 루트 `lib`를 import할 수 없어(저장소 관례) 규칙이 두 곳에 산다 —
 * AI-2가 힌트 상수를 복제한 것과 같은 자리, 같은 이유다. 규칙이 갈라지면 서버가
 * 병합한 항목을 화면이 중복으로 표시하게 되므로, 둘 중 하나를 고치면 다른 하나도
 * 고친다(테스트가 같은 표본으로 양쪽을 검증한다).
 *
 * 괄호 꼬리 제거 → 소문자 → 공백 제거. `설윤` = `설윤(엔믹스)` = `설 윤`.
 */

/** 괄호와 그 안 내용 — 반각·전각·대괄호·【】. 닫힘이 없어도(잘린 입력) 지운다. */
const PARENTHETICAL = new RegExp(
  "[\\u0028\\uFF08\\u005B\\uFF3B\\u3010]" +
    "[^\\u0029\\uFF09\\u005D\\uFF3D\\u3011]*" +
    "[\\u0029\\uFF09\\u005D\\uFF3D\\u3011]?",
  "g",
);

/** 괄호 **안쪽**만 캡처 — 이름 꼬리가 무엇을 말하는지 보려고 쓴다. */
const PARENTHETICAL_INNER = new RegExp(
  "[\\u0028\\uFF08\\u005B\\uFF3B\\u3010]" +
    "([^\\u0029\\uFF09\\u005D\\uFF3D\\u3011]*)",
);

/** 중복 판정용 이름 키. 빈 이름은 빈 문자열 — 비교에서 빠진다. */
export function normalizeNameKey(name: string): string {
  return (name ?? "")
    .replace(PARENTHETICAL, " ")
    .toLocaleLowerCase()
    .replace(/\s+/g, "");
}

/** 이름 칸 괄호 안의 원문. 괄호가 없으면 빈 문자열. */
export function parentheticalOf(name: string): string {
  const inside = (name ?? "").match(PARENTHETICAL_INNER);
  return (inside?.[1] ?? "").trim();
}
