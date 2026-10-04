/**
 * cookieConsentBoot — 쿠키 동의 부품이 첫 화면에서 무엇을 할지 정하는 순수 함수 (ANON-1).
 *
 * 2026-10-04 대표 결정(제안 1): **익명 계정은 쿠키 동의 버튼을 누를 때 만든다.**
 * 그래서 첫 화면 판단은 "이미 있는 사용자"만 보고, 사용자가 없으면 계정을 만들지 않고
 * 곧바로 동의 바를 보여 준다.
 *
 *   흔적 쿠키 있음(이미 동의함)        → "hide-by-cookie"  (아무것도 읽지 않음)
 *   흔적 쿠키 없음 + 기존 사용자 있음  → "check-firestore" (그 사용자의 동의 기록 확인)
 *   흔적 쿠키 없음 + 사용자 없음       → "show-banner"     (첫 방문 — 계정 만들지 않음)
 *
 * 이 함수가 정하지 않는 것: 동의 문구 · 동의 바 배치(COOKIE-1 범위) · 저장할 때의 uid
 * (저장 순간 lib/firebase.ts 의 익명 계정 함수로 정한다 — 로그인 사용자면 그 사람, 아니면 그때 익명 계정 생성).
 */
export type ConsentBootAction = "hide-by-cookie" | "check-firestore" | "show-banner";

export function planConsentBoot(input: {
  cookieSavedAt: Date | null;
  existingUid: string | null;
}): ConsentBootAction {
  if (input.cookieSavedAt) return "hide-by-cookie";
  if (input.existingUid) return "check-firestore";
  return "show-banner";
}
