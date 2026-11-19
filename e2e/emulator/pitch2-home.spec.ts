/**
 * PITCH-2 PR A — The Pitch(홈) E2E (지시서 v1.1a §11.2 PR A ①~⑩ · 추가 지시 ① 4절 · 에뮬레이터 · `?lang=` 고정).
 * ⑪(쿠키 없는 창 → /launch)은 커튼 판(e2e/curtain-1.spec.ts)에 한 줄로 있다.
 *
 * 시드 = K-POP 8 · CREATOR 1(그림 대회 imgT1 포함) + 숨김 1 + 마감 1 ·
 * 차트 캐시(10판 이상) · 공개 기사 4 + 조회 칸 · config/pitch 홍보 영상 id.
 * 시드에 `e2e: true` 를 달지 않는다 — 이 판의 빌드는 배포 환경이 production 으로 읽혀 공개 목록이 시험 대회를 뺀다
 * (D-66 그대로 동작). 에뮬레이터(demo-wc48)는 따로 떨어진 시험 전용 DB 라 실서비스에 닿지 않는다(다른 에뮬레이터 시험과 같음).
 */
import { Timestamp } from "firebase-admin/firestore";
import { expect, test, type Page } from "@playwright/test";
import {
  collectConsoleErrors,
  db,
  expectNoConsoleErrors,
  expectNoForbiddenWords,
  resetEmulators,
  seedImageTournament,
  stubYouTubeImages,
} from "./helpers";
import { LAUNCH_AT_MS } from "../../lib/launch/launchAt";

const DAY = 86_400_000;
const KPOP = ["kp1", "kp2", "kp3", "kp4", "kp5", "kp6", "kp7"];

async function seedTournament(id: string, o: { category?: string; status?: string; deadlineMs?: number; createdMs: number; title?: string }) {
  await db()
    .collection("tournaments")
    .doc(id)
    .set({
      title: o.title ?? `시험 대회 ${id}`,
      titleI18n: { ko: o.title ?? `시험 대회 ${id}`, en: `Test ${id}`, es: `Prueba ${id}` },
      description: { ko: "", en: "", es: "" },
      category: o.category ?? "KPOP",
      status: o.status ?? "active",
      hostUid: "e2e-admin",
      tournamentDeadline: Timestamp.fromMillis(o.deadlineMs ?? Date.now() + 7 * DAY),
      totalContestants: 48,
      createdAt: Timestamp.fromMillis(o.createdMs),
    });
}

async function seedCache(id: string, runsTotal: number, names: string[], generatedMs: number) {
  await db()
    .collection("ranking_cache")
    .doc(id)
    .set({
      runsTotal,
      generatedAt: Timestamp.fromMillis(generatedMs),
      rankings: names.map((name, i) => ({ rank: i + 1, contestantId: `${id}-c${i}`, name, videoId: null, score: 900 - i * 50 })),
    });
}

async function seedArticle(slug: string, title: string, publishedMs: number, tournamentId: string | null) {
  await db()
    .collection("news")
    .doc(slug)
    .set({
      slug,
      status: "published",
      template: "column",
      origin: "manual_ai",
      title: { ko: title, en: title, es: title },
      subhead: { ko: `${title} 요약`, en: "", es: "" },
      body: { ko: [{ type: "lead", text: "본문" }], en: [], es: [] },
      evidence: { asOf: "", stats: [] },
      tournamentId,
      createdAt: Timestamp.fromMillis(publishedMs),
      publishedAt: Timestamp.fromMillis(publishedMs),
    });
}

