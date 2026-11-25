/**
 * /beta 화면 상태 (BETA-PASS-1 · 지시서 §3).
 *
 * ① 로그인 전(signed-out) → 구글 로그인 → 확인 중(checking) → ② 명단 안(allowed) · ④ 명단 밖(denied) ·
 * ⑤ 오류(error). ③ 카카오톡 안내 상자는 상태가 아니라 로그인 버튼 위에 덧붙는 것(lib/launch/betaPass isKakaoTalkUA).
 * 한국어만(대표 승인 2026-11-25 — 3언어 키를 만들지 않는다). 문구는 대표 승인본 글자 그대로.
 */

export type BetaCheck = "idle" | "checking" | "allowed" | "denied" | "error";
export type BetaView = "signed-out" | "checking" | "allowed" | "denied" | "error";

export const BETA_COPY = {
  allowed: "확인됐습니다! 이제 들어가실 수 있어요.",
  kakao:
    "카카오톡 안에서는 구글 로그인이 막힐 수 있어요. 오른쪽 메뉴에서 [다른 브라우저로 열기]를 눌러 크롬이나 사파리로 열어 주세요.",
  denied: "초대 명단에 없는 계정이에요. 저희에게 알려 주신 구글 계정으로 다시 로그인해 주세요.",
  error: "잠시 문제가 생겼어요. 다시 눌러 주세요.",
} as const;

export function betaView(input: { authLoading: boolean; user: { isAnonymous: boolean } | null; check: BetaCheck }): BetaView {
  if (input.authLoading) return "checking";
  if (!input.user || input.user.isAnonymous) return "signed-out";
  return input.check === "idle" ? "checking" : input.check;
}

/** 콜러블 오류 → 상태. 명단 밖(permission-denied)만 ④, 나머지(네트워크 · 서버)는 ⑤ 다시 시도. */
export function betaCheckResultFromError(err: unknown): "denied" | "error" {
  const code = (err as { code?: unknown } | undefined)?.code;
  return typeof code === "string" && code.replace(/^functions\//, "") === "permission-denied" ? "denied" : "error";
}
