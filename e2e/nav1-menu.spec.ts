/**
 * NAV-1 — 메뉴바 · 펼침 메뉴 · ☰ 서랍 · 선택 이어가기 알약 · /records · /arena 임시 페이지.
 *
 * 1280 데스크톱 + 390 세로 + 844 가로. 각 화면에서 pageerror · console error 0.
 * 결정성: 모든 이동에 `?lang=` 고정. 동의 바는 흔적 쿠키로 미리 닫는다(정책 e2e 와 같은 방식).
 * 문구 승인 전(게이트 5) 접근성 이름은 testid 로 찾는다.
 */
import { expect, test, type Page } from "@playwright/test";

const DESKTOP = { width: 1280, height: 860 };
const PORTRAIT = { width: 390, height: 844 };
const LANDSCAPE = { width: 844, height: 390 };

async function prime(page: Page, baseURL: string | undefined, memo?: string) {
  const savedAt = Date.now() - 24 * 60 * 60 * 1000;
  await page.context().addCookies([
    { name: "wc48_consent", value: `1.0.${savedAt}`, url: baseURL ?? "http://localhost:3000" },
  ]);
  await page.addInitScript((m) => {
    try {
      if (m) localStorage.setItem("wc48:continue:v1", JSON.stringify({ tournamentId: m, at: Date.now() }));
      else localStorage.removeItem("wc48:continue:v1");
    } catch {
      /* 저장소가 막힌 환경 */
    }
  }, memo ?? "");
}

function collectErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
  page.on("console", (m) => {
    if (m.type() !== "error") return;
    const t = m.text();
    if (t.includes("Could not reach Cloud Firestore backend")) return;
    errors.push(`console: ${t}`);
  });
  return errors;
}

const menuOrder = (page: Page) =>
  page
    .locator(".wc-nav-menu [data-testid^='nav-item-']")
    .evaluateAll((els) => els.map((e) => e.getAttribute("data-testid")));