test.beforeEach(async ({ page }) => {
  await resetEmulators();
  const now = Date.now();
  for (const [id, order] of [["KPOP", 1], ["CREATOR", 2]] as const) {
    await db().collection("categories").doc(id).set({ name: { ko: id === "KPOP" ? "K-POP" : "CREATOR", en: id === "KPOP" ? "K-POP" : "CREATOR", es: id === "KPOP" ? "K-POP" : "CREATOR" }, status: "live", phase: 1, order });
  }
  await seedImageTournament("imgT1"); // KPOP · 그림 대회 · 대표 매치 = 엔트리 1 · 2
  await db().collection("tournaments").doc("imgT1").update({ createdAt: Timestamp.fromMillis(now - 10 * 60_000) });
  for (const [i, id] of KPOP.entries()) await seedTournament(id, { createdMs: now - (i + 1) * 3_600_000 });
  await seedTournament("cr1", { category: "CREATOR", createdMs: now - 30 * 60_000 });
  await seedTournament("hiddenT", { status: "hidden", createdMs: now, title: "숨김 시험 대회" });
  await seedTournament("endedT", { deadlineMs: now - 60_000, createdMs: now - 20 * DAY, title: "마감 시험 대회" });
  // 판 수: imgT1 30 > kp5 20 > 나머지 0 — 히어로 순서(홍보 → imgT1 → kp5 → 최신 발행순)
  await seedCache("imgT1", 30, ["엔트리01", "엔트리02", "엔트리03", "엔트리04", "엔트리05"], now - 2 * 3_600_000);
  await seedCache("kp5", 20, ["가", "나", "다"], now - 3_600_000);
  await seedCache("endedT", 15, ["마감1", "마감2", "마감3"], now - DAY);
  await db().collection("config").doc("pitch").set({ promoVideoId: "PROMOvid001" });
  await seedArticle("20261119-new001", "새 기사 하나", now - 60_000, "imgT1");
  await seedArticle("20261119-new002", "크리에이터 기사", now - 120_000, "cr1");
  await seedArticle("20261118-old001", "어제 기사", now - DAY, null);
  await seedArticle("20261110-old002", "오래된 인기 기사", now - 9 * DAY, "kp1");
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(new Date(now)).replace(/-/g, "");
  await db().collection("news_views").doc("20261110-old002").set({ total: 50, [`d${today}`]: 9 });
  await stubYouTubeImages(page);
});

const heroSlideIds = (page: Page) =>
  page.getByTestId("pitch-hero").locator("[data-testid^='pitch-hero-slide-'], [data-testid='pitch-hero-promo']").evaluateAll((els) =>
    els.map((e) => (e.getAttribute("data-testid") ?? "").replace("pitch-hero-slide-", "")),
  );

