/**
 * NAV-1 — 메뉴바 · 펼침 메뉴 · ☰ 서랍 · 선택 이어가기 알약 · /records · /arena 임시 페이지.
 *
 * 1280 데스크톱 + 390 세로 + 844 가로. 각 화면에서 pageerror · console error 0.
 * 결정성: 모든 이동에 `?lang=` 고정. 동의 바는 흔적 쿠키로 미리 닫는다(정책 e2e 와 같은 방식).
 * 문구 승인 전(게이트 5) 접근성 이름은 testid 로 찾는다.
 */
import { readFileSync } from "node:fs";
import { expect, test, type BrowserContextOptions, type Page, type TestInfo } from "@playwright/test";

const DESKTOP = { width: 1280, height: 860 };
const PORTRAIT = { width: 390, height: 844 };
const LANDSCAPE = { width: 844, height: 390 };
const WIDE = { width: 1440, height: 900 };
const FULL = { width: 1920, height: 1080 };

type StorageState = NonNullable<Exclude<BrowserContextOptions["storageState"], string>>;

/** 로그인하지 않은 상태 — Vercel 우회 쿠키만 남기고 Firebase 인증(origins)은 비운다(g1 스펙과 같은 방식). */
function signedOutState(): StorageState {
  try {
    const saved = JSON.parse(readFileSync("tests/.auth/user.json", "utf8")) as Partial<StorageState>;
    return { cookies: saved.cookies ?? [], origins: [] };
  } catch {
    return { cookies: [], origins: [] };
  }
}

/** 실측 값 기록 + ±1px 비교(대표 지시 v1.3 §2-2 — 창 왼쪽 위 기준, 테두리 포함). */
function near(label: string, actual: number | undefined, expected: number, info: TestInfo) {
  info.annotations.push({ type: "measure", description: `${label} = ${actual}` });
  expect(Math.abs((actual ?? NaN) - expected), `${label}: ${actual} ≈ ${expected}`).toBeLessThanOrEqual(1);
}