test.describe("데스크톱 1280", () => {
  test.use({ viewport: DESKTOP });

  test("메뉴바 = 팬 5개 · CTA 없음 · ▾ 세 개 · 현재 항목", async ({ page, baseURL }) => {
    const errors = collectErrors(page);
    await prime(page, baseURL);
    await page.goto("/news?lang=en");
    expect(await menuOrder(page)).toEqual([
      "nav-item-pitch",
      "nav-item-arena",
      "nav-item-records",
      "nav-item-newsroom",
      "nav-item-locker",
    ]);
    await expect(page.locator(".wc-nav-cta")).toHaveCount(0);
    await expect(page.locator(".wc-nav-caret")).toHaveCount(3);
    await expect(page.getByTestId("nav-item-newsroom")).toHaveAttribute("aria-current", "page");
    expect(errors).toEqual([]);
  });

  test("펼침 메뉴 — 마우스 올림 · Esc 닫힘 + ▾로 초점 · ↓ 이동 · 흐린 줄은 링크 아님", async ({ page, baseURL }) => {
    await prime(page, baseURL);
    await page.goto("/records?lang=en");
    await page.getByTestId("nav-item-records").hover();
    const menu = page.getByTestId("nav-dropdown-records");
    await expect(menu).toBeVisible();
    await expect(page.getByTestId("nav-sub-charts")).toHaveAttribute("aria-current", "page");
    const hall = page.getByTestId("nav-sub-hallOfFame");
    await expect(hall).toHaveAttribute("aria-disabled", "true");
    expect(await hall.getAttribute("href")).toBeNull();
    await expect(hall).toHaveCSS("opacity", "0.45");

    await page.mouse.move(640, 600);
    await expect(menu).toHaveCount(0);

    const caret = page.getByTestId("nav-caret-records");
    await caret.focus();
    await page.keyboard.press("ArrowDown");
    await expect(page.getByTestId("nav-sub-charts")).toBeFocused();
    await page.keyboard.press("ArrowDown");
    await expect(hall).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/records\?lang=en$/);
    await page.keyboard.press("Escape");
    await expect(menu).toHaveCount(0);
    await expect(caret).toBeFocused();
    await expect(caret).toHaveAttribute("aria-expanded", "false");
  });

  test("메뉴 글자 자체 = 첫 화면 · 펼침 줄 = 그 화면", async ({ page, baseURL }) => {
    await prime(page, baseURL);
    await page.goto("/?lang=en");
    await page.getByTestId("nav-item-arena").click();
    await expect(page).toHaveURL(/\/arena(\?|$)/);
    await page.getByTestId("nav-item-newsroom").hover();
    await page.getByTestId("nav-sub-allArticles").click();
    await expect(page).toHaveURL(/\/news(\?|$)/);
  });

  test("서랍 — 첫 줄 초점 · ▸ 펼침(aria-expanded) · 흐린 줄 · 바깥 누름 닫힘 + ☰로 복귀 · 관리자 묶음 없음", async ({ page, baseURL }) => {
    await prime(page, baseURL);
    await page.goto("/?lang=en");
    await page.getByTestId("nav-burger").click();
    const drawer = page.getByTestId("nav-drawer");
    await expect(drawer).toBeVisible();
    await expect(page.getByTestId("drawer-item-pitch")).toBeFocused();
    await expect(page.getByTestId("drawer-admin")).toHaveCount(0);

    const toggle = page.getByTestId("drawer-toggle-records");
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-expanded", "true");
    await expect(page.getByTestId("drawer-sub-charts")).toHaveAttribute("href", "/records");
    const hall = page.getByTestId("drawer-sub-hallOfFame");
    await expect(hall).toHaveAttribute("aria-disabled", "true");
    expect(await hall.getAttribute("href")).toBeNull();

    // 정본 4: 서랍 폭 320
    expect((await drawer.boundingBox())?.width).toBe(320);

    await page.mouse.click(1000, 400);
    await expect(drawer).toHaveCount(0);
    await expect(page.getByTestId("nav-burger")).toBeFocused();
  });

  test("/records — 머리 · 묶음 · 배너 970×90 · 줄이 있으면 차트로 · 오류 0", async ({ page, baseURL }) => {
    const errors = collectErrors(page);
    await prime(page, baseURL);
    await page.goto("/records?lang=en");
    await expect(page.getByTestId("records-page")).toBeVisible();
    await expect(page.getByRole("heading", { level: 1, name: "Charts" })).toBeVisible();
    await expect(page.getByTestId("records-ended")).toBeVisible();
    await expect(page.getByTestId("nav-item-records")).toHaveAttribute("aria-current", "page");
    const banner = page.locator('[data-banner-slot="records-below"]');
    await expect(banner).toBeVisible();
    const box = await banner.boundingBox();
    expect([box?.width, box?.height]).toEqual([970, 90]);

    const links = page.getByTestId("records-view-chart");
    const n = await links.count();
    for (let i = 0; i < n; i++) {
      expect(await links.nth(i).getAttribute("href")).toMatch(/^\/arena\/[^/]+\/ranking$/);
    }
    if (n > 0) {
      await links.first().click();
      await expect(page).toHaveURL(/\/arena\/[^/]+\/ranking/);
      await expect(page.getByTestId("module-nav")).toHaveCount(0);
    }
    expect(errors).toEqual([]);
  });

  test("/arena 임시 페이지 — 제목 · The Pitch 링크 · noindex", async ({ page, baseURL }) => {
    const errors = collectErrors(page);
    await prime(page, baseURL);
    await page.goto("/arena?lang=en");
    await expect(page.getByTestId("arena-temp")).toBeVisible();
    await expect(page.getByRole("heading", { level: 1, name: "The Arena" })).toBeVisible();
    await expect(page.getByTestId("arena-temp-pitch")).toHaveAttribute("href", "/");
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
    await expect(page.getByTestId("nav-item-arena")).toHaveAttribute("aria-current", "page");
    expect(errors).toEqual([]);
  });

  test("알약 — 메모가 있으면 메뉴 아래 오른쪽 · 마우스 올림 때 설명 · 그 대회 매치 화면에서는 숨김", async ({ page, baseURL }) => {
    await prime(page, baseURL, "nav1-e2e-tid");
    await page.goto("/records?lang=en");
    const pill = page.getByTestId("continue-pill");
    await expect(pill).toBeVisible();
    await expect(pill).toHaveAttribute("href", "/arena/nav1-e2e-tid");
    await expect(pill).toHaveText("Continue your picks");
    const note = page.getByTestId("continue-pill-note");
    await expect(note).toBeHidden();
    const noteId = await note.getAttribute("id");
    await expect(pill).toHaveAttribute("aria-describedby", noteId as string);
    await pill.hover();
    await expect(note).toBeVisible();
    await expect(note).toHaveText("You can continue only on this device. You can't continue on another device.");

    // 알약 오른쪽 끝 = 메뉴바 안쪽 오른쪽 끝(아바타와 세로 정렬)
    const pillBox = await pill.boundingBox();
    const actions = await page.locator(".wc-nav-actions").boundingBox();
    expect(Math.round((pillBox?.x ?? 0) + (pillBox?.width ?? 0))).toBe(
      Math.round((actions?.x ?? 0) + (actions?.width ?? 0)),
    );

    await page.goto("/arena/nav1-e2e-tid?lang=en");
    await expect(page.getByTestId("continue-pill")).toHaveCount(0);
  });

  test("알약 — 메모가 없으면 알약도 자리도 없다", async ({ page, baseURL }) => {
    await prime(page, baseURL);
    await page.goto("/records?lang=en");
    await expect(page.getByTestId("records-page")).toBeVisible();
    await expect(page.getByTestId("continue-pill")).toHaveCount(0);
  });
});