test("① 홈 → K-POP 탭 → 카드 → /arena?t= · ⑧ 그림 표지 · ⑩ 숨김·마감 대회 없음 · ⑤ 배너 ②③ · ⑥ 바닥 띠 · WORLD PRESS 기사 없음", async ({ page }) => {
  const errors = collectConsoleErrors(page);
  await page.goto("/?lang=ko");

  // 히어로 = 홍보 1 + 판 수 많은 순 4(imgT1 30 · kp5 20 · 그다음 최신 발행순 cr1 · kp1)
  await expect.poll(() => heroSlideIds(page), { timeout: 30_000 }).toEqual(["pitch-hero-promo", "imgT1", "kp5", "cr1", "kp1"]);
  // ⑧ 이미지 대회 — 히어로 장과 카드에 그림 표지(600 사본)
  await expect(page.getByTestId("hero-cover-imgT1").getByTestId("vsthumb-a-img")).toHaveAttribute("src", /imgT1%2F0_600\.jpg/, { timeout: 30_000 });
  await expect(page.getByTestId("tcard-cover-imgT1").getByTestId("vsthumb-a-img")).toHaveAttribute("src", /imgT1%2F0_600\.jpg/);
  // 홍보 장 — 런칭 전에는 /launch
  await expect(page.getByTestId("pitch-hero-promo")).toHaveAttribute("href", "/launch");
  await expect(page.getByTestId("pitch-hero-promo")).toContainText("48개의 엔트리, 하나의 Crown — 당신의 선택이 무대를 정합니다");

  // ⑩ 숨김 · 마감 대회는 히어로 · Trending 에 없다(마감 대회는 CHARTS 에는 있을 수 있다)
  for (const id of ["hiddenT", "endedT"]) {
    await expect(page.getByTestId(`pitch-hero-slide-${id}`)).toHaveCount(0);
    await expect(page.getByTestId("pitch-trending").getByTestId(`tcard-cover-${id}`)).toHaveCount(0);
  }
  await expect(page.getByTestId("pitch-trending").getByText("숨김 시험 대회")).toHaveCount(0);

  // 오른쪽 칸 — 차트 1줄(가장 최근 발표 = imgT1? kp5 가 더 최근) · 뉴스 3줄(누적 조회 많은 순 → 오래된 인기 기사 먼저)
  await expect(page.getByTestId("pitch-side-chart")).toHaveAttribute("href", "/arena/kp5/ranking");
  await expect(page.getByTestId("pitch-side-news-item").first()).toContainText("오래된 인기 기사");

  // NEWS ROOM — LATEST 최신 3 · HOT 첫 줄 = 오늘 조회가 있는 기사 · WORLD PRESS = 기사 없음 모양
  await expect(page.getByTestId("pitch-news-col-latest").getByTestId("pitch-news-latest-item").first()).toContainText("새 기사 하나");
  await expect(page.getByTestId("pitch-news-col-hot").getByTestId("pitch-news-hot-item").first()).toContainText("오래된 인기 기사");
  const press = page.getByTestId("pitch-news-col-press-empty");
  await expect(press).toContainText("NO ARTICLES");
  await expect(press).toContainText("아직 올라온 기사가 없어요");
  await expect(press).toContainText("첫 기사가 올라오면 여기에서 바로 보여 드릴게요");

  // CHARTS — 큰 차트 = 판 수 가장 많은 imgT1 · 2×2 에 마감 대회도(챔피언 있음)
  await expect(page.getByTestId("pitch-chart-main")).toHaveAttribute("href", "/arena/imgT1/ranking");
  await expect(page.getByTestId("pitch-chart-grid").locator("a[href='/arena/endedT/ranking']")).toHaveCount(1);
  await expect(page.getByText(/\b\d{3}\b점|Crown Score \d/)).toHaveCount(0); // 수치 없음

  // ⑤ 배너 ② · ③ 기본 공지(① 은 런칭 전 사전등록 안내)
  await expect(page.locator("[data-banner-slot='pitch-between']")).toContainText("사전등록에 참가하세요!");
  await expect(page.locator("[data-banner-slot='pitch-news-below']")).toContainText("대회를 마치면 크라운 카드가 생겨요");
  await expect(page.locator("[data-banner-slot='pitch-charts-below']")).toContainText("멈춘 선택을 이어서 하려면 로그인하셔야 합니다.");

  // ⑥ 공용 바닥 띠 — 누르는 항목 5개 + © 줄
  await expect(page.getByTestId("footer-band").locator("> *")).toHaveCount(5);
  await expect(page.getByTestId("footer-community-link")).toHaveText("커뮤니티 가이드");
  await expect(page.getByTestId("footer-copyright")).toHaveText("© 2026 WorldCrown48");

  // TIOZ.AI 띠는 꺼져 있다 · 견본 문자열 0 · 금지 낱말 0
  await expect(page.getByTestId("pitch-tioz-band")).toHaveCount(0);
  await expect(page.getByText(/Reuters|ESPN/)).toHaveCount(0);
  await expectNoForbiddenWords(page);
  await page.screenshot({ path: "test-results-emulator/pitch2-home-1440.png", fullPage: true });

  // ① K-POP 탭 → 카드 → 대기실
  await page.getByTestId("pitch-trending-tab-kpop").click();
  await expect(page).toHaveURL(/\?cat=kpop/);
  await expect(page.getByTestId("pitch-trending").getByTestId("tcard-cover-cr1")).toHaveCount(0);
  const card = page.getByTestId("pitch-trending").locator("a.tcard").first();
  await expect(card).toHaveAttribute("href", /^\/arena\?t=/);
  await card.click();
  await expect(page).toHaveURL(/\/arena\?t=/);
  await expectNoConsoleErrors(errors);
});

test("② Trending 2쪽 넘김 — 6장/쪽 · 주소 ?page=2", async ({ page }) => {
  await page.goto("/?lang=ko");
  const grid = page.getByTestId("pitch-trending-grid");
  await expect(grid.locator("a.tcard")).toHaveCount(6, { timeout: 30_000 });
  await page.getByTestId("pitch-trending-page-2").click();
  await expect(page).toHaveURL(/\?page=2/);
  await expect(grid.locator("a.tcard")).toHaveCount(3); // 9 = 6 + 3
  await page.reload();
  await expect(grid.locator("a.tcard")).toHaveCount(3, { timeout: 30_000 });
});

