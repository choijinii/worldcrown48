/**
 * IMAGE-1 PR 3 — 내리기 스위치 · 그림 확인 창 · 영상 대회 크라운 카드 썸네일 (지시서 §11 E2E ①~⑤ · 에뮬레이터).
 *
 *   ① 이미지 대회 [그림 내리기] → 60초 안에 매치 무대(진행 중인 판) · 피치 VS 표지 · 차트 아바타 · 크라운 카드 화면 ·
 *      카드 공유 그림(서버 PNG)에서 이니셜 · 걸린 초를 증거 파일에 적는다 · 진행 중이던 판은 끝까지 간다
 *   ② 영상 대회 [영상 내리기] → 무대 재생 없음 · 썸네일 네 곳 이니셜
 *   ③ 편집기 그림 확인 창 — 배지 · 도메인 글자 둘 다 · 링크 두 개 주소 · 파일 칸은 버튼 숨김 · [새 이미지 찾기]는 그 칸만
 *   ④ 영상 대회 크라운 카드 = 유튜브 썸네일 · 썸네일 실패 땐 이니셜
 *   ⑤ 매치 무대에 "내리기 요청" 글자 없음
 *
 * 바깥 사이트는 부르지 않는다: 유튜브 포스터 = page.route 시험 그림 · 서버 카드 썸네일 = 가짜 서버(9312 · YT_THUMB_BASE) ·
 * 이미지 검색 = 가짜 Brave(9311 · BRAVE_API_BASE).
 */
import { createRequire } from "node:module";
import { createServer, type Server } from "node:http";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import * as admin from "firebase-admin";
import { expect, test, type Browser, type Page } from "@playwright/test";
import {
  ADMIN_UID,
  DRAFT_TITLE,
  FIXTURE_48,
  adminApp,
  collectConsoleErrors,
  db,
  dismissConsent,
  expectNoConsoleErrors,
  fixture,
  resetEmulators,
  seedCategories,
  seedDraft,
  seedImageTournament,
  seedVideoTournament,
  signInAsAdmin,
  storageUrl,
  stubAiCallables,
  stubYouTubeImages,
  stubYouTubePlayer,
  videoIdAt,
} from "./helpers";

const EVIDENCE = join(__dirname, "..", "..", "outputs", "image-1-pr3-evidence");
mkdirSync(EVIDENCE, { recursive: true });
const shot = (name: string) => join(EVIDENCE, name);

const THUMB_PORT = 9312;
const BRAVE_PORT = 9311;
const BRAVE = `http://127.0.0.1:${BRAVE_PORT}`;
let thumbServer: Server;
let braveServer: Server;
let thumbCalls = 0;

test.beforeAll(async () => {
  // 가짜 유튜브 썸네일 — "fail…" 영상은 404(썸네일 실패 → 이니셜), 나머지는 시험 그림 01.
  thumbServer = createServer((req, res) => {
    thumbCalls++;
    const m = /^\/vi\/([A-Za-z0-9_-]{11})\/[a-z0-9]+\.jpg/.exec(req.url ?? "");
    if (!m || m[1].startsWith("fail")) {
      res.writeHead(404);
      res.end();
      return;
    }
    const body = readFileSync(FIXTURE_48[0]);
    res.writeHead(200, { "Content-Type": "image/jpeg", "Content-Length": body.length });
    res.end(body);
  });
  await new Promise<void>((r) => thumbServer.listen(THUMB_PORT, "127.0.0.1", () => r()));
  // 가짜 Brave — [새 이미지 찾기]가 부른다. 그림 05 를 돌려준다.
  braveServer = createServer((req, res) => {
    const u = new URL(req.url ?? "/", BRAVE);
    if (u.pathname === "/res/v1/images/search") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          type: "images",
          results: [{ title: "엔트리01 profile", url: `${BRAVE}/page/05`, properties: { url: `${BRAVE}/img/05.jpg`, height: 1200 } }],
        }),
      );
      return;
    }
    if (u.pathname.startsWith("/img/")) {
      const body = readFileSync(fixture(u.pathname.slice(5)));
      res.writeHead(200, { "Content-Type": "image/jpeg", "Content-Length": body.length });
      res.end(body);
      return;
    }
    res.writeHead(404);
    res.end();
  });
  await new Promise<void>((r) => braveServer.listen(BRAVE_PORT, "127.0.0.1", () => r()));
});

