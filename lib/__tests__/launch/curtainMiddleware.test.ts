/**
 * CURTAIN-1 통합 — middleware 를 NextRequest 로 직접 불러 307 · Location · 허용 · 관리자 쿠키,
 * 그리고 기존 /admin noindex 가 그대로인지 본다.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { config, middleware } from "@/middleware";

const BEFORE = new Date("2026-11-20T00:00:00Z");
const AFTER = new Date("2026-11-26T01:00:00Z");

function req(path: string, cookie?: string): NextRequest {
  return new NextRequest(`https://worldcrown48.com${path}`, {
    headers: cookie ? { cookie } : {},
  });
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(BEFORE);
  vi.stubEnv("LAUNCH_CURTAIN", "on");
  vi.stubEnv("LAUNCH_AT", "");
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
});

describe("커튼 켜짐 — 막는 길", () => {
  for (const p of ["/", "/arena/abc", "/records", "/news/1", "/account"]) {
    it(`${p} → 307 /launch`, () => {
      const res = middleware(req(p));
      expect(res.status).toBe(307);
      expect(res.headers.get("location")).toBe("https://worldcrown48.com/launch");
    });
  }
  it("쿼리(utm · lang)를 그대로 넘긴다", () => {
    const q = "?utm_source=x&utm_medium=social&utm_campaign=prelaunch&utm_content=dm_test";
    const res = middleware(req(`/${q}`));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe(`https://worldcrown48.com/launch${q}`);
  });
});

describe("커튼 켜짐 — 여는 길", () => {
  for (const p of ["/launch", "/launch?lang=ko", "/policies/privacy", "/admin/lab", "/og.jpg", "/robots.txt", "/sitemap.xml"]) {
    it(`${p} → 그대로`, () => {
      const res = middleware(req(p));
      expect(res.status).toBe(200);
      expect(res.headers.get("location")).toBeNull();
    });
  }
  it("관리자 쿠키 wc48_preview=1 → / 그대로", () => {
    const res = middleware(req("/", "wc48_preview=1"));
    expect(res.status).toBe(200);
    expect(res.headers.get("location")).toBeNull();
  });
});

describe("커튼 꺼짐", () => {
  it("LAUNCH_CURTAIN=off → / 그대로", () => {
    vi.stubEnv("LAUNCH_CURTAIN", "off");
    expect(middleware(req("/")).status).toBe(200);
  });
  it("런칭 시각이 지나면 → / 그대로", () => {
    vi.setSystemTime(AFTER);
    expect(middleware(req("/")).status).toBe(200);
  });
  it("LAUNCH_AT 을 과거로 두면 → / 그대로", () => {
    vi.stubEnv("LAUNCH_AT", "2026-11-01T00:00:00Z");
    expect(middleware(req("/")).status).toBe(200);
  });
});

describe("기존 /admin noindex 회귀 없음", () => {
  it("/admin/lab 에 X-Robots-Tag", () => {
    expect(middleware(req("/admin/lab")).headers.get("x-robots-tag")).toBe("noindex, nofollow");
  });
  it("공개 길에는 X-Robots-Tag 없음", () => {
    expect(middleware(req("/launch")).headers.get("x-robots-tag")).toBeNull();
  });
});

describe("matcher — 모든 페이지 길에 돈다(정적 파일 제외)", () => {
  it("넓어진 matcher", () => {
    expect(config.matcher).toEqual(["/((?!_next/static|_next/image|.*\\..*).*)"]);
  });
});