test.describe("휴대폰 세로 390", () => {
  test.use({ viewport: PORTRAIT });

  test("메뉴바 축소(48) · 글자 메뉴 없음 · 언어·로그인 보임 · 서랍 268", async ({ page, baseURL }) => {
    await prime(page, baseURL);
    await page.goto("/records?lang=ko");
    await expect(page.locator(".wc-nav-menu")).toBeHidden();
    expect((await page.locator(".wc-nav-bar").boundingBox())?.height).toBe(48);
    await expect(page.getByTestId("lang-toggle")).toBeVisible();
    await page.getByTestId("nav-burger").click();
    expect((await page.getByTestId("nav-drawer").boundingBox())?.width).toBe(268);
  });

  test("동의 전(동의 바가 떠 있음)에도 서랍 바닥(언어 칩)이 가려지지 않는다", async ({ page }) => {
    // 동의 흔적 쿠키 없이 — 첫 방문자. 동의 바(z 60)가 서랍 위를 덮으면 언어 칩·로그인을 못 누른다.
    await page.goto("/records?lang=ko");
    await expect(page.locator(".cookie-banner")).toHaveAttribute("data-state", "visible");
    await page.getByTestId("nav-burger").click();
    const chip = page.locator(".wc-drawer-lang-chip").last();
    await expect(chip).toBeVisible();
    const topIsDrawer = await chip.evaluate((el) => {
      const r = el.getBoundingClientRect();
      const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      return Boolean(hit && el.closest("[data-testid='nav-drawer']")?.contains(hit));
    });
    expect(topIsDrawer).toBe(true);
  });

  test("알약 아래 설명이 늘 보인다(정본 외 추가) · 390×844 캡처", async ({ page, baseURL }, info) => {
    await prime(page, baseURL, "nav1-e2e-tid");
    await page.goto("/records?lang=ko");
    const note = page.getByTestId("continue-pill-note");
    await expect(note).toBeVisible();
    await expect(note).toHaveText("같은 기기에서만 이어갈 수 있습니다. 다른 기기에서는 이어서 진행할 수 없습니다.");
    await expect(note).toHaveCSS("text-align", "right");
    await page.screenshot({ path: info.outputPath("nav1-pill-390x844-ko.png") });
    await info.attach("nav1-pill-390x844-ko", { path: info.outputPath("nav1-pill-390x844-ko.png"), contentType: "image/png" });
  });

  test("/records 배너 320×100", async ({ page, baseURL }) => {
    await prime(page, baseURL);
    await page.goto("/records?lang=ko");
    const box = await page.locator('[data-banner-slot="records-below"]').boundingBox();
    expect([box?.width, box?.height]).toEqual([320, 100]);
  });
});

test.describe("휴대폰 가로 844", () => {
  test.use({ viewport: LANDSCAPE });

  test("매치 화면이 아닌 곳은 축소 메뉴바 + 서랍으로 이동할 수 있다", async ({ page, baseURL }) => {
    await prime(page, baseURL);
    await page.goto("/records?lang=en");
    await expect(page.locator(".wc-nav-menu")).toBeHidden();
    await page.getByTestId("nav-burger").click();
    await expect(page.getByTestId("nav-drawer")).toBeVisible();
  });
});