test.afterAll(async () => {
  console.log(`[PR3] 가짜 유튜브 썸네일 요청 ${thumbCalls}번 (진짜 유튜브 0번)`);
  for (const s of [thumbServer, braveServer]) {
    await new Promise<void>((r) => {
      s.closeAllConnections();
      s.close(() => r());
    });
  }
});

test.beforeEach(async () => {
  await resetEmulators();
  await seedCategories();
});

// ── 공용 ─────────────────────────────────────────────────────────────────────

async function pngPixel(path: string, x = 100, y = 100): Promise<number[]> {
  const [png] = await adminApp().storage().bucket().file(path).download();
  const requireFn = createRequire(join(__dirname, "..", "..", "functions", "package.json"));
  const { createCanvas, loadImage } = requireFn("canvas");
  const img = await loadImage(png);
  const c = createCanvas(img.width, img.height);
  const ctx = c.getContext("2d");
  ctx.drawImage(img, 0, 0);
  return Array.from(ctx.getImageData(x, y, 1, 1).data as Uint8ClampedArray);
}

/**
 * 사진 칸 왼쪽 위(글자 없는 자리). 시험 그림은 엔트리마다 색이 다르지만 모두 hsl(?, 70%, 45%) — 한 채널이 ≈195 다.
 * 사진이 없으면(이니셜) 짙은 남색 그라데이션(#362261 → #241754)이라 모든 채널이 130 아래다.
 */
const looksLikePhoto = ([r, g, b]: number[]) => Math.max(r, g, b) > 170;
const looksLikeInitial = ([r, g, b]: number[]) => Math.max(r, g, b) < 130;

async function waitCard(voter: string, tournamentId: string, runIndex = 1): Promise<{ path: string; url: string }> {
  const id = runIndex === 1 ? `${voter}_${tournamentId}` : `${voter}_${tournamentId}_r${runIndex}`;
  let url = "";
  await expect
    .poll(async () => {
      url = ((await db().collection("crown_cards").doc(id).get()).get("imageUrl") as string | undefined) ?? "";
      return Boolean(url);
    }, { timeout: 60_000 })
    .toBe(true);
  return { path: decodeURIComponent(url.split("/o/")[1].split("?")[0]), url };
}

/** 관리자 결승 완주를 진행 문서로 둔다 → 진짜 onChampionConfirmed 트리거가 카드를 굽는다. */
async function completeRunFor(voter: string, tournamentId: string, championId: string, runIndex = 1) {
  const pid = runIndex === 1 ? `${voter}_${tournamentId}` : `${voter}_${tournamentId}_r${runIndex}`;
  const ref = db().collection("roundProgress").doc(pid);
  await ref.set({ userId: voter, tournamentId, runIndex, complete: false, championId: null });
  await ref.update({ complete: true, championId });
}

async function seedChart(tournamentId: string, contestantId: string, kind: "image" | "video", n: number) {
  await db().collection("ranking_cache").doc(tournamentId).set({
    tournamentId,
    rankings: [
      {
        rank: 1,
        contestantId,
        name: `엔트리${String(n).padStart(2, "0")}`,
        videoId: kind === "video" ? videoIdAt(n - 1) : null,
        ...(kind === "image" ? { imageUrl: storageUrl(`entry-images/tournaments/${tournamentId}/${n - 1}_600.jpg`) } : {}),
        crownScore: 800,
        placementRate: 0.5,
        winRate: 0.5,
        shareRate: 0.5,
      },
    ],
    generationSequence: 0,
    runsTotal: 20,
    generatedAt: admin.firestore.Timestamp.now(),
    previousGeneratedAt: null,
  });
}

async function newPage(browser: Browser): Promise<Page> {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const p = await ctx.newPage();
  await stubYouTubeImages(p);
  await stubYouTubePlayer(p);
  return p;
}

/** 팬(게스트)이 무대에 들어가 첫 매치까지. 왼쪽 엔트리의 번호를 돌려준다. */
async function enterStage(fan: Page, tournamentId: string): Promise<number> {
  await fan.goto(`/arena/${tournamentId}?lang=ko`);
  await dismissConsent(fan);
  await expect(fan.getByTestId("vote-left")).toBeVisible({ timeout: 30_000 });
  const intro = fan.getByTestId("arena-intro");
  if (await intro.isVisible()) await fan.getByTestId("arena-intro-start").click();
  await expect(intro).toHaveCount(0);
  const name = (await fan.getByTestId("vote-left").innerText()).trim();
  return Number(/엔트리(\d+)/.exec(name)?.[1]);
}

