/**
 * IMAGE-1 PR 1 — §11.2 E2E ③(무대 1440 · 390) · ④(피치 VS 표지 · 차트 아바타 · 크라운 카드) (에뮬레이터).
 *
 * 그림 엔트리 48개짜리 발행된 대회를 시드로 둔다(출처 news.example.com). 그림 파일은 대회 경로에 실제로
 * 올린다. 크라운 카드는 진짜 onChampionConfirmed 트리거(함수 에뮬레이터)가 굽고, 그 PNG 의 사진 칸
 * 픽셀이 그림 색인지 본다.
 */
import { createRequire } from "node:module";
import { join } from "node:path";
import { mkdirSync } from "node:fs";
import { expect, test } from "@playwright/test";
import * as admin from "firebase-admin";
import {
  ADMIN_UID,
  adminApp,
  collectConsoleErrors,
  db,
  expectNoConsoleErrors,
  expectNoForbiddenWords,
  resetEmulators,
  seedCategories,
  seedImageTournament,
  signInAsAdmin,
} from "./helpers";

const EVIDENCE = join(__dirname, "..", "..", "outputs", "image-1-pr1-evidence");
mkdirSync(EVIDENCE, { recursive: true });
const shot = (name: string) => join(EVIDENCE, name);

test.beforeEach(async () => {
  await resetEmulators();
  await seedCategories();
});

for (const width of [1440, 390] as const) {
  test(`③ 무대 ${width} — 정지 그림 · 재생기 없음 · 출처 도메인 글자(링크 아님)`, async ({ page }) => {
    const { id } = await seedImageTournament();
    await page.setViewportSize({ width, height: width === 390 ? 844 : 900 });
    const errors = collectConsoleErrors(page);
    await page.goto(`/arena/${id}?lang=ko`);
    const stills = page.getByTestId("stage-still");
    await expect(stills.first()).toBeVisible({ timeout: 30_000 });
    await expect(stills).toHaveCount(2);
    await expect(stills.first()).toHaveAttribute("src", /127\.0\.0\.1:9199.*entry-images%2Ftournaments%2FimgT1/);
    // 처음 들어오면 안내 창이 뜬다 — 팬처럼 [시작]을 누른다.
    const intro = page.getByTestId("arena-intro");
    if (await intro.isVisible()) await page.getByTestId("arena-intro-start").click();
    await expect(intro).toHaveCount(0);
    // 눌러도(포커스) 재생기는 생기지 않는다
    await page.getByTestId("stage-box-L").click();
    await expect(page.getByTestId("stage-player")).toHaveCount(0);
    const source = page.getByTestId("stage-source");
    await expect(source).toHaveCount(2);
    await expect(source.first()).toHaveText("출처: news.example.com");
    expect(await source.first().evaluate((el) => el.closest("a") === null && !el.hasAttribute("href"))).toBe(true);
    await expectNoForbiddenWords(page);
    await page.screenshot({ path: shot(`stage-${width}.png`) });
    await expectNoConsoleErrors(errors);
  });
}

