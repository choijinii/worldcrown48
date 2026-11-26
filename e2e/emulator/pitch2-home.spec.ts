/**
 * PITCH-2 PR A — The Pitch(홈) E2E (지시서 v1.1a §11.2 PR A ①~⑩ · 추가 지시 ① 4절 · 에뮬레이터 · `?lang=` 고정).
 * ⑪(쿠키 없는 창 → /launch)은 커튼 판(e2e/curtain-1.spec.ts)에 한 줄로 있다.
 *
 * 시드 = K-POP 8 · CREATOR 1(그림 대회 imgT1 포함) + 숨김 1 + 마감 1 ·
 * 차트 캐시(10판 이상) · 공개 기사 4 + 조회 칸 · config/pitch 홍보 장(Storage `pitch/promo/` 의 시험 영상 mp4 +
 * 정지 그림 — 추가 지시 ②). 시험 영상 = e2e/fixtures/pitch-promo/promo.mp4(2초 · 9KB · 브라우저 녹화로 만든 VP9 mp4 —
 * Playwright 크로미움은 H.264 를 못 튼다).
 * 시드에 `e2e: true` 를 달지 않는다 — 이 판의 빌드는 배포 환경이 production 으로 읽혀 공개 목록이 시험 대회를 뺀다
 * (D-66 그대로 동작). 에뮬레이터(demo-wc48)는 따로 떨어진 시험 전용 DB 라 실서비스에 닿지 않는다(다른 에뮬레이터 시험과 같음).
 */
import { Timestamp } from "firebase-admin/firestore";
import { expect, test, type Page } from "@playwright/test";
import {
  adminApp,
  collectConsoleErrors,
  db,
  expectNoConsoleErrors,
  expectNoForbiddenWords,
  resetEmulators,
  seedImageTournament,
  storageUrl,
  stubYouTubeImages,
} from "./helpers";
import { readFileSync } from "node:fs";
import path from "node:path";
import { LAUNCH_AT_MS } from "../../lib/launch/launchAt";

