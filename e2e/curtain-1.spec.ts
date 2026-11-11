/**
 * CURTAIN-1 E2E — 런칭 전 커튼 (지시서 §5 · §11).
 *
 * playwright.curtain.config.ts 가 같은 빌드를 셋 띄운다:
 *   켜짐(LAUNCH_AT 먼 미래) · 꺼짐 · 켜짐+런칭 시각 지남.
 * ① 시크릿 창(쿠키 없음)으로 공개 길 → /launch 도착 · 메뉴바 없음 · 쿼리(utm · lang) 그대로
 * ② 정책 · 정적 파일은 그대로 열린다
 * ③ wc48_preview=1 쿠키 → / 가 피치를 그리고 /launch 에 메뉴바가 있다
 * ④ 꺼짐 · 시각 지남 → 커튼 없음
 */
import { expect, test, type Page } from "@playwright/test";
import { CURTAIN_PORTS } from "../playwright.curtain.config";

const ON = `http://localhost:${CURTAIN_PORTS.on}`;
const OFF = `http://localhost:${CURTAIN_PORTS.off}`;
const PAST = `http://localhost:${CURTAIN_PORTS.past}`;

async function shot(page: Page, name: string) {
  await test.info().attach(name, { body: await page.screenshot(), contentType: "image/png" });
}

test.describe("커튼 켜짐 — 시크릿 창", () => {
  for (const path of ["/", "/arena", "/records", "/news", "/account"]) {
    test(`${path} → /launch · 메뉴바 없음`, async ({ page }) => {
      const res = await page.goto(`${ON}${path}?lang=ko`);
      expect(res?.status()).toBe(200);
      expect(new URL(page.url()).pathname).toBe("/launch");
      expect(new URL(page.url()).search).toBe("?lang=ko");
      await expect(page.locator("main.lp")).toBeVisible();
      await expect(page.locator("header.wc-nav")).toBeHidden();
      await expect(page.getByTestId("nav-burger")).toBeHidden();
      if (path === "/") await shot(page, "curtain-on-launch-1440");
    });
  }

  test("첫 이동은 307(임시) — 301 아님", async ({ request }) => {
    const res = await request.get(`${ON}/`, { maxRedirects: 0 });
    expect(res.status()).toBe(307);
    expect(res.headers()["location"]).toMatch(/\/launch$/);
  });

  test("utm 쿼리가 살아서 넘어간다", async ({ page }) => {
    const q = "?utm_source=x&utm_medium=social&utm_campaign=prelaunch&utm_content=dm_test";
    await page.goto(`${ON}/${q}`);
    expect(new URL(page.url()).pathname).toBe("/launch");
    expect(new URL(page.url()).search).toBe(q);
  });

  test("정책 페이지는 그대로 열린다", async ({ page }) => {
    await page.goto(`${ON}/policies/privacy?lang=ko`);
    expect(new URL(page.url()).pathname).toBe("/policies/privacy");
    await shot(page, "curtain-on-policies-1440");
  });

  for (const path of ["/og.jpg", "/robots.txt", "/sitemap.xml"]) {
    test(`${path} 는 그대로 열린다`, async ({ request }) => {
      const res = await request.get(`${ON}${path}`, { maxRedirects: 0 });
      expect(res.status()).toBe(200);
    });
  }
});

test.describe("커튼 켜짐 — 관리자 쿠키", () => {
  test.beforeEach(async ({ context }) => {
    await context.addCookies([{ name: "wc48_preview", value: "1", url: ON }]);
  });

  test("/ 가 피치를 그린다", async ({ page }) => {
    await page.goto(`${ON}/?lang=ko`);
    expect(new URL(page.url()).pathname).toBe("/");
    await expect(page.locator("main.pitch")).toBeVisible();
    await shot(page, "curtain-on-preview-cookie-pitch-1440");
  });

  test("/launch 에 메뉴바가 있다", async ({ page }) => {
    await page.goto(`${ON}/launch?lang=ko`);
    await expect(page.getByTestId("nav-burger")).toBeVisible();
  });
});

test.describe("커튼 없음", () => {
  test("LAUNCH_CURTAIN=off → / 는 피치 · /launch 에 메뉴바", async ({ page }) => {
    await page.goto(`${OFF}/?lang=ko`);
    expect(new URL(page.url()).pathname).toBe("/");
    await expect(page.locator("main.pitch")).toBeVisible();
    await page.goto(`${OFF}/launch?lang=ko`);
    await expect(page.getByTestId("nav-burger")).toBeVisible();
  });

  test("런칭 시각이 지나면 → / 는 피치 · /launch 에 메뉴바", async ({ page }) => {
    await page.goto(`${PAST}/?lang=ko`);
    expect(new URL(page.url()).pathname).toBe("/");
    await expect(page.locator("main.pitch")).toBeVisible();
    await page.goto(`${PAST}/launch?lang=ko`);
    await expect(page.getByTestId("nav-burger")).toBeVisible();
  });
});