test("④ 피치 VS 표지 · 차트 아바타 · 크라운 카드(서버 PNG + 화면)에 그 그림", async ({ page }) => {
  test.setTimeout(180_000);
  const { id, contestantIds } = await seedImageTournament();

  // 피치 VS 표지
  const errors = collectConsoleErrors(page);
  await page.goto("/?lang=ko");
  const coverA = page.getByTestId("vsthumb-a-img").first();
  await expect(coverA).toBeVisible({ timeout: 30_000 });
  await expect(coverA).toHaveAttribute("src", /127\.0\.0\.1:9199.*imgT1%2F0_600\.jpg/);
  await expect(page.getByTestId("vsthumb-b-img").first()).toHaveAttribute("src", /imgT1%2F1_600\.jpg/);
  await page.screenshot({ path: shot("pitch-cover-1440.png") });

  // 차트 아바타 — 캐시는 시험이 서버 집계와 같은 모양으로 쓴다(그림 엔트리 = imageUrl)
  const row = (i: number, score: number) => ({
    rank: i + 1,
    contestantId: contestantIds[i],
    name: `엔트리${String(i + 1).padStart(2, "0")}`,
    videoId: null,
    imageUrl: `http://127.0.0.1:9199/v0/b/demo-wc48.appspot.com/o/${encodeURIComponent(`entry-images/tournaments/${id}/${i}_600.jpg`)}?alt=media`,
    voteCount: 10 - i,
    rate: 50,
    crownScore: score,
    placementRate: 0.5,
    winRate: 0.5,
    shareRate: 0.5,
  });
  await db().collection("ranking_cache").doc(id).set({
    tournamentId: id,
    rankings: [row(0, 800), row(1, 600)],
    totalVotes: 19,
    generationSequence: 0,
    runsTotal: 20,
    generatedAt: admin.firestore.Timestamp.now(),
    previousGeneratedAt: null,
  });
  await page.goto(`/arena/${id}/ranking?lang=ko`);
  const avatar = page.getByTestId("rank-row").first().locator(".rank-av img");
  await expect(avatar).toHaveAttribute("src", /imgT1%2F0_600\.jpg/, { timeout: 30_000 });
  await page.screenshot({ path: shot("chart-avatar-1440.png") });
  await expectNoConsoleErrors(errors);

  // 크라운 카드 — 관리자로 들어가 1회차 결승을 마친 진행 문서를 둔다 → 트리거가 카드를 굽는다
  await page.goto("/admin/lab?lang=ko");
  await signInAsAdmin(page);
  await expect(page.getByLabel("Tournament 제목")).toBeVisible();
  const progressId = `${ADMIN_UID}_${id}`;
  const progressRef = db().collection("roundProgress").doc(progressId);
  await progressRef.set({ userId: ADMIN_UID, tournamentId: id, runIndex: 1, complete: false, championId: null });
  await progressRef.update({ complete: true, championId: contestantIds[0] });

  let cardPath = "";
  await expect
    .poll(async () => {
      const snap = await db().collection("crown_cards").where("voterUid", "==", ADMIN_UID).get();
      const url = snap.docs[0]?.get("imageUrl") as string | undefined;
      if (url) cardPath = decodeURIComponent(url.split("/o/")[1].split("?")[0]);
      return Boolean(url);
    }, { timeout: 60_000 })
    .toBe(true);
  const [png] = await adminApp().storage().bucket().file(cardPath).download();
  const requireFn = createRequire(join(__dirname, "..", "..", "functions", "package.json"));
  const { createCanvas, loadImage } = requireFn("canvas");
  const img = await loadImage(png);
  const c = createCanvas(img.width, img.height);
  const ctx = c.getContext("2d");
  ctx.drawImage(img, 0, 0);
  // 사진 칸 왼쪽 위 안쪽(글자 없는 단색 자리) — 시험 그림 01 은 hsl(37,70%,45%) ≈ (195,130,34).
  // 사진이 없으면 이 자리는 짙은 남색 그라데이션(r < 100)이다.
  const [r, , b] = Array.from(ctx.getImageData(100, 100, 1, 1).data as Uint8ClampedArray);
  expect(r).toBeGreaterThan(150);
  expect(b).toBeLessThan(90);
  const { writeFileSync } = await import("node:fs");
  writeFileSync(shot("crown-card-server-1200x630.png"), png);

  // 화면의 카드 창에도 그 그림
  const cardErrors = collectConsoleErrors(page);
  await page.goto(`/arena/${id}/champion?run=1&lang=ko`);
  const photo = page.getByTestId("crown-card-photo");
  await expect(photo).toBeVisible({ timeout: 30_000 });
  await expect(photo).toHaveAttribute("src", /imgT1%2F0\.jpg/);
  await page.screenshot({ path: shot("crown-card-1440.png") });
  await expectNoForbiddenWords(page);
  await expectNoConsoleErrors(cardErrors);
});