const DAY = 86_400_000;
const PROMO_VIDEO = "pitch/promo/launch.mp4";
const PROMO_POSTER = "pitch/promo/launch.jpg";
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
  for (let i = 0; i < KPOP.length; i++) await seedTournament(KPOP[i], { createdMs: now - (i + 1) * 3_600_000 });
  await seedTournament("cr1", { category: "CREATOR", createdMs: now - 30 * 60_000 });
  await seedTournament("hiddenT", { status: "hidden", createdMs: now, title: "숨김 시험 대회" });
  await seedTournament("endedT", { deadlineMs: now - 60_000, createdMs: now - 20 * DAY, title: "마감 시험 대회" });
  // 판 수: imgT1 30 > kp5 20 > 나머지 0 — 히어로 순서(홍보 → imgT1 → kp5 → 최신 발행순)
  await seedCache("imgT1", 30, ["엔트리01", "엔트리02", "엔트리03", "엔트리04", "엔트리05"], now - 2 * 3_600_000);
  await seedCache("kp5", 20, ["가", "나", "다"], now - 3_600_000);
  await seedCache("endedT", 15, ["마감1", "마감2", "마감3"], now - DAY);
  // 최신 발행 = kp7(판 수 0) — 히어로 둘째 장이 되고, 뒤 3장(판 수 많은 순)에는 다시 나오지 않는다.
  await db().collection("tournaments").doc("kp7").update({ createdAt: Timestamp.fromMillis(now - 60_000) });
  const bucket = adminApp().storage().bucket();
  await bucket.file(PROMO_VIDEO).save(readFileSync(path.join(__dirname, "../fixtures/pitch-promo/promo.mp4")), { contentType: "video/mp4", resumable: false });
  await bucket.file(PROMO_POSTER).save(readFileSync(path.join(__dirname, "../fixtures/entry-images/01.jpg")), { contentType: "image/jpeg", resumable: false });
  await db().collection("config").doc("pitch").set({ promoVideoUrl: storageUrl(PROMO_VIDEO), promoPosterUrl: storageUrl(PROMO_POSTER) });
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

  // 히어로 = 홍보 1 → 최신 1(kp7 · 판 수 0) → 판 수 많은 순 3(imgT1 30 · kp5 20 · 그다음 최신 발행순 cr1) — kp7 은 뒤 3장에 없다
  await expect.poll(() => heroSlideIds(page), { timeout: 30_000 }).toEqual(["pitch-hero-promo", "kp7", "imgT1", "kp5", "cr1"]);
  // ⑧ 이미지 대회 — 히어로 장과 카드에 그림 표지(600 사본)
  await expect(page.getByTestId("hero-cover-imgT1").getByTestId("vsthumb-a-img")).toHaveAttribute("src", /imgT1%2F0_600\.jpg/, { timeout: 30_000 });
  await expect(page.getByTestId("tcard-cover-imgT1").getByTestId("vsthumb-a-img")).toHaveAttribute("src", /imgT1%2F0_600\.jpg/);
  // 홍보 장 — 장 전체 = 같은 탭 /arena · 얹힌 글자는 "WORLDCROWN48 · FILM" 하나뿐(추가 지시 ② 7절)
  const promo = page.getByTestId("pitch-hero-promo");
  await expect(promo).toHaveAttribute("href", "/arena");
  await expect(promo).not.toHaveAttribute("target", /.+/);
  await expect(promo).toHaveAttribute("aria-label", "WorldCrown48");
  expect((await promo.innerText()).trim()).toBe("WORLDCROWN48 · FILM");
  // 대회 장 — 카테고리 칩 + 제목 · 버튼 없음 · 장 전체 = 대기실(대표 2026-11-19 시안 P-1 대조 — 빼는 것은 버튼뿐)
  const kp7 = page.getByTestId("pitch-hero-slide-kp7");
  await expect(kp7).toHaveAttribute("href", "/arena?t=kp7");
  // 표지(VS 그림) 위에 얹힌 글자 칸 = 칩 + 제목 둘
  await expect(kp7.locator(".hero-cap > *")).toHaveCount(2);
  await expect(page.getByTestId("pitch-hero-chip-kp7")).toHaveText("K-POP");
  await expect(page.getByTestId("pitch-hero-chip-cr1")).toHaveText("CREATOR");
  await expect(kp7).toHaveAttribute("aria-label", (await kp7.locator(".hero-title").innerText()).trim());
  // 장 안에는 버튼 · 겹친 링크가 없다(화살표 · 점은 장 밖)
  await expect(page.getByTestId("pitch-hero").locator(".hero-track").locator("button, a a, .hero-cta")).toHaveCount(0);
  await expect(page.getByTestId("pitch-hero").getByText("참가하기")).toHaveCount(0);
  // 히어로 안에 youtube 주소 0 · 페이지에 /launch 링크 0(배너 ① 의 사전등록 안내만 예외)
  expect(await page.getByTestId("pitch-hero").evaluate((el) => (el.innerHTML.match(/youtu/gi) ?? []).length)).toBe(0);
  expect(await page.locator("a[href^='/launch']").evaluateAll((els) => els.filter((e) => !e.closest("[data-banner-slot='pitch-between']")).length)).toBe(0);
  // 시안 영어 글자(3언어 공통) — 오른쪽 칸 머리 · 큰 차트 그림 위
  await expect(page.getByTestId("pitch-hero-side").getByText("CROWN SCORE", { exact: true })).toBeVisible();
  await expect(page.getByTestId("pitch-hero-side").getByText("NEWSROOM", { exact: true })).toBeVisible();
  await expect(page.getByTestId("pitch-chart-main").getByText("CROWN SCORE", { exact: true })).toBeVisible();

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
  // 작은 차트 2개 → 2×2 의 남는 두 칸은 흰색(회색 바탕이 비치지 않는다 · 대표 2026-11-21)
  await expect(page.getByTestId("pitch-chart-small")).toHaveCount(2);
  await expect(page.getByTestId("pitch-chart-grid")).toHaveCSS("background-color", "rgb(255, 255, 255)");
  await page.locator(".pitch .charts-box").screenshot({ path: "test-results-emulator/pitch2-charts-two-1440.png" });

  // ⑤ 배너 ② · ③ 기본 공지(① 은 런칭 전 사전등록 안내)
  // 시드가 실제 지금 시각 기준이라 시계를 돌리지 않는다 — 실제 날짜가 코드의 런칭 시각을 지났으면 ① 도 기본 공지(⑤ 시험과 같음).
  if (Date.now() < LAUNCH_AT_MS) {
    await expect(page.locator("[data-banner-slot='pitch-between']")).toContainText("사전등록에 참가하세요!");
  } else {
    await expect(page.locator("[data-banner-slot='pitch-between'] a[href='/launch']")).toHaveCount(0);
  }
  await expect(page.locator("[data-banner-slot='pitch-news-below']")).toContainText("대회를 마치면 크라운 카드가 생겨요");
  await expect(page.locator("[data-banner-slot='pitch-charts-below']")).toContainText("멈춘 선택을 이어서 하려면 로그인하셔야 합니다. — 매치 안 어디서든 멈춘 매치부터 다시");

  // ⑥ 공용 바닥 띠 — 누르는 항목 5개 + © 줄
  await expect(page.getByTestId("footer-band").locator("> *")).toHaveCount(5);
  await expect(page.getByTestId("footer-community-link")).toHaveText("커뮤니티 가이드");
  await expect(page.getByTestId("footer-copyright")).toHaveText("© 2026 WorldCrown48");

  // 견본 문자열 0 · 금지 낱말 0 (TIOZ.AI 띠는 런칭 시각에 따라 달라서 아래 TIOZ-BAND-ON 시험이 시각을 고정해 본다)
  await expect(page.getByText(/Reuters|ESPN/)).toHaveCount(0);
  await expectNoForbiddenWords(page);
  await page.screenshot({ path: "test-results-emulator/pitch2-home-1440.png", fullPage: true });

  // 홈 카드에는 "48 Contestants · 마감" 줄이 없다 — 표지 바로 아래 참가하기(편집기 미리보기에만 남는다 · 대표 2026-11-21).
  const firstCard = page.getByTestId("pitch-trending").locator("a.tcard").first();
  await expect(page.getByTestId("pitch-trending").locator("a.tcard").getByText(/Contestants|마감/)).toHaveCount(0);
  const coverBox = await firstCard.locator(".tcard-cover").boundingBox();
  const enterBox = await firstCard.locator(".tcard-enter").boundingBox();
  expect(enterBox!.y - (coverBox!.y + coverBox!.height), "표지 아래 → 참가하기 사이(px)").toBeLessThanOrEqual(8);

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