/** 그 엔트리가 무대 어느 쪽에 있는지(없으면 null). */
async function sideOf(fan: Page, label: string): Promise<"L" | "R" | "M" | null> {
  for (const [side, id] of [["L", "vote-left"], ["R", "vote-right"], ["M", "vote-mid"]] as const) {
    const el = fan.getByTestId(id);
    if ((await el.count()) && (await el.innerText()).includes(label)) return side;
  }
  return null;
}

/**
 * 판을 끝까지 — 내린 엔트리가 보이면 늘 그쪽을 고른다(Champion 이 되도록). 고른 횟수를 돌려준다.
 * onVote 는 한 사람이 1분에 40번까지만 받는다(RATE_LIMIT) — 시험도 사람처럼 1.8초에 한 번만 고른다.
 */
const PICK_GAP_MS = 1800;
async function playToEnd(fan: Page, prefer: string): Promise<number> {
  let picks = 0;
  let lastPick = 0;
  for (let guard = 0; guard < 80; guard++) {
    if (await fan.getByTestId("crown-modal").isVisible()) return picks;
    const advance = fan.getByTestId("round-advance");
    if (await advance.isVisible()) {
      await advance.click();
      continue;
    }
    if (await fan.getByTestId("round-transition").isVisible()) {
      await fan.getByTestId("round-transition").click({ force: true }).catch(() => undefined);
      await fan.waitForTimeout(300);
      continue;
    }
    const left = fan.getByTestId("vote-left");
    if (!(await left.isVisible())) {
      await fan.waitForTimeout(300);
      continue;
    }
    const side = (await sideOf(fan, prefer)) ?? "L";
    const id = side === "L" ? "vote-left" : side === "R" ? "vote-right" : "vote-mid";
    const before = (await left.innerText()).trim();
    const wait = lastPick + PICK_GAP_MS - Date.now();
    if (wait > 0) await fan.waitForTimeout(wait);
    lastPick = Date.now();
    await fan.getByTestId(id).click();
    picks++;
    // 다음 매치(또는 전환 · 완주)가 올 때까지
    await expect
      .poll(async () => {
        if (await fan.getByTestId("crown-modal").isVisible()) return "done";
        if (await fan.getByTestId("round-transition").isVisible()) return "transition";
        const now = (await fan.getByTestId("vote-left").innerText().catch(() => "")).trim();
        return now && now !== before ? "next" : "wait";
      }, { timeout: 30_000 })
      .not.toBe("wait");
  }
  throw new Error("판이 끝나지 않았다");
}

async function openLabList(admin: Page) {
  await stubAiCallables(admin);
  await admin.goto("/admin/lab?lang=ko");
  await signInAsAdmin(admin);
  await dismissConsent(admin);
}

/** Lab 목록에서 [그림 내리기]/[영상 내리기] → n번 줄 → (빈 사유 거절 확인) → 사유 → 실행. 누른 시각(ms)을 돌려준다. */
async function takeDownInLab(lab: Page, tournamentId: string, order: number, buttonText: string, runText: string): Promise<number> {
  const open = lab.getByTestId(`takedown-open-${tournamentId}`);
  await expect(open).toHaveText(buttonText, { timeout: 30_000 });
  await open.click();
  const dialog = lab.getByTestId("takedown-dialog");
  await expect(dialog).toBeVisible();
  await expect(lab.getByTestId(`takedown-row-${order}`)).toBeVisible();
  await lab.getByTestId(`takedown-pick-${order}`).click();
  await expect(lab.getByTestId("takedown-reason")).toHaveAttribute("placeholder", "사유 (예: 소속사 요청 · policy@ 11/27 접수)");
  // 사유를 비우면 문구 11 — 서버를 부르지 않는다
  await lab.getByTestId("takedown-run").click();
  await expect(lab.getByTestId("takedown-reason-error")).toHaveText("간단하게 사유를 적어 주세요.");
  await lab.getByTestId("takedown-reason").fill("소속사 요청 · policy@ 11/27 접수");
  await expect(lab.getByTestId("takedown-run")).toHaveText(runText);
  await dialog.screenshot({ path: shot(`lab-takedown-confirm-${tournamentId}.png`) });
  const t0 = Date.now();
  await lab.getByTestId("takedown-run").click();
  return t0;
}

const secs = (t0: number) => Math.round((Date.now() - t0) / 100) / 10;

// ── ① 이미지 대회 ───────────────────────────────────────────────────────────