async function capture(page: Page, info: TestInfo, name: string) {
  const path = info.outputPath(`${name}.png`);
  await page.screenshot({ path });
  await info.attach(name, { path, contentType: "image/png" });
}

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

  test("메뉴바 = 팬 5개 · CTA 없음 · ▾ 는 Record Room 하나 · 현재 항목", async ({ page, baseURL }) => {
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
    // ① 펼침은 Record Room 에만(정본 v4 — 고를 것이 둘 이상일 때만)
    await expect(page.locator(".wc-nav-caret")).toHaveCount(1);
    await expect(page.getByTestId("nav-caret-records")).toHaveCount(1);
    await expect(page.getByTestId("nav-caret-arena")).toHaveCount(0);
    await expect(page.getByTestId("nav-caret-newsroom")).toHaveCount(0);
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

  test("The Arena · Newsroom = 바로 가기(펼침 없음) · Record Room 펼침 줄 = 그 화면", async ({ page, baseURL }) => {
    await prime(page, baseURL);
    await page.goto("/?lang=en");
    await page.getByTestId("nav-item-arena").hover();
    await expect(page.getByTestId("nav-dropdown-arena")).toHaveCount(0);
    await page.getByTestId("nav-item-arena").click();
    await expect(page).toHaveURL(/\/arena(\?|$)/);
    await page.getByTestId("nav-item-newsroom").hover();
    await expect(page.getByTestId("nav-dropdown-newsroom")).toHaveCount(0);
    await page.getByTestId("nav-item-newsroom").click();
    await expect(page).toHaveURL(/\/news(\?|$)/);
    await page.getByTestId("nav-item-records").hover();
    await page.getByTestId("nav-sub-charts").click();
    await expect(page).toHaveURL(/\/records(\?|$)/);
  });

  test("서랍 — 첫 줄 초점 · ▸ 펼침(aria-expanded) · 흐린 줄 · 바깥 누름 닫힘 + ☰로 복귀 · 관리자 묶음 없음", async ({ page, baseURL }) => {
    await prime(page, baseURL);
    await page.goto("/?lang=en");
    await page.getByTestId("nav-burger").click();
    const drawer = page.getByTestId("nav-drawer");
    await expect(drawer).toBeVisible();
    await expect(page.getByTestId("drawer-item-pitch")).toBeFocused();
    await expect(page.getByTestId("drawer-admin")).toHaveCount(0);

    // 하위가 있는 대분류는 줄 전체가 펼치기 버튼(정본 v4)
    const toggle = page.getByTestId("drawer-item-records");
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-expanded", "true");
    await expect(page.getByTestId("drawer-sub-charts")).toHaveAttribute("href", "/records");
    const hall = page.getByTestId("drawer-sub-hallOfFame");
    await expect(hall).toHaveAttribute("aria-disabled", "true");
    expect(await hall.getAttribute("href")).toBeNull();

    // 정본 v4: 서랍 폭 300
    expect((await drawer.boundingBox())?.width).toBe(300);

    await page.mouse.click(1000, 400);
    await expect(drawer).toHaveCount(0);
    await expect(page.getByTestId("nav-burger")).toBeFocused();
  });

  test("서랍 ② 하위 있는 대분류를 누르면 펼침만 — 주소 그대로 · 서랍 열린 채", async ({ page, baseURL }) => {
    await prime(page, baseURL);
    await page.goto("/?lang=en");
    const before = page.url();
    await page.getByTestId("nav-burger").click();
    const drawer = page.getByTestId("nav-drawer");
    await page.getByTestId("drawer-item-arena").click();
    await expect(page.getByTestId("drawer-sub-arenaHome")).toBeVisible();
    await expect(page.getByTestId("drawer-item-arena")).toHaveAttribute("aria-expanded", "true");
    expect(page.url()).toBe(before);
    await expect(drawer).toBeVisible();
    // 다시 누르면 접힌다
    await page.getByTestId("drawer-item-arena").click();
    await expect(page.getByTestId("drawer-sub-arenaHome")).toHaveCount(0);
    await expect(drawer).toBeVisible();
  });

  test("서랍 ③ 하위 줄(Charts)을 누르면 이동하고 서랍은 열린 채", async ({ page, baseURL }) => {
    await prime(page, baseURL);
    await page.goto("/?lang=en");
    await page.getByTestId("nav-burger").click();
    await page.getByTestId("drawer-item-records").click();
    await page.getByTestId("drawer-sub-charts").click();
    await expect(page).toHaveURL(/\/records(\?|$)/);
    await expect(page.getByTestId("records-page")).toBeVisible();
    await expect(page.getByTestId("nav-drawer")).toBeVisible();
  });

  test("서랍 ④ 닫힘은 바깥 누르기 · ✕ · Esc 세 가지", async ({ page, baseURL }) => {
    await prime(page, baseURL);
    await page.goto("/?lang=en");
    const drawer = page.getByTestId("nav-drawer");
    const burger = page.getByTestId("nav-burger");

    await burger.click();
    await expect(drawer).toBeVisible();
    await page.mouse.click(1000, 400);
    await expect(drawer).toBeHidden();

    await burger.click();
    await expect(drawer).toBeVisible();
    await page.getByTestId("nav-drawer-close").click();
    await expect(drawer).toBeHidden();

    await burger.click();
    await expect(drawer).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(drawer).toBeHidden();
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

  test("메뉴바 축소(42) · 글자 메뉴 없음 · 언어·로그인 보임 · 서랍 230", async ({ page, baseURL }) => {
    await prime(page, baseURL);
    await page.goto("/records?lang=ko");
    await expect(page.locator(".wc-nav-menu")).toBeHidden();
    expect((await page.locator(".wc-nav-bar").boundingBox())?.height).toBe(42);
    await expect(page.getByTestId("lang-toggle")).toBeVisible();
    await page.getByTestId("nav-burger").click();
    expect((await page.getByTestId("nav-drawer").boundingBox())?.width).toBe(230);
    // 휴대폰에서 "Record Room" 이 한 줄(줄 높이 44 그대로)
    expect((await page.getByTestId("drawer-item-records").boundingBox())?.height).toBe(44);
  });

  test("동의 전(동의 바가 떠 있음)에도 서랍 바닥(언어 칩)이 가려지지 않는다", async ({ page }) => {
    // 동의 흔적 쿠키 없이 — 첫 방문자. 동의 바(z 60)가 서랍 위를 덮으면 언어 칩·로그인을 못 누른다.
    await page.goto("/records?lang=ko");
    await expect(page.locator(".cookie-banner")).toHaveAttribute("data-state", "visible");
    await page.getByTestId("nav-burger").click();
    const chip = page.locator(".wc-drawer-lang-chip").last();
    await expect(chip).toBeVisible();
    // 서랍은 220ms 동안 왼쪽에서 밀려 나온다 — 다 나온 뒤 맨 위인지 본다.
    await expect
      .poll(() =>
        chip.evaluate((el) => {
          const r = el.getBoundingClientRect();
          const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
          return Boolean(hit && el.closest("[data-testid='nav-drawer']")?.contains(hit));
        }),
      )
      .toBe(true);
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

/* ── 정본 v4 실측 — ☰ = ✕ 자리 · 로고 부품 공유 · 캡처 (§2-2 · §3 ⑤) ── */

async function measureBar(page: Page) {
  const burger = await page.getByTestId("nav-burger").boundingBox();
  const crown = await page.locator("header.wc-nav [data-testid='brand-crown']").boundingBox();
  const word = page.locator("header.wc-nav [data-testid='brand-word']");
  const wordBox = await word.boundingBox();
  const font = await word.evaluate((el) => {
    const cs = getComputedStyle(el);
    return { size: cs.fontSize, weight: cs.fontWeight };
  });
  return { burger, crown, wordBox, font };
}

async function measureDrawerHead(page: Page) {
  const x = await page.getByTestId("nav-drawer-close").boundingBox();
  const drawer = page.getByTestId("nav-drawer");
  const crown = await drawer.locator("[data-testid='brand-crown']").boundingBox();
  const word = drawer.locator("[data-testid='brand-word']");
  const wordBox = await word.boundingBox();
  const font = await word.evaluate((el) => {
    const cs = getComputedStyle(el);
    return { size: cs.fontSize, weight: cs.fontWeight };
  });
  return { x, crown, wordBox, font };
}

const GEOMETRY = {
  // 대표 눈검사 2026-10-13: 메뉴바를 창 위에 붙이고(위 0) 높이 58 / 42. 가로 위치는 그대로(GNB.jsx).
  // 세로 = 테두리 1 + (안쪽 높이 − 부품) ÷ 2 → 데스크톱 ☰ y7 · 왕관 y16 / 휴대폰 ☰ y1 · 왕관 y11.
  desktop: { burger: [10, 7, 44], crown: [55, 16, 26], word: 91, font: "15px", barH: 58 },
  // 휴대폰 좌우 여백 12 → 0(대표 결정 2026-10-13) — 데스크톱처럼 창 가득: ☰ x = 테두리 1 + 안쪽 4.
  mobile: { burger: [5, 1, 40], crown: [53, 11, 20], word: 81, font: "13px", barH: 42 },
} as const;

for (const [name, vp, kind] of [
  ["1440", WIDE, "desktop"],
  ["1920", FULL, "desktop"],
  ["390", PORTRAIT, "mobile"],
] as const) {
  test.describe(`정본 v4 실측 · ${name}`, () => {
    test.use({ viewport: vp });

    test(`☰·로고 자리 · 서랍 열면 ✕ = ☰ · 서랍 로고 = 메뉴바 로고 · 캡처 ${name}`, async ({ page, baseURL }, info) => {
      const g = GEOMETRY[kind];
      await prime(page, baseURL);
      await page.goto("/records?lang=ko");
      await expect(page.getByTestId("records-page")).toBeVisible();

      const bar = await measureBar(page);
      // 메뉴바는 창 위에 딱 붙는다(위 띄움 0) · 높이 58 / 42
      const barBox0 = await page.locator(".wc-nav-bar").boundingBox();
      near(`${name} 메뉴바 y`, barBox0?.y, 0, info);
      near(`${name} 메뉴바 높이`, barBox0?.height, g.barH, info);
      // 창 가득 — 좌우 여백 0(데스크톱 · 휴대폰 같음)
      near(`${name} 메뉴바 x`, barBox0?.x, 0, info);
      near(`${name} 메뉴바 폭`, barBox0?.width, page.viewportSize()?.width ?? NaN, info);
      // 서랍 머리 높이 = 메뉴바 높이(아래 측정은 서랍을 연 뒤)
      near(`${name} ☰ x`, bar.burger?.x, g.burger[0], info);
      near(`${name} ☰ y`, bar.burger?.y, g.burger[1], info);
      near(`${name} ☰ w`, bar.burger?.width, g.burger[2], info);
      near(`${name} ☰ h`, bar.burger?.height, g.burger[2], info);
      near(`${name} 왕관 x`, bar.crown?.x, g.crown[0], info);
      near(`${name} 왕관 y`, bar.crown?.y, g.crown[1], info);
      near(`${name} 왕관 크기`, bar.crown?.width, g.crown[2], info);
      near(`${name} 워드마크 x`, bar.wordBox?.x, g.word, info);
      expect(bar.font).toEqual({ size: g.font, weight: "800" });
      // 오른쪽 묶음(언어 · 로그인)은 한 줄 — 메뉴바 높이 안에 든다
      const actions = await page.locator(".wc-nav-actions").boundingBox();
      expect(actions?.height ?? 99).toBeLessThanOrEqual(kind === "desktop" ? 62 : 46);
      const barBox = await page.locator(".wc-nav-bar").boundingBox();
      expect((actions?.x ?? 0) + (actions?.width ?? 0)).toBeLessThanOrEqual((barBox?.x ?? 0) + (barBox?.width ?? 0));
      // 다크 화면(/records)에서는 메뉴바 위 띠도 다크 — 동의 바의 화이트 상자에 끌려가지 않는다
      const bodyBg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
      expect(bodyBg).not.toBe("rgb(242, 242, 245)");
      expect(bodyBg).not.toBe("rgb(255, 255, 255)");
      await capture(page, info, `nav1-v4-${name}-closed`);

      await page.getByTestId("nav-burger").click();
      const drawer = page.getByTestId("nav-drawer");
      await expect(drawer).toBeVisible();
      // 열림 움직임(220ms)이 끝난 뒤 잰다
      await page.waitForTimeout(400);
      expect((await drawer.boundingBox())?.width).toBe(kind === "desktop" ? 300 : 230);

      const head = await measureDrawerHead(page);
      const headBox = await drawer.locator(".wc-drawer-head").boundingBox();
      near(`${name} 서랍 머리 높이`, headBox?.height, g.barH, info);
      near(`${name} ✕ x (☰ ${bar.burger?.x})`, head.x?.x, bar.burger?.x ?? NaN, info);
      near(`${name} ✕ y (☰ ${bar.burger?.y})`, head.x?.y, bar.burger?.y ?? NaN, info);
      near(`${name} ✕ w`, head.x?.width, bar.burger?.width ?? NaN, info);
      near(`${name} 서랍 왕관 x`, head.crown?.x, bar.crown?.x ?? NaN, info);
      near(`${name} 서랍 왕관 y`, head.crown?.y, bar.crown?.y ?? NaN, info);
      near(`${name} 서랍 왕관 크기`, head.crown?.width, bar.crown?.width ?? NaN, info);
      near(`${name} 서랍 워드마크 x`, head.wordBox?.x, bar.wordBox?.x ?? NaN, info);
      expect(head.font).toEqual(bar.font);

      // 들여쓰기 — GNB.jsx: 왼쪽 표식 2 + 패딩 36(아이콘) · 간격 10 · 하위 패딩 84 → 화면 x 38 · 68 · 86
      // (데스크톱·휴대폰 같음). 지시서의 36 · 66 · 84 는 패딩 값 — 표식 2px 만큼 오른쪽.
      const icon = await drawer.locator("[data-testid='drawer-item-records'] svg").first().boundingBox();
      near(`${name} 아이콘 x`, icon?.x, 38, info);
      near(`${name} 아이콘 크기`, icon?.width, 20, info);
      const label = await drawer.locator("[data-testid='drawer-item-records'] .wc-drawer-label").boundingBox();
      near(`${name} 대분류 글자 x`, label?.x, 68, info);
      // /records 에서 열면 Record Room 은 이미 펼쳐져 있다(지금 페이지의 묶음)
      await expect(page.getByTestId("drawer-item-records")).toHaveAttribute("aria-expanded", "true");
      const sub = await drawer.locator("[data-testid='drawer-sub-charts'] .wc-drawer-label").boundingBox();
      near(`${name} 하위 줄 글자 x`, sub?.x, 86, info);
      await capture(page, info, `nav1-v4-${name}-open`);
    });
  });
}

/* ── ⑥ Locker Room — 로그인하지 않은 사람에게 안내 화면(정본 40 · 41) ── */

for (const [name, vp, banner] of [
  ["1440", WIDE, [970, 90]],
  ["390", PORTRAIT, [320, 100]],
] as const) {
  test.describe(`Locker Room 비로그인 · ${name}`, () => {
    test.use({ viewport: vp, storageState: signedOutState() });

    test(`/account 가 리다이렉트 없이 안내문(ko) · 배너 locker-below ${banner.join("×")} · 캡처`, async ({ page, baseURL }, info) => {
      const errors = collectErrors(page);
      await prime(page, baseURL);
      await page.goto("/account?lang=ko");
      const guest = page.getByTestId("locker-guest");
      await expect(guest).toBeVisible();
      await expect(page).toHaveURL(/\/account\?lang=ko$/);
      await expect(page.getByRole("heading", { level: 1, name: "Locker Room" })).toBeVisible();
      await expect(guest).toContainText("로그인과 함께 크라운 카드와 기록을 모아 볼 수 있어요.");
      // 버튼 이름 = 저장 잠금 승인본 cta("로그인") — 앞의 G 표식은 장식(aria-hidden)
      await expect(page.getByTestId("locker-guest-signin")).toHaveAccessibleName("로그인");
      // 메뉴바는 다크 그대로, 현재 항목 Locker Room
      if (name === "1440") {
        await expect(page.getByTestId("nav-item-locker")).toHaveAttribute("aria-current", "page");
      }
      // 메뉴바가 창 위에 붙어 위 띠가 없다(대표 눈검사 2026-10-13)
      expect((await page.locator(".wc-nav-bar").boundingBox())?.y).toBe(0);
      const box = await page.locator('[data-banner-slot="locker-below"]').boundingBox();
      expect([box?.width, box?.height]).toEqual([...banner]);
      // 잠깐 기다려도 그대로(늦은 리다이렉트 없음)
      await page.waitForTimeout(800);
      await expect(page).toHaveURL(/\/account\?lang=ko$/);
      await capture(page, info, `nav1-v4-account-guest-${name}-ko`);
      expect(errors).toEqual([]);
    });
  });
}

/* ── 정본(390)보다 좁은 휴대폰 — 가로 넘침 없음 (C-3 CHART-HEAD 가 320 에서 잡았다) ── */
for (const width of [320, 360]) {
  test.describe(`좁은 휴대폰 ${width}`, () => {
    test.use({ viewport: { width, height: 800 } });

    test(`메뉴바가 창을 넘지 않는다 · 언어·로그인 입구는 남는다 (${width})`, async ({ page, baseURL }) => {
      await prime(page, baseURL);
      await page.goto("/records?lang=en");
      // 인증 확인 중 자리(폭 100)든 로그인 단추든 아바타든 — 어느 쪽이어도 넘치지 않아야 한다
      await expect(page.getByTestId("lang-toggle")).toBeVisible();
      const bar = await page.locator(".wc-nav-bar").boundingBox();
      const actions = await page.locator(".wc-nav-actions").boundingBox();
      expect((actions?.x ?? 0) + (actions?.width ?? 0)).toBeLessThanOrEqual((bar?.x ?? 0) + (bar?.width ?? 0));
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow).toBeLessThanOrEqual(0);
    });
  });
}

/* ── 정책 화면 왼쪽 목차 — sticky 위치가 메뉴바(58) 밑으로 들어가지 않는다 ── */
test.describe("정책 목차 sticky · 1440", () => {
  test.use({ viewport: WIDE });

  test("스크롤해도 목차 윗변 = 메뉴바 아랫변 + 24 (메뉴바에 가리지 않음)", async ({ page, baseURL }, info) => {
    await prime(page, baseURL);
    await page.goto("/policies/privacy?lang=ko");
    const nav = page.locator(".policy-nav");
    await expect(nav).toBeVisible();
    await page.mouse.wheel(0, 1500);
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(500);
    const bar = await page.locator(".wc-nav-bar").boundingBox();
    const box = await nav.boundingBox();
    const barBottom = (bar?.y ?? 0) + (bar?.height ?? 0);
    near("정책 목차 y", box?.y, barBottom + 24, info);
    expect(box?.y ?? 0).toBeGreaterThanOrEqual(barBottom);
  });
});