test("⑰ CHARTS — 오른쪽 작은 차트 0개면 큰 차트가 가로 전체 · 빈 회색 칸 없음 (대표 2026-11-21)", async ({ page }) => {
  // 작은 차트 3개 → 2×2 의 남는 한 칸이 흰색이다(회색 바탕이 비치지 않는다).
  await seedCache("kp1", 12, ["하나", "둘", "셋"], Date.now() - 5 * 60_000);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/?lang=ko");
  await expect(page.getByTestId("pitch-chart-small")).toHaveCount(3, { timeout: 30_000 });
  await expect(page.getByTestId("pitch-chart-grid")).toHaveCSS("background-color", "rgb(255, 255, 255)");
  await page.getByTestId("pitch-chart-grid").scrollIntoViewIfNeeded();
  await page.locator(".pitch .charts-box").screenshot({ path: "test-results-emulator/pitch2-charts-three-1440.png" });
  await db().collection("ranking_cache").doc("kp1").delete();

  // 큰 차트(imgT1)만 남기고 나머지 차트를 지운다.
  await db().collection("ranking_cache").doc("kp5").delete();
  await db().collection("ranking_cache").doc("endedT").delete();
  for (const w of [1440, 390]) {
    await page.setViewportSize({ width: w, height: 900 });
    await page.goto("/?lang=ko");
    const main = page.getByTestId("pitch-chart-main");
    await expect(main).toHaveAttribute("href", "/arena/imgT1/ranking", { timeout: 30_000 });
    await expect(page.getByTestId("pitch-chart-grid")).toHaveCount(0);
    const box = await page.locator(".pitch .charts-box").boundingBox();
    const mb = await main.boundingBox();
    expect(Math.abs(mb!.width - (box!.width - 2)), `${w}: 큰 차트 폭 = 상자 폭`).toBeLessThanOrEqual(1);
    await expect(main).toHaveCSS("border-right-width", "0px");
    await main.scrollIntoViewIfNeeded();
    await page.locator(".pitch .charts-box").screenshot({ path: `test-results-emulator/pitch2-charts-solo-${w}.png` });
  }
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
  // 홍보 장은 런칭 전후 같다 — 같은 탭 /arena
  await expect(page.getByTestId("pitch-hero-promo")).toHaveAttribute("href", "/arena");
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

test("⑫ 홍보 장 — 1440 음소거 · 자동 · 반복 영상 · 누르면 /arena · 390 은 영상 없이 정지 그림 (추가 지시 ②)", async ({ page }) => {
  const errors = collectConsoleErrors(page);
  await page.goto("/?lang=ko");
  const promo = page.getByTestId("pitch-hero-promo");
  const video = page.getByTestId("pitch-hero-promo-video");
  await expect(video).toHaveCount(1, { timeout: 30_000 });
  await expect(promo).toHaveAttribute("data-promo-mode", "video");
  await expect(video).toHaveAttribute("src", /pitch%2Fpromo%2Flaunch\.mp4/);
  await expect(video).toHaveAttribute("loop", "");
  await expect(video).toHaveAttribute("playsinline", "");
  await expect(video).not.toHaveAttribute("controls", /.*/);
  await expect
    .poll(() => video.evaluate((v: HTMLVideoElement) => ({ muted: v.muted, paused: v.paused, moved: v.currentTime > 0, loop: v.loop })), { timeout: 20_000 })
    .toEqual({ muted: true, paused: false, moved: true, loop: true });
  // 다른 장으로 넘어가면 멈춘다
  await page.getByTestId("pitch-hero").hover();
  await page.getByTestId("pitch-hero-next").click();
  await expect.poll(() => video.evaluate((v: HTMLVideoElement) => v.paused)).toBe(true);
  await page.getByTestId("pitch-hero-prev").click();
  await expect.poll(() => video.evaluate((v: HTMLVideoElement) => v.paused)).toBe(false);
  await page.screenshot({ path: "test-results-emulator/pitch2-promo-1440.png" });
  await promo.click();
  await expect(page).toHaveURL(/\/arena$/);
  await expectNoConsoleErrors(errors);
});

test("⑫ 홍보 장 — 390 은 영상을 불러오지 않고 정지 그림만", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const errors = collectConsoleErrors(page);
  await page.goto("/?lang=ko");
  const promo = page.getByTestId("pitch-hero-promo");
  await expect(page.getByTestId("pitch-hero-promo-poster")).toHaveAttribute("src", /pitch%2Fpromo%2Flaunch\.jpg/, { timeout: 30_000 });
  await expect(promo).toHaveAttribute("data-promo-mode", "still");
  await expect(page.locator("video")).toHaveCount(0);
  await page.waitForTimeout(1500);
  await expect(page.locator("video")).toHaveCount(0);
  await expectNoConsoleErrors(errors);
});

test("⑫ 홍보 장 — 움직임 줄이기 설정이면 영상 없이 정지 그림", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/?lang=ko");
  await expect(page.getByTestId("pitch-hero-promo-poster")).toBeVisible({ timeout: 30_000 });
  await page.waitForTimeout(1000);
  await expect(page.locator("video")).toHaveCount(0);
});