test("① 이미지 대회 [그림 내리기] → 60초 안에 무대 · 표지 · 차트 · 카드 화면 · 카드 공유 그림 이니셜 · 판은 끝까지", async ({ browser }) => {
  test.setTimeout(420_000);
  const { id, contestantIds } = await seedImageTournament();
  // 발행 문서와 같은 모양 — 이미지 대회는 대회 종류 칸이 있다(D-90 · 발행 때 씀).
  await db().collection("tournaments").doc(id).update({ mediaKind: "image" });

  // 팬 — 진행 중인 판. 첫 매치 왼쪽 엔트리를 내린다.
  const fan = await newPage(browser);
  const fanErrors = collectConsoleErrors(fan);
  const n = await enterStage(fan, id);
  const target = contestantIds[n - 1];
  const label = `엔트리${String(n).padStart(2, "0")}`;
  await expect(fan.getByTestId("stage-box-L").getByTestId("stage-poster").locator("img")).toHaveAttribute("src", new RegExp(`imgT1%2F${n - 1}\\.jpg`));
  await fan.screenshot({ path: shot("img-stage-before.png") });

  // 표지 A = 그 엔트리 · 차트 1위 = 그 엔트리 · 관리자의 크라운 카드 Champion = 그 엔트리
  const other = contestantIds[n === 1 ? 1 : 0];
  await db().collection("tournaments").doc(id).update({ thumbnailPair: { a: target, b: other, aPos: 50, bPos: 50 } });
  await seedChart(id, target, "image", n);
  await completeRunFor(ADMIN_UID, id, target);
  const card = await waitCard(ADMIN_UID, id);
  expect(looksLikePhoto(await pngPixel(card.path))).toBe(true);

  const viewer = await newPage(browser);
  await viewer.goto("/?lang=ko");
  const coverA = viewer.getByTestId("vsthumb-a-img").first();
  await expect(coverA).toHaveAttribute("src", new RegExp(`imgT1%2F${n - 1}_600\\.jpg`), { timeout: 30_000 });
  const chart = await newPage(browser);
  await chart.goto(`/arena/${id}/ranking?lang=ko`);
  await expect(chart.getByTestId("rank-row").first().locator(".rank-av img")).toHaveCount(1, { timeout: 30_000 });

  const lab = await newPage(browser);
  await openLabList(lab);
  const cardPage = await lab.context().newPage();
  await stubYouTubeImages(cardPage);
  await cardPage.goto(`/arena/${id}/champion?run=1&lang=ko`);
  await expect(cardPage.getByTestId("crown-card-photo")).toBeVisible({ timeout: 30_000 });

  // 내리기
  const t0 = await takeDownInLab(lab, id, n, "그림 내리기", "그림 내리기");
  await expect(lab.getByText(`✓ ‘${label}’의 그림을 내렸어요 · 크라운 카드 1장을 다시 굽고 있어요`)).toBeVisible({ timeout: 30_000 });
  await expect(lab.getByTestId(`takedown-done-${n}`)).toHaveText(/^내림 · \d{4}-\d{2}-\d{2} · 소속사 요청 · policy@ 11\/27 접수$/);
  await lab.getByTestId("takedown-dialog").screenshot({ path: shot("lab-takedown-done-image.png") });

  // 60초 안에 — 곳마다 걸린 초
  const timings: Record<string, number> = {};
  const within = async (name: string, check: () => Promise<void>) => {
    await check();
    timings[name] = secs(t0);
    expect(timings[name]).toBeLessThan(60);
  };
  await within("매치 무대(진행 중인 판)", () => expect(fan.getByTestId("stage-box-L").getByTestId("stage-poster").locator("img")).toHaveCount(0, { timeout: 60_000 }));
  await expect(fan.getByTestId("stage-box-L")).toContainText("엔");
  await within("피치 VS 표지", () => expect(coverA).not.toHaveAttribute("src", new RegExp(`imgT1%2F${n - 1}_600\\.jpg`), { timeout: 60_000 }));
  await within("차트 아바타", () => expect(chart.getByTestId("rank-row").first().locator(".rank-av img")).toHaveCount(0, { timeout: 60_000 }));
  await within("크라운 카드 화면", () => expect(cardPage.getByTestId("crown-card-photo")).toHaveCount(0, { timeout: 60_000 }));
  await within("카드 공유 그림(서버 PNG)", async () => {
    await expect.poll(async () => looksLikeInitial(await pngPixel(card.path)), { timeout: 60_000 }).toBe(true);
  });
  const cardDoc = (await db().collection("crown_cards").doc(`${ADMIN_UID}_${id}`).get()).data()!;
  expect(cardDoc.imageUrl).toMatch(/&v=\d+$/);
  await fan.screenshot({ path: shot("img-stage-after.png") });
  await viewer.screenshot({ path: shot("img-pitch-cover-after.png") });
  await chart.screenshot({ path: shot("img-chart-after.png") });
  await cardPage.screenshot({ path: shot("img-crown-card-after.png") });
  writeFileSync(shot("img-crown-card-server-after.png"), (await adminApp().storage().bucket().file(card.path).download())[0]);

  // Storage: 그 엔트리 두 장 0 · 다른 엔트리 그대로 · 기록
  const [files] = await adminApp().storage().bucket().getFiles({ prefix: `entry-images/tournaments/${id}/` });
  const names = files.map((f) => f.name);
  expect(names).not.toContain(`entry-images/tournaments/${id}/${n - 1}.jpg`);
  expect(names).not.toContain(`entry-images/tournaments/${id}/${n - 1}_600.jpg`);
  expect(names).toHaveLength(94);
  const rec = (await db().collection("entry_takedowns").doc(target).get()).data()!;
  expect(rec).toMatchObject({ reason: "소속사 요청 · policy@ 11/27 접수", byUid: ADMIN_UID, mediaKind: "image", sourcePage: "https://www.news.example.com/article/1" });
  expect(rec.at).toBeInstanceOf(admin.firestore.Timestamp);
  expect(rec.rebake.finishedAt).toBeTruthy();

  // ⑤ 무대에 "내리기 요청" 글자 없음 · 출처 글자는 링크 없이 그대로(다른 칸)
  expect(await fan.locator("body").innerText()).not.toContain("내리기 요청");

  // 진행 중이던 판은 끝까지 — 내린 엔트리를 계속 고른다(이니셜 칸도 고를 수 있다)
  const picks = await playToEnd(fan, label);
  expect(picks).toBe(46); // 24 + 12 + 6 + 3 + 결승 1
  await expect(fan.getByTestId("crown-modal")).toBeVisible();
  await expect(fan.getByTestId("crown-card-photo")).toHaveCount(0); // 내린 엔트리 Champion → 이니셜
  await fan.screenshot({ path: shot("img-fan-run-complete.png") });
  writeFileSync(shot("timings-image.json"), JSON.stringify({ seconds: timings, picksAfterTakedown: picks }, null, 2));
  console.log("[PR3] 이미지 대회 내리기 걸린 초", JSON.stringify(timings));
  await expectNoConsoleErrors(fanErrors);
});