test("③ 히어로 10초 자동 넘김 · 마우스 올리면 멈춤(시계 모킹)", async ({ page }) => {
  await page.clock.install();
  await page.goto("/?lang=ko");
  const hero = page.getByTestId("pitch-hero");
  await expect.poll(() => heroSlideIds(page), { timeout: 30_000 }).toHaveLength(5);
  await expect(hero).toHaveAttribute("data-slide", "0");
  await page.clock.fastForward(10_000);
  await expect(hero).toHaveAttribute("data-slide", "1");
  await hero.hover();
  await expect(hero).toHaveAttribute("data-hover", "true");
  await expect(page.getByTestId("pitch-hero-next")).toHaveCSS("opacity", "1");
  await page.clock.fastForward(30_000);
  await expect(hero).toHaveAttribute("data-slide", "1");
  await page.mouse.move(5, 5);
  await page.clock.fastForward(10_000);
  await expect(hero).toHaveAttribute("data-slide", "2");
});

test("④ 390 — 오른쪽 칸이 히어로 아래 · CHARTS 1열 4줄(그림 80)", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const errors = collectConsoleErrors(page);
  await page.goto("/?lang=ko");
  const hero = await page.getByTestId("pitch-hero").boundingBox();
  await expect(page.getByTestId("pitch-side-chart")).toBeVisible({ timeout: 30_000 });
  const side = await page.getByTestId("pitch-hero-side").boundingBox();
  expect(side!.y).toBeGreaterThanOrEqual(hero!.y + hero!.height);
  const smalls = page.getByTestId("pitch-chart-small");
  await expect(smalls.first()).toBeVisible();
  const xs = await smalls.evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().left)));
  expect(new Set(xs).size).toBe(1);
  const img = await smalls.first().locator(".chart-small-img").boundingBox();
  expect([Math.round(img!.width), Math.round(img!.height)]).toEqual([80, 80]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBe(0);
  await page.screenshot({ path: "test-results-emulator/pitch2-home-390.png", fullPage: true });
  await expectNoConsoleErrors(errors);
});

test("⑤ 배너 ① 런칭 뒤(시각 모킹) — 사전등록 안내가 기본 공지로 돌아간다", async ({ page }) => {
  await page.clock.setFixedTime(LAUNCH_AT_MS + 3_600_000);
  await page.goto("/?lang=ko");
  const slot = page.locator("[data-banner-slot='pitch-between']");
  await expect(slot).toBeVisible({ timeout: 30_000 });
  await expect(slot.locator("a[href='/launch']")).toHaveCount(0);
  await expect(page.getByTestId("pitch-hero-promo")).toHaveAttribute("href", /youtube\.com\/watch\?v=PROMOvid001/);
  await expect(page.getByTestId("pitch-hero-promo")).toHaveAttribute("target", "_blank");
});

test("⑦ 3언어 — 열 머리글은 영어 그대로 · 콘솔 오류 0", async ({ page }) => {
  for (const lang of ["ko", "en", "es"]) {
    const errors = collectConsoleErrors(page);
    await page.goto(`/?lang=${lang}`);
    const newsroom = page.getByTestId("pitch-newsroom");
    await expect(newsroom.getByText("LATEST", { exact: true })).toBeVisible({ timeout: 30_000 });
    await expect(newsroom.getByText("HOT", { exact: true })).toBeVisible();
    await expect(newsroom.getByText("WORLD PRESS", { exact: true })).toBeVisible();
    await expect(page.getByText(/ÚLTIMAS|TENDENCIA|PRENSA MUNDIAL/)).toHaveCount(0);
    await expect(page.getByText(/Reuters|ESPN/)).toHaveCount(0);
    await expectNoForbiddenWords(page);
    await expectNoConsoleErrors(errors);
  }
});

test("⑨ 대표 매치 엔트리를 내리면 표지가 앞 번호 엔트리로 바뀐다(D-35 · D-93)", async ({ page }) => {
  await page.goto("/?lang=ko");
  const heroA = page.getByTestId("hero-cover-imgT1").getByTestId("vsthumb-a-img");
  const cardA = page.getByTestId("tcard-cover-imgT1").getByTestId("vsthumb-a-img");
  await expect(heroA).toHaveAttribute("src", /imgT1%2F0_600\.jpg/, { timeout: 30_000 });
  const at = Date.now();
  await db().collection("contestants").doc("imgT1c0").update({ "media.takedown": { at } });
  await db().collection("tournaments").doc("imgT1").update({ mediaTakedownAt: at });
  for (const a of [heroA, cardA]) {
    await expect(a).not.toHaveAttribute("src", /imgT1%2F0_600\.jpg/, { timeout: 60_000 });
    await expect(a).toHaveAttribute("src", /imgT1%2F\d+_600\.jpg/);
  }
});