test("⑬ 이어서 하기 알약 — 메뉴바 안 언어 토글 바로 앞 · 옛 자리 없음 · 화면마다 메뉴바 높이·언어 토글 자리 그대로", async ({ page, context }) => {
  const errors = collectConsoleErrors(page);
  const pages = ["/?lang=ko", "/arena?lang=ko", "/arena/kp1?lang=ko", "/arena/imgT1/ranking?lang=ko", "/arena/imgT1/champion?lang=ko", "/news/20261119-new001?lang=ko", "/policies/privacy?lang=ko"];
  const measure = () =>
    page.evaluate(() => {
      const r = (s: string) => document.querySelector(s)?.getBoundingClientRect() ?? null;
      const bar = r(".wc-nav-bar");
      const lang = r("[data-testid='lang-toggle']");
      return { barH: bar ? Math.round(bar.height) : null, langX: lang ? Math.round(lang.left) : null, langY: lang ? Math.round(lang.top) : null };
    });
  const before: Record<string, unknown> = {};
  for (const u of pages) {
    await page.goto(u);
    await expect(page.locator(".wc-nav-bar")).toBeVisible({ timeout: 30_000 });
    await page.waitForTimeout(300);
    before[u] = await measure();
  }
  // 메모 = 다른 대회(kp2) — 위 어느 화면에서도 알약이 보인다
  await context.addInitScript(() => localStorage.setItem("wc48:continue:v1", JSON.stringify({ tournamentId: "kp2", at: Date.now() })));
  for (const u of pages) {
    await page.goto(u);
    const pill = page.getByTestId("continue-pill");
    await expect(pill).toBeVisible({ timeout: 30_000 });
    // 메뉴바 안 · 언어 토글 바로 앞(다음 형제)
    expect(await pill.evaluate((el) => Boolean(el.closest("header.wc-nav .wc-nav-actions")))).toBe(true);
    expect(
      await pill.evaluate((el) => {
        const wrap = el.closest(".wc-pill-wrap");
        return wrap?.nextElementSibling?.getAttribute("data-testid") === "lang-toggle" ? "ok" : "no";
      }),
    ).toBe("ok");
    await expect(page.locator(".wc-pill-layer")).toHaveCount(0);
    expect(await measure(), u).toEqual(before[u]);
    const pb = await pill.boundingBox();
    const lb = await page.getByTestId("lang-toggle").boundingBox();
    expect(pb!.x + pb!.width).toBeLessThanOrEqual(lb!.x);
  }
  // 홈 제목 줄에는 GLOBAL FAN ARENA 만
  await page.goto("/?lang=ko");
  await expect(page.locator(".title-row")).toHaveText("GLOBAL FAN ARENA");
  await page.screenshot({ path: "test-results-emulator/pitch2-pill-1440.png", clip: { x: 0, y: 0, width: 1440, height: 120 } });
  await expectNoConsoleErrors(errors);
});