// ── ② · ④ 영상 대회 ──────────────────────────────────────────────────────────

test("②④ 영상 대회 — 새 카드는 유튜브 썸네일(실패는 이니셜) · [영상 내리기] → 무대 재생 없음 · 썸네일 네 곳 이니셜", async ({ browser }) => {
  test.setTimeout(300_000);
  const { id, contestantIds } = await seedVideoTournament();

  // ④ 새 카드 — 0번 영상 Champion = 썸네일 · 47번(썸네일 404) Champion = 이니셜
  await completeRunFor(ADMIN_UID, id, contestantIds[0]);
  const card = await waitCard(ADMIN_UID, id);
  expect(looksLikePhoto(await pngPixel(card.path))).toBe(true);
  await completeRunFor(ADMIN_UID, id, contestantIds[47], 2);
  const failCard = await waitCard(ADMIN_UID, id, 2);
  expect(looksLikeInitial(await pngPixel(failCard.path))).toBe(true);
  writeFileSync(shot("vid-crown-card-server-thumb.png"), (await adminApp().storage().bucket().file(card.path).download())[0]);
  writeFileSync(shot("vid-crown-card-server-fail-initial.png"), (await adminApp().storage().bucket().file(failCard.path).download())[0]);

  const lab = await newPage(browser);
  await openLabList(lab);
  const cardPage = await lab.context().newPage();
  await stubYouTubeImages(cardPage);
  await cardPage.goto(`/arena/${id}/champion?run=1&lang=ko`);
  const photo = cardPage.getByTestId("crown-card-photo");
  await expect(photo).toHaveAttribute("src", new RegExp(`i\\.ytimg\\.com/vi/${videoIdAt(0)}/hq720\\.jpg`), { timeout: 30_000 });
  await cardPage.screenshot({ path: shot("vid-crown-card-thumb.png") });

  // 팬 무대 — 0번 엔트리가 보일 때까지 찾지 않고, 첫 매치 왼쪽을 내린다
  const fan = await newPage(browser);
  const fanErrors = collectConsoleErrors(fan);
  const n = await enterStage(fan, id);
  const target = contestantIds[n - 1];
  await expect(fan.getByTestId("stage-box-L").getByTestId("stage-poster").locator("img")).toHaveAttribute("src", new RegExp(videoIdAt(n - 1)));
  // 표지 · 차트 · 카드(3회차 Champion = 그 엔트리)
  const other = contestantIds[n === 1 ? 1 : 0];
  await db().collection("tournaments").doc(id).update({ thumbnailPair: { a: target, b: other, aPos: 50, bPos: 50 } });
  await seedChart(id, target, "video", n);
  await completeRunFor(ADMIN_UID, id, target, 3);
  const targetCard = await waitCard(ADMIN_UID, id, 3);
  const viewer = await newPage(browser);
  await viewer.goto("/?lang=ko");
  const coverA = viewer.getByTestId("vsthumb-a-img").first();
  await expect(coverA).toHaveAttribute("src", new RegExp(videoIdAt(n - 1)), { timeout: 30_000 });
  const chart = await newPage(browser);
  await chart.goto(`/arena/${id}/ranking?lang=ko`);
  await expect(chart.getByTestId("rank-row").first().locator(".rank-av img")).toHaveCount(1, { timeout: 30_000 });
  const targetCardPage = await lab.context().newPage();
  await stubYouTubeImages(targetCardPage);
  await targetCardPage.goto(`/arena/${id}/champion?run=3&lang=ko`);
  await expect(targetCardPage.getByTestId("crown-card-photo")).toBeVisible({ timeout: 30_000 });

  const label = `엔트리${String(n).padStart(2, "0")}`;
  // 그 엔트리가 Champion 인 카드 = 3회차(+ n 이 1이면 1회차) — 끝 알림의 숫자와 같아야 한다
  const expectedCards = n === 1 ? 2 : 1;
  const labErrors = collectConsoleErrors(lab);
  const t0 = await takeDownInLab(lab, id, n, "영상 내리기", "영상 내리기");
  await expect(lab.getByText(`✓ ‘${label}’의 영상을 내렸어요 · 크라운 카드 ${expectedCards}장을 다시 굽고 있어요`)).toBeVisible({ timeout: 30_000 });
  // 실서비스 걸어 보기(11-16)에서 나온 오류 — 내리는 동안 창 버튼이 모두 잠기면 focus-trap 이 갈 곳을 잃어 예외를 던졌다.
  await expectNoConsoleErrors(labErrors);

  const timings: Record<string, number> = {};
  const within = async (name: string, check: () => Promise<void>) => {
    await check();
    timings[name] = secs(t0);
    expect(timings[name]).toBeLessThan(60);
  };
  await within("매치 무대(진행 중인 판)", () => expect(fan.getByTestId("stage-box-L").getByTestId("stage-poster").locator("img")).toHaveCount(0, { timeout: 60_000 }));
  await within("피치 VS 표지", () => expect(coverA).not.toHaveAttribute("src", new RegExp(videoIdAt(n - 1)), { timeout: 60_000 }));
  await within("차트 아바타", () => expect(chart.getByTestId("rank-row").first().locator(".rank-av img")).toHaveCount(0, { timeout: 60_000 }));
  await within("크라운 카드 화면", () => expect(targetCardPage.getByTestId("crown-card-photo")).toHaveCount(0, { timeout: 60_000 }));
  await within("카드 공유 그림(서버 PNG)", async () => {
    await expect.poll(async () => looksLikeInitial(await pngPixel(targetCard.path)), { timeout: 60_000 }).toBe(true);
  });
  // 무대: 왼쪽 칸에 마우스를 올려도 재생기가 생기지 않는다(영상 정보가 없다)
  await fan.getByTestId("stage-box-L").hover();
  await fan.waitForTimeout(800);
  await expect(fan.getByTestId("stage-box-L").getByTestId("stage-player")).toHaveCount(0);
  await expect(fan.getByTestId("stage-box-L")).toContainText("엔");
  await fan.screenshot({ path: shot("vid-stage-after.png") });
  await viewer.screenshot({ path: shot("vid-pitch-cover-after.png") });
  await chart.screenshot({ path: shot("vid-chart-after.png") });
  await targetCardPage.screenshot({ path: shot("vid-crown-card-after.png") });
  // 다른 엔트리의 카드(1회차 · 0번 Champion)는 그대로 썸네일 — n 이 1이면 같은 엔트리라 건너뛴다
  if (n !== 1) expect(looksLikePhoto(await pngPixel(card.path))).toBe(true);
  expect((await db().collection("contestants").doc(target).get()).get("media")).toEqual({ type: "embed", takedown: { at: expect.any(Number) } });
  expect((await db().collection("entry_takedowns").doc(target).get()).get("videoId")).toBe(videoIdAt(n - 1));
  expect(await fan.locator("body").innerText()).not.toContain("내리기 요청");
  writeFileSync(shot("timings-video.json"), JSON.stringify({ seconds: timings }, null, 2));
  console.log("[PR3] 영상 대회 내리기 걸린 초", JSON.stringify(timings));
  await expectNoConsoleErrors(fanErrors);
});

