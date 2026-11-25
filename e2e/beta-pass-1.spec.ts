/**
 * BETA-PASS-1 E2E — 1차 베타 명단 로그인 통과 (지시서 §6 · §11).
 *
 * playwright.beta.config.ts 가 에뮬레이터 안에서 커튼 켜진 빌드(3300)와 런칭 시각 지난 빌드(3301)를 띄운다.
 * 로그인은 구글 창 대신 에뮬레이터 계정(메일 · 메일 인증 있음)의 시험 토큰으로 — 화면은 로그인된 계정을 보고
 * 곧바로 betaPass 를 부른다(구글 창으로 들어와도 같은 길).
 * ① 시크릿 /beta 열림 + 메뉴바 없음 ② 명단 계정 → 들어가기 → / 피치 · 아레나 · 차트 길 열림
 * ③ 명단 밖 계정 → ④ 문구 · 쿠키 없음 · / → /launch ④ 위조 · 만료 쿠키 → /launch ⑤ 카카오톡 user agent → 안내 상자
 * ⑥ 런칭 뒤 /beta → /
 */
import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import { BETA_PORTS, E2E_BETA_SECRET } from "../playwright.beta.config";
import { adminApp, collectConsoleErrors, db, expectNoConsoleErrors, resetEmulators } from "./emulator/helpers";
import { signBetaPass } from "../lib/launch/betaPass";

const ON = `http://localhost:${BETA_PORTS.on}`;
const PAST = `http://localhost:${BETA_PORTS.past}`;
const LISTED = { uid: "beta-tester-1", email: "Tester.One@Example.com" };
const STRANGER = { uid: "beta-stranger-1", email: "stranger@example.com" };

async function shot(page: Page, name: string) {
  await test.info().attach(name, { body: await page.screenshot({ fullPage: false }), contentType: "image/png" });
}

async function ensureUser(u: { uid: string; email: string }) {
  const auth = adminApp().auth();
  await auth.deleteUser(u.uid).catch(() => undefined);
  await auth.createUser({ uid: u.uid, email: u.email, emailVerified: true });
}

async function signIn(page: Page, uid: string) {
  const token = await adminApp().auth().createCustomToken(uid);
  await page.waitForFunction(() => typeof (window as unknown as { __wc48SignIn?: unknown }).__wc48SignIn === "function");
  await page.evaluate(async (t) => {
    await (window as unknown as { __wc48SignIn: (x: string) => Promise<unknown> }).__wc48SignIn(t);
  }, token);
}

async function betaCookie(context: BrowserContext) {
  return (await context.cookies()).find((c) => c.name === "wc48_beta");
}

test.beforeEach(async () => {
  await resetEmulators();
  // 명단은 소문자로 넣는다 — 계정 메일의 대문자는 함수가 소문자로 맞춘다.
  await db().doc("config/betaAllowlist").set({ emails: ["tester.one@example.com"] });
  await ensureUser(LISTED);
  await ensureUser(STRANGER);
});

test("① 시크릿 창 — /beta 는 열린다 · 메뉴바 없음 · / 는 여전히 /launch", async ({ page }) => {
  const errors = collectConsoleErrors(page);
  const res = await page.goto(`${ON}/beta`);
  expect(res?.status()).toBe(200);
  expect(new URL(page.url()).pathname).toBe("/beta");
  await expect(page.getByTestId("beta-page")).toBeVisible();
  await expect(page.getByRole("heading", { level: 1 })).toContainText("월크48의 첫 팬으로 모십니다");
  await expect(page.getByTestId("beta-signin")).toBeVisible();
  await expect(page.locator("header.wc-nav")).toBeHidden();
  await expect(page.getByTestId("nav-burger")).toBeHidden();
  await expect(page.getByTestId("beta-kakao")).toHaveCount(0);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  await shot(page, "beta-signed-out-1440");
  await page.setViewportSize({ width: 390, height: 844 });
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
  // 제목이 낱말 가운데서 쪼개지지 않는다("모십니/다" ✕) — 둘째 줄이 "월크48의 첫 팬으로" 로 끝나도록 낱말 단위로 줄바꿈.
  await expect(page.getByRole("heading", { level: 1 })).toHaveCSS("word-break", "keep-all");
  await shot(page, "beta-signed-out-390");

  await page.goto(`${ON}/`);
  expect(new URL(page.url()).pathname).toBe("/launch");
  await expectNoConsoleErrors(errors);
});