// ── 추가 지시 ② 7절(대표 2026-11-19 12:16) — 장 전체가 링크 · 화살표와 점은 따로 · 휴대폰 밀기 = 넘기기 ──
test("⑭ 대회 장을 누르면 대기실 · 화살표와 점은 장만 넘기고 이동하지 않음 · 손가락 모양 · Tab → Enter", async ({ page }) => {
  const errors = collectConsoleErrors(page);
  await page.clock.install();
  await page.goto("/?lang=ko");
  const hero = page.getByTestId("pitch-hero");
  await expect.poll(() => heroSlideIds(page), { timeout: 30_000 }).toHaveLength(5);
  await hero.hover();
  await page.getByTestId("pitch-hero-next").click();
  await expect(hero).toHaveAttribute("data-slide", "1");
  await page.getByTestId("pitch-hero-dots").locator(".hero-dot").nth(3).click();
  await expect(hero).toHaveAttribute("data-slide", "3");
  await page.getByTestId("pitch-hero-prev").click();
  await expect(hero).toHaveAttribute("data-slide", "2");
  await expect(page).toHaveURL(/\/\?lang=ko$/);
  const slide = page.getByTestId("pitch-hero-slide-imgT1");
  await expect(slide).toHaveCSS("cursor", "pointer");
  await page.screenshot({ path: "test-results-emulator/pitch2-hero-tournament-1440.png" });
  await page.clock.runFor(700); // 넘김 600ms 가 끝난 뒤
  await page.waitForTimeout(700);
  const box = (await hero.boundingBox())!;
  await page.mouse.click(box.x + box.width * 0.3, box.y + box.height * 0.4);
  await expect(page).toHaveURL(/\/arena\?t=imgT1$/);

  // 키보드 — Tab 으로 첫 장 링크에 닿고 Enter 로 열린다
  await page.goto("/?lang=ko");
  const promo = page.getByTestId("pitch-hero-promo");
  await expect(promo).toBeVisible({ timeout: 30_000 });
  let reached = false;
  for (let i = 0; i < 40 && !reached; i++) {
    await page.keyboard.press("Tab");
    reached = await promo.evaluate((el) => el === document.activeElement);
  }
  expect(reached).toBe(true);
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/arena$/);
  await expectNoConsoleErrors(errors);
});

test.describe("⑭ 390 터치", () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

  const swipe = async (page: Page, fromX: number, toX: number, y: number) => {
    const cdp = await page.context().newCDPSession(page);
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: fromX, y }] });
    const steps = 6;
    for (let i = 1; i <= steps; i++) {
      await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: fromX + ((toX - fromX) * i) / steps, y }] });
    }
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await cdp.detach();
  };

  test("옆으로 밀면 장 넘기기(이동 없음) · 조금 밀다 떼도 이동 없음 · 가만히 누르면 이동", async ({ page }) => {
    await page.goto("/?lang=ko");
    const hero = page.getByTestId("pitch-hero");
    await expect.poll(() => heroSlideIds(page), { timeout: 30_000 }).toHaveLength(5);
    const b = (await hero.boundingBox())!;
    const y = b.y + b.height / 2;
    await swipe(page, b.x + b.width * 0.8, b.x + b.width * 0.2, y);
    await expect(hero).toHaveAttribute("data-slide", "1");
    await swipe(page, b.x + b.width * 0.2, b.x + b.width * 0.8, y);
    await expect(hero).toHaveAttribute("data-slide", "0");
    // 넘길 만큼 안 밀고 뗌 — 장도 그대로 · 이동도 없음
    await swipe(page, b.x + b.width * 0.5, b.x + b.width * 0.5 - 22, y);
    await page.waitForTimeout(800);
    await expect(hero).toHaveAttribute("data-slide", "0");
    await expect(page).toHaveURL(/\/\?lang=ko$/);
    await page.touchscreen.tap(b.x + b.width * 0.5, y);
    await expect(page).toHaveURL(/\/arena$/);
  });
});

