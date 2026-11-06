/**
 * D-78 (2026-11-06 대표) — 공개 페이지 좌우 여백은 모든 폭에서 20px 하나(매치 무대 제외).
 *
 * 여섯 페이지(피치 · 아레나 홈 · Record Room · Locker Room · 사전등록 · 뉴스 목록·기사) × 390 · 768 · 1024 · 1440.
 * 잰 것 = 첫 제목(h1)의 왼쪽 끝. 내용 칸이 최대 폭에 닿기 전에는 20, 닿은 뒤에는 최대 폭 가운데 정렬로
 * 더 넓어진다 — 그 넓어지는 몫은 이 결정이 정하지 않으므로(정의) 페이지별 최대 폭으로 기대값을 계산한다.
 * 768 에서 다섯 페이지 모두 728×90 배너(결정의 "왜")와 가로 넘침 없음도 함께 본다.
 * 로그인하지 않은 상태로 본다(Locker Room 은 로그인 전 화면). 동의 바는 흔적 쿠키로 미리 닫는다.
 */
import { readFileSync } from "node:fs";
import { expect, test, type BrowserContextOptions, type Page } from "@playwright/test";

const GUTTER = 20;
const WIDTHS = [390, 768, 1024, 1440] as const;

type StorageState = NonNullable<Exclude<BrowserContextOptions["storageState"], string>>;

/** 로그인하지 않은 상태 — Vercel 우회 쿠키만 남기고 Firebase 인증(origins)은 비운다(nav1 스펙과 같은 방식). */
function signedOutState(): StorageState {
  try {
    const saved = JSON.parse(readFileSync("tests/.auth/user.json", "utf8")) as Partial<StorageState>;
    return { cookies: saved.cookies ?? [], origins: [] };
  } catch {
    return { cookies: [], origins: [] };
  }
}

/** 창 폭 vw 에서 제목이 시작해야 하는 곳. 최대 폭이 여백을 포함하는지(박스 안쪽)에 따라 식이 다르다. */
const centered = (maxW: number) => (vw: number) => Math.max(0, (vw - maxW) / 2);
interface PageCase {
  name: string;
  path: string;
  expectedLeft: (vw: number) => number;
  banner: boolean;
}
const PAGES: PageCase[] = [
  // .pitch-inner 최대 1320 — 여백이 그 안에 있다
  { name: "피치", path: "/", expectedLeft: (vw) => centered(1320)(vw) + GUTTER, banner: true },
  // .page 여백 바깥 · .inner 최대 1320
  { name: "아레나 홈", path: "/arena", expectedLeft: (vw) => Math.max(GUTTER, centered(1320)(vw)), banner: true },
  // .page 여백 바깥 · .inner 최대 970
  { name: "Record Room", path: "/records", expectedLeft: (vw) => Math.max(GUTTER, centered(970)(vw)), banner: true },
  { name: "Locker Room", path: "/account", expectedLeft: (vw) => Math.max(GUTTER, centered(970)(vw)), banner: true },
  // .lp-inner 최대 800 — 여백이 그 안에 있다
  { name: "사전등록", path: "/launch", expectedLeft: (vw) => centered(800)(vw) + GUTTER, banner: true },
  // .listWrap · 기사 지면 최대 760 — 여백이 그 안에 있다
  { name: "뉴스 목록", path: "/news", expectedLeft: (vw) => centered(760)(vw) + GUTTER, banner: false },
];

async function open(page: Page, baseURL: string | undefined, path: string) {
  const savedAt = Date.now() - 24 * 60 * 60 * 1000;
  await page.context().addCookies([
    { name: "wc48_consent", value: `1.0.${savedAt}`, url: baseURL ?? "http://localhost:3000" },
  ]);
  await page.goto(`${path}${path.includes("?") ? "&" : "?"}lang=ko`, { waitUntil: "load" });
  await expect(page.locator("h1").first()).toBeVisible({ timeout: 15000 });
}

async function measure(page: Page) {
  return page.evaluate(() => {
    const vw = document.documentElement.clientWidth;
    const h = document.querySelector("h1")!.getBoundingClientRect();
    const strips = [...document.querySelectorAll<HTMLElement>("aside[data-banner-variant]")]
      .filter((a) => a.dataset.bannerVariant !== "rect")
      .map((a) => a.getBoundingClientRect())
      .filter((r) => r.width > 0)
      .map((r) => `${Math.round(r.width)}x${Math.round(r.height)}`);
    return { h1Left: Math.round(h.left), overflow: document.documentElement.scrollWidth > vw, strips };
  });
}

test.use({ storageState: signedOutState() });

for (const pc of PAGES) {
  for (const w of WIDTHS) {
    test(`${pc.name} ${w} — 제목 시작 = 여백 20(최대 폭 가운데 정렬 반영) · 가로 넘침 없음`, async ({ page, baseURL }) => {
      await page.setViewportSize({ width: w, height: w === 390 ? 844 : 900 });
      await open(page, baseURL, pc.path);
      const m = await measure(page);
      const expected = Math.round(pc.expectedLeft(w));
      expect(Math.abs(m.h1Left - expected), `${pc.name} ${w}: h1 왼쪽 ${m.h1Left} ≈ ${expected}`).toBeLessThanOrEqual(1);
      expect(m.overflow, "가로 넘침").toBe(false);
      if (pc.banner && w === 768) expect(m.strips[0], `${pc.name} 768 배너`).toBe("728x90");
    });
  }
}

test("뉴스 기사 390 · 768 — 지면 안쪽 여백도 20", async ({ page, baseURL }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await open(page, baseURL, "/news");
  const href = await page.locator('a[href^="/news/"]').first().getAttribute("href");
  test.skip(!href, "공개 기사가 없다");
  for (const w of [390, 768]) {
    await page.setViewportSize({ width: w, height: 900 });
    await open(page, baseURL, href!.split("?")[0]);
    const m = await measure(page);
    const expected = Math.round(Math.max(0, (w - 760) / 2) + GUTTER);
    expect(Math.abs(m.h1Left - expected), `기사 ${w}: h1 왼쪽 ${m.h1Left} ≈ ${expected}`).toBeLessThanOrEqual(1);
    expect(m.overflow, "가로 넘침").toBe(false);
  }
});