test("내릴 것이 없는 영상 대회(옛 대회 · 영상 0) — 문구 17영", async ({ page }) => {
  const { id } = await seedVideoTournament("vidEmpty");
  const cs = await db().collection("contestants").where("tournamentId", "==", id).get();
  const batch = db().batch();
  cs.docs.forEach((d) => batch.update(d.ref, { media: admin.firestore.FieldValue.delete() }));
  await batch.commit();
  await openLabList(page);
  await page.getByTestId(`takedown-open-${id}`).click();
  await expect(page.getByTestId("takedown-empty")).toHaveText("이 대회에는 내릴 영상이 없어요.");
  await expect(page.getByTestId("takedown-dialog")).toContainText("영상 내리기 · IMAGE-1 영상 대회");
  await page.getByTestId("takedown-close").click();
  await expect(page.getByTestId("takedown-dialog")).toHaveCount(0);
});

test("내 Tournament 목록 — 버튼이 늘어도 긴 제목은 한 글자씩 쪼개지지 않는다(제목 칸 240px 이상 · 버튼은 아랫줄로)", async ({ page }) => {
  const { id } = await seedVideoTournament("vidLong");
  const long = "현재 Kpop 아티스트중에 가장 뛰어난 퍼포먼스를 보여주는 아티스트는 누구?";
  await db().collection("tournaments").doc(id).update({ title: long, "titleI18n.ko": long });
  await page.setViewportSize({ width: 1440, height: 900 });
  await openLabList(page);
  const row = page.getByTestId(`tournament-row-${id}`);
  await expect(row).toContainText(long);
  const title = row.getByTestId(`tournament-title-${id}`);
  const box = await title.boundingBox();
  expect(box?.width ?? 0, "제목 칸 너비").toBeGreaterThanOrEqual(240);
  await row.scrollIntoViewIfNeeded();
  await row.screenshot({ path: shot("lab-list-long-title-1440.png") });
});