// ── 시안 P-1 대조(대표 2026-11-19) — 탭 알약 · 390 제목과 점 · 오른쪽 뉴스 위 정렬 ──
test("⑮ 홈 탭 = 둥근 알약 · 고른 탭 진한 남색 · 오른쪽 뉴스 1건은 위에 붙는다", async ({ page }) => {
  // 기사 1건만 남긴다
  for (const slug of ["20261119-new002", "20261118-old001", "20261110-old002"]) await db().collection("news").doc(slug).delete();
  await page.goto("/?lang=ko");
  const tabs = page.getByTestId("pitch-trending-tabs");
  await expect(tabs).toBeVisible({ timeout: 30_000 });
  const all = page.getByTestId("pitch-trending-tab-all");
  const kpop = page.getByTestId("pitch-trending-tab-kpop");
  await expect(all).toHaveCSS("border-radius", "999px");
  await expect(all).toHaveCSS("height", "32px");
  await expect(all).toHaveCSS("background-color", "rgb(14, 9, 68)"); // --color-text-light
  await expect(all).toHaveCSS("color", "rgb(255, 255, 255)");
  await expect(kpop).toHaveCSS("background-color", "rgb(255, 255, 255)");
  // 뉴스 1건 — NEWSROOM 머리 바로 아래(가운데로 내려가지 않음)
  const item = page.getByTestId("pitch-side-news-item");
  await expect(item).toHaveCount(1, { timeout: 30_000 });
  const head = (await page.getByTestId("pitch-hero-side").locator(".side-head-news").boundingBox())!;
  const first = (await item.boundingBox())!;
  expect(first.y - (head.y + head.height)).toBeLessThan(24);
  await page.screenshot({ path: "test-results-emulator/pitch2-tabs-news1-1440.png", clip: { x: 0, y: 0, width: 1440, height: 1100 } });
});

test("⑮ 아레나 홈 탭 모양은 그대로(네모 · 고른 탭 금색)", async ({ page }) => {
  await page.goto("/arena?lang=ko");
  const tab = page.getByTestId("arena-tab-all");
  await expect(tab).toBeVisible({ timeout: 30_000 });
  await expect(tab).not.toHaveCSS("border-radius", "999px");
  await expect(tab).toHaveCSS("background-color", "rgb(252, 208, 6)");
});

test.describe("⑮ 390 제목 둘째 줄과 점", () => {
  test.use({ viewport: { width: 390, height: 844 } });
  test("긴 제목 두 줄도 아래 점과 겹치지 않는다", async ({ page }) => {
    await db().collection("tournaments").doc("kp7").update({
      title: "아주 긴 제목 — 2026년 가장 다시 보고 싶은 무대를 고르는 시험 대회 제목 줄바꿈 확인",
      "titleI18n.ko": "아주 긴 제목 — 2026년 가장 다시 보고 싶은 무대를 고르는 시험 대회 제목 줄바꿈 확인",
    });
    await page.goto("/?lang=ko");
    const hero = page.getByTestId("pitch-hero");
    await expect.poll(() => heroSlideIds(page), { timeout: 30_000 }).toHaveLength(5);
    await page.getByTestId("pitch-hero-dots").locator(".hero-dot").nth(1).click();
    await expect(hero).toHaveAttribute("data-slide", "1");
    await page.waitForTimeout(800);
    const title = (await page.getByTestId("pitch-hero-slide-kp7").locator(".hero-title").boundingBox())!;
    const dots = (await page.getByTestId("pitch-hero-dots").boundingBox())!;
    expect(title.height).toBeGreaterThan(20); // 두 줄
    const overlapX = title.x + title.width > dots.x && dots.x + dots.width > title.x;
    const overlapY = title.y + title.height > dots.y && dots.y + dots.height > title.y;
    expect(overlapX && overlapY).toBe(false);
    await hero.screenshot({ path: "test-results-emulator/pitch2-hero-390-long-title.png" });
  });
});