test("② 명단 계정 — 확인됨 → [월크48 들어가기] → / 피치 · 아레나 · 차트 길 열림", async ({ page, context }) => {
  await page.goto(`${ON}/beta`);
  await signIn(page, LISTED.uid);
  await expect(page.getByTestId("beta-allowed")).toHaveText("확인됐습니다! 이제 들어가실 수 있어요.");
  const cookie = await betaCookie(context);
  expect(cookie?.value).toMatch(/^beta-tester-1\.\d+\.[A-Za-z0-9_-]{43}$/);
  expect(cookie?.sameSite).toBe("Lax");
  await shot(page, "beta-allowed-1440");

  await page.getByTestId("beta-enter").click();
  await page.waitForURL(`${ON}/`);
  await expect(page.locator("main.pitch")).toBeVisible();
  await shot(page, "beta-entered-pitch-1440");

  for (const p of ["/arena", "/arena/some-id/ranking"]) {
    const r = await page.request.get(`${ON}${p}`, { maxRedirects: 0 });
    expect(r.status(), p).not.toBe(307);
  }

  // 다시 와도(로그인 유지) 버튼을 누르지 않고 곧바로 확인된다.
  await page.goto(`${ON}/beta`);
  await expect(page.getByTestId("beta-allowed")).toBeVisible();
});

test("③ 명단 밖 계정 — ④ 문구 · 쿠키 없음 · / → /launch · [다른 계정으로 로그인] → ①", async ({ page, context }) => {
  await page.goto(`${ON}/beta`);
  await signIn(page, STRANGER.uid);
  await expect(page.getByTestId("beta-denied")).toHaveText(
    "초대 명단에 없는 계정이에요. 저희에게 알려 주신 구글 계정으로 다시 로그인해 주세요.",
  );
  expect(await betaCookie(context)).toBeUndefined();
  await shot(page, "beta-denied-1440");

  await page.getByTestId("beta-other-account").click();
  await expect(page.getByTestId("beta-signin")).toBeVisible();

  await page.goto(`${ON}/`);
  expect(new URL(page.url()).pathname).toBe("/launch");
});

test("④ 손으로 심은 쿠키 · 다른 비밀 · 만료 지난 통과증 → /launch", async ({ browser }) => {
  const now = Date.now();
  const values = [
    "1",
    "anything.goes.here",
    await signBetaPass("beta-tester-1", now + 86_400_000, "attacker-secret"),
    await signBetaPass("beta-tester-1", now - 1000, E2E_BETA_SECRET),
  ];
  for (const value of values) {
    const ctx = await browser.newContext({ storageState: { cookies: [], origins: [] } });
    await ctx.addCookies([{ name: "wc48_beta", value, url: ON }]);
    const page = await ctx.newPage();
    await page.goto(`${ON}/`);
    expect(new URL(page.url()).pathname, value).toBe("/launch");
    await ctx.close();
  }
  // 대조: 같은 비밀로 서명한 유효한 통과증은 통과
  const ctx = await browser.newContext({ storageState: { cookies: [], origins: [] } });
  await ctx.addCookies([{ name: "wc48_beta", value: await signBetaPass("beta-tester-1", now + 86_400_000, E2E_BETA_SECRET), url: ON }]);
  const page = await ctx.newPage();
  await page.goto(`${ON}/`);
  expect(new URL(page.url()).pathname).toBe("/");
  await ctx.close();
});

test("⑤ 카카오톡 user agent — 로그인 버튼 위에 안내 상자", async ({ browser }) => {
  const ctx = await browser.newContext({
    storageState: { cookies: [], origins: [] },
    viewport: { width: 390, height: 844 },
    userAgent:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 KAKAOTALK 10.4.5",
  });
  const page = await ctx.newPage();
  await page.goto(`${ON}/beta`);
  const box = page.getByTestId("beta-kakao");
  await expect(box).toHaveText(
    "카카오톡 안에서는 구글 로그인이 막힐 수 있어요. 오른쪽 메뉴에서 [다른 브라우저로 열기]를 눌러 크롬이나 사파리로 열어 주세요.",
  );
  const boxY = (await box.boundingBox())!.y;
  const btnY = (await page.getByTestId("beta-signin").boundingBox())!.y;
  expect(boxY).toBeLessThan(btnY);
  await shot(page, "beta-kakao-390");
  await ctx.close();
});

test("⑥ 런칭 시각이 지나면 /beta → / (307)", async ({ request }) => {
  const res = await request.get(`${PAST}/beta`, { maxRedirects: 0 });
  expect(res.status()).toBe(307);
  expect(new URL(res.headers()["location"], PAST).pathname).toBe("/");
});
