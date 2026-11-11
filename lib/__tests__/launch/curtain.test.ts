/**
 * CURTAIN-1 — 런칭 전 커튼 판정(순수 함수). 지시서 §2 · §11 유닛.
 */
import { describe, expect, it } from "vitest";
import {
  PREVIEW_COOKIE,
  curtainLaunchAtMs,
  curtainRedirect,
  isCurtainExempt,
  isCurtainOn,
  hideNavOnLaunch,
  previewCookieAction,
  previewCookieString,
  shouldCurtain,
} from "@/lib/launch/curtain";
import { LAUNCH_AT_MS } from "@/lib/launch/launchAt";

const BEFORE = Date.parse("2026-11-20T00:00:00Z");
const AFTER = Date.parse("2026-11-25T15:00:00Z"); // = 11/26 00:00 KST 정각

describe("isCurtainOn — 스위치 · 시각", () => {
  it("기본 런칭 시각은 launchAt.ts 와 같다(11/26 00:00 KST)", () => {
    expect(curtainLaunchAtMs({})).toBe(LAUNCH_AT_MS);
    expect(LAUNCH_AT_MS).toBe(Date.parse("2026-11-25T15:00:00Z"));
  });
  it("on + 런칭 전 → 커튼", () => {
    expect(isCurtainOn({ LAUNCH_CURTAIN: "on" }, BEFORE)).toBe(true);
  });
  it("on + 런칭 시각 정각 이후 → 걷힘", () => {
    expect(isCurtainOn({ LAUNCH_CURTAIN: "on" }, AFTER)).toBe(false);
  });
  it("off · 없음 · 다른 글자 → 커튼 없음", () => {
    expect(isCurtainOn({ LAUNCH_CURTAIN: "off" }, BEFORE)).toBe(false);
    expect(isCurtainOn({}, BEFORE)).toBe(false);
    expect(isCurtainOn({ LAUNCH_CURTAIN: "ON " }, BEFORE)).toBe(false);
  });
  it("LAUNCH_AT 이 있으면 그 시각을 따른다(과거면 걷힘)", () => {
    const env = { LAUNCH_CURTAIN: "on", LAUNCH_AT: "2026-11-01T00:00:00Z" };
    expect(isCurtainOn(env, BEFORE)).toBe(false);
    expect(isCurtainOn({ LAUNCH_CURTAIN: "on", LAUNCH_AT: "2026-12-03T15:00:00Z" }, AFTER)).toBe(true);
  });
  it("LAUNCH_AT 이 시각이 아닌 글자면 기본값", () => {
    expect(curtainLaunchAtMs({ LAUNCH_AT: "내일" })).toBe(LAUNCH_AT_MS);
  });
});

describe("isCurtainExempt — 허용 목록", () => {
  const exempt = [
    "/launch",
    "/launch/",
    "/policies/privacy",
    "/policies",
    "/admin",
    "/admin/lab",
    "/api/x",
    "/_next/static/a.js",
    "/og.jpg",
    "/robots.txt",
    "/sitemap.xml",
    "/favicon.ico",
    "/fonts/Pretendard.woff2",
    "/brand/logo.svg",
  ];
  const blocked = ["/", "/arena/abc", "/arena", "/records", "/news/1", "/account", "/launchpad", "/administrator", "/policiesx"];
  for (const p of exempt) it(`열림: ${p}`, () => expect(isCurtainExempt(p)).toBe(true));
  for (const p of blocked) it(`막힘: ${p}`, () => expect(isCurtainExempt(p)).toBe(false));
});

describe("curtainRedirect — /launch 로, 쿼리 그대로", () => {
  it("utm · lang 이 살아서 넘어간다", () => {
    const to = curtainRedirect(
      new URL("https://worldcrown48.com/?utm_source=x&utm_medium=social&utm_campaign=prelaunch&utm_content=dm_test&lang=ko"),
    );
    expect(to.pathname).toBe("/launch");
    expect(to.search).toBe("?utm_source=x&utm_medium=social&utm_campaign=prelaunch&utm_content=dm_test&lang=ko");
    expect(to.origin).toBe("https://worldcrown48.com");
  });
  it("쿼리가 없으면 /launch 만", () => {
    expect(curtainRedirect(new URL("https://worldcrown48.com/arena/abc")).href).toBe("https://worldcrown48.com/launch");
  });
});