// ── 시안 P-1 대조 2차(대표 2026-11-19) — 구역 제목 · 내용 폭 1320 · 바닥 띠 © 줄 ──
test("⑯ 구역 제목 News Room · Charts(머리글 · 작은 표시는 대문자) · 1440 내용 폭 1320 · 바닥 띠 © 줄", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/?lang=ko");
  await expect(page.getByTestId("pitch-hero-side")).toBeVisible({ timeout: 30_000 });
  const titles = await page.locator(".sec-title").allInnerTexts();
  expect(titles).toEqual(["Trending Tournaments", "News Room", "Charts"]);
  await expect(page.getByTestId("pitch-news-col-press-empty")).toBeVisible();
  for (const head of ["LATEST", "HOT", "WORLD PRESS"]) await expect(page.getByText(head, { exact: true }).first()).toBeVisible();
  await expect(page.getByTestId("pitch-hero-side").getByText("NEWSROOM", { exact: true })).toBeVisible();
  // 내용 폭 = 1320(히어로 줄 왼쪽 끝 ~ 오른쪽 칸 오른쪽 끝) · 좌우 60
  const hero = (await page.getByTestId("pitch-hero").boundingBox())!;
  const side = (await page.getByTestId("pitch-hero-side").boundingBox())!;
  expect(Math.round(hero.x)).toBe(60);
  expect(Math.round(side.x + side.width - hero.x)).toBe(1320);
  // 390 은 좌우 20 그대로
  await page.setViewportSize({ width: 390, height: 844 });
  const hero390 = (await page.getByTestId("pitch-hero").boundingBox())!;
  expect(Math.round(hero390.x)).toBe(20);
  expect(Math.round(hero390.width)).toBe(350);
  // 바닥 띠 — © 줄이 보이는 자리에 있다
  await page.setViewportSize({ width: 1440, height: 900 });
  const copy = page.getByTestId("footer-copyright");
  await copy.scrollIntoViewIfNeeded();
  await expect(copy).toBeVisible();
  await expect(copy).toHaveText("© 2026 WorldCrown48");
  const band = (await page.getByTestId("footer-band").boundingBox())!;
  const c = (await copy.boundingBox())!;
  expect(c.y).toBeGreaterThanOrEqual(band.y + band.height - 1);
  await page.screenshot({ path: "test-results-emulator/pitch2-footer-1440.png", clip: { x: 0, y: Math.max(0, c.y - 260), width: 1440, height: 320 } });
});

// ── TIOZ-BAND-ON (대표 2026-11-24) — 런칭 뒤 = 띠 · 링크 없음 · 히어로 바로 아래 · Trending 위 / 런칭 전 = 없음 ──
// v1.1(대표 2026-11-26): 띠 안 = 그림 띠(검정 + 에메랄드 · 로고 · 슬로건) · 폰(480px 이하) = 폰 그림 · 못 불러오면 글자 띠.
const BAND_SHOTS = "outputs/pitch-2-evidence/tioz-band";

async function expectBandBetweenHeroAndTrending(page: Page): Promise<void> {
  const band = page.getByTestId("pitch-tioz-band");
  await expect(band).toBeVisible({ timeout: 30_000 });
  await expect(band.getByRole("img", { name: "TIOZ.AI — Truth In Opinion Zeitgeist" })).toBeVisible();
  await expect(band.locator("a")).toHaveCount(0);
  await expect(page.getByText("OPEN", { exact: false })).toHaveCount(0);
  // DOM 순서: 히어로 줄(오른쪽 칸 포함) 바로 다음 · Trending 바로 앞
  expect(await band.evaluate((el) => el.previousElementSibling?.className)).toBe("hero-row");
  expect(await band.evaluate((el) => el.nextElementSibling?.id)).toBe("trending");
  // 화면 위치: 히어로 · 오른쪽 칸 둘 다의 아래 · Trending 의 위
  const b = (await band.boundingBox())!;
  const hero = (await page.getByTestId("pitch-hero").boundingBox())!;
  const side = (await page.getByTestId("pitch-hero-side").boundingBox())!;
  const tr = (await page.getByTestId("pitch-trending").boundingBox())!;
  expect(b.y).toBeGreaterThanOrEqual(Math.max(hero.y + hero.height, side.y + side.height) - 1);
  expect(tr.y).toBeGreaterThanOrEqual(b.y + b.height - 1);
  // 누를 곳이 아니다 — 손 모양 커서 아님
  expect(await band.evaluate((el) => getComputedStyle(el).cursor)).not.toBe("pointer");
  expect(await band.locator("img").evaluate((el) => getComputedStyle(el).cursor)).not.toBe("pointer");
}

