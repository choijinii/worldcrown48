/**
 * 런칭 전 커튼 (CURTAIN-1 · 대표 결정 2026-11-11 "커튼 건다").
 *
 * 런칭 전에는 런칭 대회가 아직 발행되지 않아 피치에 빈 카드가 보인다. 그래서 공개 화면으로
 * 들어온 방문자를 사전등록 페이지(/launch)로 보낸다. 길목(middleware)만 막고 화면은 고치지 않는다.
 *
 * 커튼 = `LAUNCH_CURTAIN=on` 이고 지금이 런칭 시각 **전**일 때. 런칭 시각 기본값은
 * launchAt.ts 한 곳(원장 D-59) — 밀리면 코드가 아니라 환경 변수 `LAUNCH_AT` 으로 바꾼다.
 * 관리자는 쿠키 `wc48_preview=1` 로 통과한다. middleware 는 Firebase 로그인을 볼 수 없어서
 * (handoff §9 trap #13) 로그인 상태를 아는 화면 쪽이 쿠키를 심는다(CurtainPreviewCookie).
 * 이 쿠키는 보호 장치가 아니라 "미리 보기" 표시다 — 관리자 화면 보호는 adminGate 가 한다.
 */
import { LAUNCH_AT_MS } from "@/lib/launch/launchAt";

export const PREVIEW_COOKIE = "wc48_preview";
export const PREVIEW_COOKIE_MAX_AGE_S = 60 * 60 * 24 * 30; // 30일
export const CURTAIN_TARGET = "/launch";

export interface CurtainEnv {
  LAUNCH_CURTAIN?: string;
  LAUNCH_AT?: string;
}

/** 런칭 시각(ms). `LAUNCH_AT` 이 시각으로 읽히지 않으면 기본값. */
export function curtainLaunchAtMs(env: CurtainEnv): number {
  const parsed = env.LAUNCH_AT ? Date.parse(env.LAUNCH_AT) : NaN;
  return Number.isFinite(parsed) ? parsed : LAUNCH_AT_MS;
}

export function isCurtainOn(env: CurtainEnv, nowMs: number): boolean {
  return env.LAUNCH_CURTAIN === "on" && nowMs < curtainLaunchAtMs(env);
}

/** `/launch` 와 `/launch/…` 는 맞고 `/launchpad` 는 아니다. */
function underPrefix(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

/** 커튼이 막지 않는 길 — 사전등록 · 정책(늘 열려 있어야 한다) · 관리자 · 내부 · 정적 파일. */
export function isCurtainExempt(pathname: string): boolean {
  if (["/launch", "/policies", "/admin", "/api", "/_next"].some((p) => underPrefix(pathname, p))) {
    return true;
  }
  if (pathname.startsWith("/favicon")) return true;
  const last = pathname.slice(pathname.lastIndexOf("/") + 1);
  return last.includes(".");
}

/** /launch 로 — 들어올 때 붙은 쿼리(utm_* · lang)는 그대로 넘긴다. */
export function curtainRedirect(url: URL): URL {
  const to = new URL(url.href);
  to.pathname = CURTAIN_TARGET;
  to.hash = "";
  return to;
}

export function hasPreviewCookie(value: string | undefined): boolean {
  return value === "1";
}

export function shouldCurtain(input: {
  pathname: string;
  previewCookie: string | undefined;
  env: CurtainEnv;
  nowMs: number;
}): boolean {
  return (
    isCurtainOn(input.env, input.nowMs) &&
    !hasPreviewCookie(input.previewCookie) &&
    !isCurtainExempt(input.pathname)
  );
}

/**
 * 관리자 쿠키를 어떻게 할지. `prevAdmin` = 바로 전에 본 상태(처음이면 null).
 * 지우는 것은 관리자 → 비관리자 전환(로그아웃 · 계정 바꿈)뿐이다. 처음부터 비관리자인
 * 화면이 지우면, 로그아웃 상태로 도는 시험이 저장 상태의 쿠키를 첫 화면에서 잃는다.
 */
export function previewCookieAction(
  prevAdmin: boolean | null,
  admin: boolean,
): "set" | "clear" | "none" {
  if (admin) return prevAdmin === true ? "none" : "set";
  return prevAdmin === true ? "clear" : "none";
}

/** 커튼 중 /launch 는 메뉴바·서랍을 숨긴다(메뉴 한 번이면 홈으로 가므로). 관리자 쿠키면 보인다. */
export function hideNavOnLaunch(input: {
  env: CurtainEnv;
  nowMs: number;
  previewCookie: string | undefined;
}): boolean {
  return isCurtainOn(input.env, input.nowMs) && !hasPreviewCookie(input.previewCookie);
}

/** document.cookie 에 쓰는 글자. HttpOnly 는 화면 스크립트가 쓰는 쿠키라 붙일 수 없다. */
export function previewCookieString(action: "set" | "clear", secure: boolean): string {
  const base =
    action === "set"
      ? `${PREVIEW_COOKIE}=1; Path=/; Max-Age=${PREVIEW_COOKIE_MAX_AGE_S}; SameSite=Lax`
      : `${PREVIEW_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`;
  return secure ? `${base}; Secure` : base;
}