describe("shouldCurtain — 경로 · 관리자 쿠키 · 스위치", () => {
  const env = { LAUNCH_CURTAIN: "on" };
  it("막는 경로 + 쿠키 없음 → 막음", () => {
    expect(shouldCurtain({ pathname: "/", previewCookie: undefined, env, nowMs: BEFORE })).toBe(true);
  });
  it(`쿠키 ${PREVIEW_COOKIE}=1 → 통과`, () => {
    expect(shouldCurtain({ pathname: "/", previewCookie: "1", env, nowMs: BEFORE })).toBe(false);
  });
  it("쿠키 값이 1 이 아니면 통과 아님", () => {
    expect(shouldCurtain({ pathname: "/", previewCookie: "0", env, nowMs: BEFORE })).toBe(true);
  });
  it("허용 경로는 막지 않는다", () => {
    expect(shouldCurtain({ pathname: "/launch", previewCookie: undefined, env, nowMs: BEFORE })).toBe(false);
  });
  it("커튼이 꺼져 있으면 막지 않는다", () => {
    expect(shouldCurtain({ pathname: "/", previewCookie: undefined, env: {}, nowMs: BEFORE })).toBe(false);
    expect(shouldCurtain({ pathname: "/", previewCookie: undefined, env, nowMs: AFTER })).toBe(false);
  });
});

describe("previewCookieAction — 관리자 쿠키 심기 · 지우기", () => {
  it("관리자로 확인되면 심는다", () => {
    expect(previewCookieAction(null, true)).toBe("set");
    expect(previewCookieAction(false, true)).toBe("set");
    expect(previewCookieAction(true, true)).toBe("none");
  });
  it("관리자였다가 아니게 되면(로그아웃 · 계정 바꿈) 지운다", () => {
    expect(previewCookieAction(true, false)).toBe("clear");
  });
  it("처음부터 관리자가 아니면 건드리지 않는다(로그아웃 상태로 도는 시험의 쿠키 보존)", () => {
    expect(previewCookieAction(null, false)).toBe("none");
    expect(previewCookieAction(false, false)).toBe("none");
  });
});

describe("hideNavOnLaunch — 커튼 중 /launch 메뉴바", () => {
  const env = { LAUNCH_CURTAIN: "on" };
  it("커튼 + 쿠키 없음 → 숨김", () => {
    expect(hideNavOnLaunch({ env, nowMs: BEFORE, previewCookie: undefined })).toBe(true);
  });
  it("관리자 쿠키 → 보임", () => {
    expect(hideNavOnLaunch({ env, nowMs: BEFORE, previewCookie: "1" })).toBe(false);
  });
  it("커튼 꺼짐 · 런칭 뒤 → 보임", () => {
    expect(hideNavOnLaunch({ env: {}, nowMs: BEFORE, previewCookie: undefined })).toBe(false);
    expect(hideNavOnLaunch({ env, nowMs: AFTER, previewCookie: undefined })).toBe(false);
  });
});

describe("previewCookieString — 브라우저에 쓰는 글자", () => {
  it("심기: 30일 · 전체 길 · Lax · https 면 Secure · HttpOnly 아님", () => {
    expect(previewCookieString("set", true)).toBe("wc48_preview=1; Path=/; Max-Age=2592000; SameSite=Lax; Secure");
    expect(previewCookieString("set", false)).toBe("wc48_preview=1; Path=/; Max-Age=2592000; SameSite=Lax");
  });
  it("지우기: Max-Age=0", () => {
    expect(previewCookieString("clear", true)).toBe("wc48_preview=; Path=/; Max-Age=0; SameSite=Lax; Secure");
  });
});