for (const w of [1440, 768, 390] as const) {
  test(`TIOZ-BAND-ON ${w} — 런칭 뒤 그림 띠가 실제로 그려짐 · 높이 그대로 · 눌러도 주소 그대로`, async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await page.setViewportSize({ width: w, height: 900 });
    await page.clock.setFixedTime(LAUNCH_AT_MS + 3_600_000);
    await page.goto("/?lang=ko");
    await expectBandBetweenHeroAndTrending(page);
    const band = page.getByTestId("pitch-tioz-band");
    const img = page.getByTestId("pitch-tioz-band-img");
    await expect(band).toHaveAttribute("data-band", "image");
    // 그림이 실제로 그려졌다 · 폭에 맞는 그림(480px 이하 = 폰 그림)
    await expect.poll(() => img.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth > 0), { timeout: 15_000 }).toBe(true);
    const src = await img.evaluate((el: HTMLImageElement) => el.currentSrc);
    expect(src).toContain(w === 390 ? "tioz-band-mobile@2x" : "tioz-band-desktop@2x");
    const natural = await img.evaluate((el: HTMLImageElement) => [el.naturalWidth, el.naturalHeight]);
    expect(natural).toEqual(w === 390 ? [700, 112] : [2640, 144]);
    // 띠 크기는 v1.0 그대로(1440 · 768 = 72 / 390 = 56) · 그림이 띠를 꽉 채운다
    const bandBox = (await band.boundingBox())!;
    const imgBox = (await img.boundingBox())!;
    expect(Math.round(bandBox.height)).toBe(w === 390 ? 56 : 72);
    expect(Math.abs(imgBox.height - (bandBox.height - 2))).toBeLessThanOrEqual(1);
    expect(Math.abs(imgBox.width - (bandBox.width - 2))).toBeLessThanOrEqual(1);
    // 로고 · 슬로건(그림 가운데 — PC 그림 1400px · 폰 그림 700px 폭을 화면 크기로 줄인 만큼)이 잘리지 않을 폭
    const contentWidth = w === 390 ? (700 * (bandBox.height - 2)) / 112 : (1400 * (bandBox.height - 2)) / 144;
    expect(imgBox.width, `띠 폭 ${imgBox.width} < 로고·슬로건 폭 ${contentWidth}`).toBeGreaterThanOrEqual(contentWidth - 1);
    // 아래쪽 동의 바(고정)에 가리지 않게 띠를 화면 위쪽으로 올려 찍는다
    await page.evaluate((y) => window.scrollTo(0, y), Math.max(0, bandBox.y - 220));
    await page.screenshot({ path: `${BAND_SHOTS}/tioz-band-${w}.png` });
    const before = page.url();
    await band.click();
    await page.waitForTimeout(500);
    expect(page.url()).toBe(before);
    expect(page.context().pages()).toHaveLength(1);
    // 시계는 브라우저만 "런칭 뒤"로 돌린다 — 서버는 실제 시각(런칭 12/10 전)으로 그려서, 화면을 이어붙일 때 React 가
    // "서버와 다르다"(#418 · #423)를 남긴다. 실서비스에서는 서버와 브라우저가 같은 시각이라 생기지 않는다 → 그 둘만 뺀다.
    await expectNoConsoleErrors(errors.filter((e) => !/Minified React error #(418|423)/.test(e)));
  });
}

test("TIOZ-BAND-ON 1440 — 그림을 못 불러오면 v1.0 글자 띠(TIOZ.AI)가 그 자리에 남는다", async ({ page }) => {
  await page.route("**/pitch/tioz/**", (r) => r.abort());
  await page.clock.setFixedTime(LAUNCH_AT_MS + 3_600_000);
  await page.goto("/?lang=ko");
  const band = page.getByTestId("pitch-tioz-band");
  await expect(band).toHaveAttribute("data-band", "text", { timeout: 30_000 });
  await expect(band).toHaveText("TIOZ.AI");
  expect(Math.round((await band.boundingBox())!.height)).toBe(72);
});

test("TIOZ-BAND-ON 1440 — 런칭 전(커튼) 시각이면 띠 없음", async ({ page }) => {
  await page.clock.setFixedTime(LAUNCH_AT_MS - 3_600_000);
  await page.goto("/?lang=ko");
  await expect(page.getByTestId("pitch-trending")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId("pitch-tioz-band")).toHaveCount(0);
  await expect(page.getByText("TIOZ.AI", { exact: true })).toHaveCount(0);
  await page.screenshot({ path: `${BAND_SHOTS}/tioz-band-prelaunch-1440.png`, clip: { x: 0, y: 0, width: 1440, height: 1100 }, fullPage: true });
});

test("TIOZ-BAND-ON 390 — 런칭 전(커튼) 시각이면 띠 없음", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.clock.setFixedTime(LAUNCH_AT_MS - 3_600_000);
  await page.goto("/?lang=ko");
  await expect(page.getByTestId("pitch-trending")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId("pitch-tioz-band")).toHaveCount(0);
});
