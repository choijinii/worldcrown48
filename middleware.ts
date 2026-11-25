/**
 * Edge middleware — 세 가지 일.
 *
 * 1) /admin 아래에 noindex 를 붙인다. Firebase 로그인은 브라우저(IndexedDB)에 있어서 Edge
 *    middleware 는 방문자가 운영자인지 볼 수 없다(handoff §9 trap #13). 진짜 막기는 화면의
 *    AdminAuthGuard 가 하고, 여기는 검색엔진에 운영 화면이 잡히지 않게 하는 덧막이다.
 * 2) 런칭 전 커튼(CURTAIN-1) — 공개 화면 요청을 /launch 로 307 이동(쿼리 그대로). 판정은
 *    lib/launch/curtain.ts. 301 은 쓰지 않는다 — 런칭 뒤에 홈이 /launch 로 기억되면 안 된다.
 * 3) 1차 베타(BETA-PASS-1) — 서명이 맞고 만료 전인 통과증 쿠키 `wc48_beta` 는 커튼을 지난다
 *    (검증 = lib/launch/betaPass.ts · 비밀 = 환경 변수 BETA_PASS_SECRET). 들어오는 문 /beta 는
 *    noindex 이고, 런칭 시각이 지나면 / 로 307.
 */
import { NextResponse, type NextRequest } from "next/server";
import { isAdminPath } from "@/lib/lab/adminGate";
import { BETA_COOKIE, verifyBetaPass } from "@/lib/launch/betaPass";
import {
  BETA_PATH,
  PREVIEW_COOKIE,
  betaRedirectAfterLaunch,
  curtainRedirect,
  isCurtainOn,
  shouldCurtain,
} from "@/lib/launch/curtain";

export async function middleware(req: NextRequest): Promise<NextResponse> {
  const { pathname } = req.nextUrl;
  const env = { LAUNCH_CURTAIN: process.env.LAUNCH_CURTAIN, LAUNCH_AT: process.env.LAUNCH_AT };
  const nowMs = Date.now();

  if (betaRedirectAfterLaunch(pathname, env, nowMs)) {
    const to = new URL(req.nextUrl.href);
    to.pathname = "/";
    to.hash = "";
    return NextResponse.redirect(to, 307);
  }

  // 통과증 확인(HMAC)은 커튼이 켜져 있을 때만 한다 — 런칭 뒤에는 쓰이지 않는다.
  const betaPassValid = isCurtainOn(env, nowMs)
    ? await verifyBetaPass(req.cookies.get(BETA_COOKIE)?.value, process.env.BETA_PASS_SECRET, nowMs)
    : false;

  if (
    shouldCurtain({
      pathname,
      previewCookie: req.cookies.get(PREVIEW_COOKIE)?.value,
      betaPassValid,
      env,
      nowMs,
    })
  ) {
    return NextResponse.redirect(curtainRedirect(req.nextUrl), 307);
  }
  const res = NextResponse.next();
  if (isAdminPath(pathname) || pathname === BETA_PATH || pathname.startsWith(`${BETA_PATH}/`)) {
    res.headers.set("X-Robots-Tag", "noindex, nofollow");
  }
  return res;
}

export const config = {
  // 모든 페이지 길 — 정적 파일(점이 든 길)과 Next 내부 정적 묶음은 건너뛴다.
  matcher: ["/((?!_next/static|_next/image|.*\\..*).*)"],
};
