/**
 * accountView — `/account`(Locker Room)가 어느 화면을 보이나 (NAV-1 · 정본 v4 40 · 41).
 *
 * 비로그인(익명 포함)은 예전처럼 `/` 로 쫓아내지 않고 그 자리에서 안내 화면을 본다.
 * 이 판정은 읽기만 한다 — 익명 계정을 만들지 않는다(원장 D-41: 생성 자리는 셋뿐).
 */
export type AccountView = "loading" | "guest" | "account";

export function accountView(s: { loading: boolean; user: { isAnonymous: boolean } | null }): AccountView {
  if (s.loading) return "loading";
  return s.user && !s.user.isAnonymous ? "account" : "guest";
}
