/**
 * CURTAIN-1 통합 — middleware 를 NextRequest 로 직접 불러 307 · Location · 허용 · 관리자 쿠키,
 * 그리고 기존 /admin noindex 가 그대로인지 본다.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { config, middleware } from "@/middleware";
import { signBetaPass } from "@/lib/launch/betaPass";

const BEFORE = new Date("2026-11-20T00:00:00Z");
const AFTER = new Date("2026-12-10T01:00:00Z");
const SECRET = "mw-test-secret";
const DAY = 86_400_000;

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
  vi.stubEnv("BETA_PASS_SECRET", SECRET);
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
});

describe("커튼 켜짐 — 막는 길", () => {
  for (const p of ["/", "/arena/abc", "/records", "/news/1", "/account"]) {
    it(`${p} → 307 /launch`, async () => {
      const res = (await middleware(req(p)));
      expect(res.status).toBe(307);
      expect(res.headers.get("location")).toBe("https://worldcrown48.com/launch");
    });
  }
  it("쿼리(utm · lang)를 그대로 넘긴다", async () => {
    const q = "?utm_source=x&utm_medium=social&utm_campaign=prelaunch&utm_content=dm_test";
    const res = (await middleware(req(`/${q}`)));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe(`https://worldcrown48.com/launch${q}`);
  });
});

describe("커튼 켜짐 — 여는 길", () => {
  for (const p of ["/launch", "/launch?lang=ko", "/policies/privacy", "/admin/lab", "/og.jpg", "/robots.txt", "/sitemap.xml"]) {
    it(`${p} → 그대로`, async () => {
      const res = (await middleware(req(p)));
      expect(res.status).toBe(200);
      expect(res.headers.get("location")).toBeNull();
    });
  }
  it("관리자 쿠키 wc48_preview=1 → / 그대로", async () => {
    const res = (await middleware(req("/", "wc48_preview=1")));
    expect(res.status).toBe(200);
    expect(res.headers.get("location")).toBeNull();
  });
});

describe("커튼 꺼짐", () => {
  it("LAUNCH_CURTAIN=off → / 그대로", async () => {
    vi.stubEnv("LAUNCH_CURTAIN", "off");
    expect((await middleware(req("/"))).status).toBe(200);
  });
  it("런칭 시각이 지나면 → / 그대로", async () => {
    vi.setSystemTime(AFTER);
    expect((await middleware(req("/"))).status).toBe(200);
  });
  it("LAUNCH_AT 을 과거로 두면 → / 그대로", async () => {
    vi.stubEnv("LAUNCH_AT", "2026-11-01T00:00:00Z");
    expect((await middleware(req("/"))).status).toBe(200);
  });
});

describe("기존 /admin noindex 회귀 없음", () => {
  it("/admin/lab 에 X-Robots-Tag", async () => {
    expect((await middleware(req("/admin/lab"))).headers.get("x-robots-tag")).toBe("noindex, nofollow");
  });
  it("공개 길에는 X-Robots-Tag 없음", async () => {
    expect((await middleware(req("/launch"))).headers.get("x-robots-tag")).toBeNull();
  });
});

describe("matcher — 모든 페이지 길에 돈다(정적 파일 제외)", () => {
  it("넓어진 matcher", async () => {
    expect(config.matcher).toEqual(["/((?!_next/static|_next/image|.*\\..*).*)"]);
  });
});

describe("BETA-PASS-1 — 통과증 쿠키 wc48_beta", () => {
  const passFor = (expMs: number, secret = SECRET) => signBetaPass("uid-1", expMs, secret);

  it("/beta 는 쿠키 없이 열린다 · noindex", async () => {
    const res = await middleware(req("/beta"));
    expect(res.status).toBe(200);
    expect(res.headers.get("location")).toBeNull();
    expect(res.headers.get("x-robots-tag")).toBe("noindex, nofollow");
  });

  for (const p of ["/", "/arena/abc", "/arena/abc/ranking"]) {
    it(`유효한 통과증 → ${p} 그대로`, async () => {
      const t = await passFor(BEFORE.getTime() + DAY);
      const res = await middleware(req(p, `wc48_beta=${t}`));
      expect(res.status).toBe(200);
      expect(res.headers.get("location")).toBeNull();
    });
  }

  it("아무 값이나 심은 쿠키 → /launch", async () => {
    for (const v of ["1", "uid-1.99999999999999.AAAA", "garbage"]) {
      const res = await middleware(req("/", `wc48_beta=${v}`));
      expect(res.status).toBe(307);
      expect(res.headers.get("location")).toBe("https://worldcrown48.com/launch");
    }
  });

  it("다른 비밀로 서명한 통과증 → /launch", async () => {
    const t = await passFor(BEFORE.getTime() + DAY, "attacker-secret");
    expect((await middleware(req("/", `wc48_beta=${t}`))).status).toBe(307);
  });

  it("만료 지난 통과증 → /launch", async () => {
    const t = await passFor(BEFORE.getTime() - 1);
    expect((await middleware(req("/", `wc48_beta=${t}`))).status).toBe(307);
  });

  it("비밀 환경 변수가 비어 있으면 어떤 통과증도 → /launch", async () => {
    const t = await passFor(BEFORE.getTime() + DAY);
    vi.stubEnv("BETA_PASS_SECRET", "");
    expect((await middleware(req("/", `wc48_beta=${t}`))).status).toBe(307);
  });

  it("관리자 쿠키 동작은 그대로(통과증 없이도 통과)", async () => {
    expect((await middleware(req("/", "wc48_preview=1"))).status).toBe(200);
  });

  it("런칭 시각이 지나면 /beta → / (307 · 쿼리 그대로)", async () => {
    vi.setSystemTime(AFTER);
    const res = await middleware(req("/beta?lang=ko"));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("https://worldcrown48.com/?lang=ko");
  });
});