// ── ③ 그림 확인 창 ──────────────────────────────────────────────────────────

test("③ 편집기 그림 확인 창 — 배지 · 도메인 글자 · 출처 페이지 · 원본 그림 · 파일 칸 숨김 · [새 이미지 찾기]는 그 칸만", async ({ page }) => {
  test.setTimeout(180_000);
  const draftId = await seedDraft("e2eDraftPr3", "image");
  const bucket = adminApp().storage().bucket();
  const put = async (slot: number, file: string) => {
    const p = `entry-images/drafts/${ADMIN_UID}/${draftId}/${slot}.jpg`;
    const body = readFileSync(fixture(file));
    await bucket.file(p).save(body, { contentType: "image/jpeg", resumable: false });
    await bucket.file(p.replace(/\.jpg$/, "_600.jpg")).save(body, { contentType: "image/jpeg", resumable: false });
    return { url: storageUrl(p), thumb: storageUrl(p.replace(/\.jpg$/, "_600.jpg")), path: p };
  };
  const a = await put(0, "01.jpg");
  const b = await put(1, "02.jpg");
  const ref = db().collection("tournamentDrafts").doc(draftId);
  const cs = (await ref.get()).get("contestants") as Record<string, unknown>[];
  cs[0] = { ...cs[0], imageUrl: a.url, imageThumbUrl: a.thumb, imageStoragePath: a.path, imageWidth: 1600, imageHeight: 900, imageAddedAt: 1, imageSource: { origin: "search", sourceUrl: `${BRAVE}/img/01.jpg`, sourcePage: "https://people.com/article/1" } };
  cs[1] = { ...cs[1], imageUrl: b.url, imageThumbUrl: b.thumb, imageStoragePath: b.path, imageWidth: 1600, imageHeight: 900, imageAddedAt: 1, imageSource: { origin: "upload" } };
  await ref.update({ contestants: cs });

  const errors = collectConsoleErrors(page);
  await openLabList(page);
  await expect(page.getByTestId("draft-picker")).toBeVisible();
  await page.getByTestId("draft-row").filter({ hasText: DRAFT_TITLE }).getByTestId("draft-open").click();
  await expect(page.getByTestId("contestant-grid")).toBeVisible();

  // 배지 → 창
  const badge = page.getByTestId("slot-image-badge-0");
  await expect(badge).toHaveAttribute("title", "그림 확인 창 열기");
  await badge.click();
  const dlg = page.getByTestId("image-check-dialog");
  await expect(dlg).toContainText("슬롯 1 · 그림 확인");
  await expect(dlg).toContainText("출처 페이지에서 엔트리가 맞는지 확인하세요.");
  await expect(page.getByTestId("image-check-img")).toHaveAttribute("src", a.url);
  const openPage = page.getByTestId("image-check-open-page");
  await expect(openPage).toHaveText("출처 페이지 열기 ↗");
  await expect(openPage).toHaveAttribute("href", "https://people.com/article/1");
  await expect(openPage).toHaveAttribute("target", "_blank");
  await expect(openPage).toHaveAttribute("rel", "noopener noreferrer");
  const openOriginal = page.getByTestId("image-check-open-original");
  await expect(openOriginal).toHaveText("원본 그림 열기 ↗");
  await expect(openOriginal).toHaveAttribute("href", `${BRAVE}/img/01.jpg`);
  // 원본 그림은 새 탭으로 열린다(가짜 서버 주소라 바깥 사이트가 아니다)
  const [tab] = await Promise.all([page.context().waitForEvent("page"), openOriginal.click()]);
  await tab.waitForLoadState();
  expect(tab.url()).toBe(`${BRAVE}/img/01.jpg`);
  await tab.close();
  await dlg.screenshot({ path: shot("image-check-search-slot.png") });
  await page.getByTestId("image-check-close").click();
  await expect(dlg).toHaveCount(0);

  // 도메인 글자 → 같은 창
  await expect(page.getByTestId("slot-meta-0")).toHaveText("people.com");
  await page.getByTestId("slot-meta-0").click();
  await expect(dlg).toContainText("슬롯 1 · 그림 확인");

  // [새 이미지 찾기](창 안) — 그 칸만 바뀐다
  const before1 = await page.getByTestId("contestant-pick-1").getAttribute("style");
  await page.getByTestId("image-check-refresh").click();
  await expect(page.getByTestId("image-check-img")).not.toHaveAttribute("src", a.url, { timeout: 60_000 });
  expect(await page.getByTestId("contestant-pick-1").getAttribute("style")).toBe(before1);
  await page.getByTestId("image-check-close").click();

  // 파일로 넣은 칸 — 두 버튼 · [새 이미지 찾기] 숨김
  await page.getByTestId("slot-image-badge-1").click();
  await expect(dlg).toContainText("슬롯 2 · 그림 확인");
  await expect(page.getByTestId("image-check-open-page")).toHaveCount(0);
  await expect(page.getByTestId("image-check-open-original")).toHaveCount(0);
  await expect(page.getByTestId("image-check-refresh")).toHaveCount(0);
  await dlg.screenshot({ path: shot("image-check-upload-slot.png") });
  await page.keyboard.press("Escape");
  await expect(dlg).toHaveCount(0);
  await expectNoConsoleErrors(errors);
});

// ── ⑤ 팬 화면 전후 ──────────────────────────────────────────────────────────

test("⑤ 매치 무대(내리기 없음) — 출처 글자는 링크 없이 그대로 · \"내리기 요청\" 글자 없음", async ({ page }) => {
  const { id } = await seedImageTournament();
  await stubYouTubeImages(page);
  await page.goto(`/arena/${id}?lang=ko`);
  await dismissConsent(page);
  await expect(page.getByTestId("stage-still").first()).toBeVisible({ timeout: 30_000 });
  const intro = page.getByTestId("arena-intro");
  if (await intro.isVisible()) await page.getByTestId("arena-intro-start").click();
  const source = page.getByTestId("stage-source").first();
  await expect(source).toHaveText("출처: news.example.com");
  expect(await source.evaluate((el) => el.closest("a") === null && !el.hasAttribute("href"))).toBe(true);
  expect(await page.locator("body").innerText()).not.toContain("내리기 요청");
  expect(await page.locator("body").innerText()).not.toContain("ⓘ");
  await page.screenshot({ path: shot("stage-unchanged-1440.png") });
});
