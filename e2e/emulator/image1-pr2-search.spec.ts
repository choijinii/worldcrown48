/**
 * IMAGE-1 PR 2 — 이미지 검색 AI · 주소 여러 줄 · 이미지만 찾기 · 삭제 때 그림 폴더 (에뮬레이터 · 지시서 §11).
 *
 * 진짜 Brave 를 부르지 않는다. 시험이 고정 포트 9311 에 가짜 Brave(검색 + 그림 파일)를 띄우고,
 * 함수 에뮬레이터는 scripts/e2e-emulator.sh 가 넣은 BRAVE_API_BASE 로 그 서버를 부른다.
 *   이름에 "Nobody" → 세로 300px 그림 · 그림 아닌 페이지만(= 못 찾음)
 *   이름에 "LimitHit" → 429 + 월 한도 0 머리말(= 한도)
 *   그 밖 → 이름의 번호로 고른 시험 그림 두 장(첫 장 · 다음 장)
 *
 * 통합(함수 직접 호출): 초안 경로 1600·600 두 장 · not-found · 한도에서 멈추고 앞 결과 보존 · [삭제] 뒤 폴더 0개.
 * E2E(화면): [이미지 생성] → 칸 수 · 끝 알림 · [새 이미지 찾기] · [이미지만 찾기] · 주소 3줄 · 키 없음 · 한도 ·
 *            발행 → 무대 · VS 표지 · 차트 아바타 → [삭제] → 폴더 비움.
 */
import { createServer, type Server } from "node:http";
import { readFileSync } from "node:fs";
import * as admin from "firebase-admin";
import { expect, test, type Page } from "@playwright/test";
import {
  ADMIN_UID,
  BUCKET,
  DRAFT_TITLE,
  PROJECT_ID,
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
  signInAsAdmin,
  stubAiCallables,
} from "./helpers";

const BRAVE_PORT = 9311;
const BASE = `http://127.0.0.1:${BRAVE_PORT}`;
/** 증거 그림은 시험마다의 결과 폴더(test-results-emulator)에 — CI 가 통째로 올린다. */
const shot = (name: string) => test.info().outputPath(name);

let server: Server;
let braveCalls = 0;
/** 가짜 Brave 가 받은 검색어 — 키워드가 붙는지 본다(시험 메모리에만). */
const braveQueries: string[] = [];

function results(q: string) {
  if (/TitlePick/.test(q)) {
    // 제목 우선 — 첫 결과는 이름이 없는 제목, 둘째 결과의 제목에만 이름(대소문자 다름)이 든다.
    return [
      { title: "Unrelated pony farm", url: `${BASE}/page/05`, properties: { url: `${BASE}/img/05.jpg`, height: 1200 } },
      { title: "TITLEPICK ANN official profile", url: `${BASE}/page/06`, properties: { url: `${BASE}/img/06.jpg`, height: 1200 } },
    ];
  }
  if (/Nobody/.test(q)) {
    return [
      { url: `${BASE}/page/short`, properties: { url: `${BASE}/img/short-300.jpg` } },
      { url: `${BASE}/page/html`, properties: { url: `${BASE}/page.html` } },
    ];
  }
  const n = Number(/(\d+)/.exec(q)?.[1] ?? "1");
  const a = String(((n - 1) % 48) + 1).padStart(2, "0");
  const b = String((n % 48) + 1).padStart(2, "0");
  return [
    { title: "first", url: `${BASE}/page/${a}`, thumbnail: { src: "x" }, properties: { url: `${BASE}/img/${a}.jpg?q=${n}`, height: 1200 } },
    { title: "second", url: `${BASE}/page/${b}`, properties: { url: `${BASE}/img/${b}.jpg?q=${n}`, height: 1200 } },
  ];
}

test.beforeAll(async () => {
  server = createServer((req, res) => {
    const u = new URL(req.url ?? "/", BASE);
    if (u.pathname === "/res/v1/images/search") {
      braveCalls++;
      if (req.headers["x-subscription-token"] !== "e2e-dummy") {
        res.writeHead(401);
        res.end();
        return;
      }
      const q = u.searchParams.get("q") ?? "";
      braveQueries.push(q);
      expect(u.searchParams.get("safesearch")).toBe("strict");
      expect(u.searchParams.get("count")).toBe("20");
      if (/BraveDown/.test(q)) {
        // 문구 16 — Brave 가 오류(500). 한도(402/429)와 다르다.
        res.writeHead(500);
        res.end("{}");
        return;
      }
      if (/LimitHit/.test(q)) {
        res.writeHead(429, { "x-ratelimit-limit": "50, 100", "x-ratelimit-remaining": "10, 0" });
        res.end("{}");
        return;
      }
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ type: "images", results: results(q) }));
      return;
    }
    if (u.pathname.startsWith("/img/")) {
      try {
        const body = readFileSync(fixture(u.pathname.slice(5)));
        res.writeHead(200, { "Content-Type": "image/jpeg", "Content-Length": body.length });
        res.end(body);
      } catch {
        res.writeHead(404);
        res.end();
      }
      return;
    }
    if (u.pathname === "/page.html") {
      res.writeHead(200, { "Content-Type": "text/html" });
      res.end("<html><body>not an image</body></html>");
      return;
    }
    res.writeHead(404);
    res.end();
  });
  await new Promise<void>((r) => server.listen(BRAVE_PORT, "127.0.0.1", () => r()));
});

test.afterAll(async () => {
  console.log(`[PR2] 가짜 Brave 검색 횟수 ${braveCalls} (진짜 Brave 0번)`);
  await new Promise<void>((r) => {
    server.closeAllConnections();
    server.close(() => r());
  });
});

test.beforeEach(async () => {
  await resetEmulators();
  await seedCategories();
});

// ── 통합: 함수를 직접 부른다 ─────────────────────────────────────────────────────

async function idToken(): Promise<string> {
  const custom = await adminApp().auth().createCustomToken(ADMIN_UID, { admin: true });
  const r = await fetch(
    "http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=demo-api-key",
    { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token: custom, returnSecureToken: true }) },
  );
  return ((await r.json()) as { idToken: string }).idToken;
}

async function callFn<T>(name: string, data: unknown): Promise<T> {
  const r = await fetch(`http://127.0.0.1:5001/${PROJECT_ID}/asia-northeast3/${name}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${await idToken()}` },
    body: JSON.stringify({ data }),
  });
  const j = (await r.json()) as { result?: T; error?: unknown };
  if (!r.ok || j.error) throw new Error(`${name} ${r.status} ${JSON.stringify(j.error)}`);
  return j.result as T;
}

const files = async (prefix: string) => (await adminApp().storage().bucket().getFiles({ prefix }))[0].map((f) => f.name).sort();

type Res = { ok: boolean; code?: string; results: { slot: number; ok: boolean; reason?: string; storagePath?: string; sourceUrl?: string; sourcePage?: string; width?: number; height?: number }[] };

test("[통합] autoSourceImages — 초안 경로 1600·600 두 장 · 못 찾은 칸 not-found · 결과는 허용 칸만", async () => {
  const out = await callFn<Res>("autoSourceImages", {
    draftId: "d1",
    slots: [
      { slot: 0, name: "Creator01" },
      { slot: 1, name: "Nobody" },
      { slot: 2, name: "Creator03", affiliation: "Studio" },
    ],
  });
  expect(out.ok).toBe(true);
  expect(out.code).toBeUndefined();
  expect(out.results.map((r) => [r.slot, r.ok, r.reason ?? null])).toEqual([
    [0, true, null],
    [1, false, "not-found"],
    [2, true, null],
  ]);
  const r0 = out.results[0];
  expect(r0.storagePath).toBe(`entry-images/drafts/${ADMIN_UID}/d1/0.jpg`);
  expect(r0.sourceUrl).toBe(`${BASE}/img/01.jpg?q=1`);
  expect(r0.sourcePage).toBe(`${BASE}/page/01`);
  expect(Object.keys(r0).sort()).toEqual(
    ["addedAt", "height", "ok", "slot", "sourcePage", "sourceUrl", "storagePath", "thumbUrl", "url", "width"].sort(),
  );
  expect(await files(`entry-images/drafts/${ADMIN_UID}/d1/`)).toEqual([
    `entry-images/drafts/${ADMIN_UID}/d1/0.jpg`,
    `entry-images/drafts/${ADMIN_UID}/d1/0_600.jpg`,
    `entry-images/drafts/${ADMIN_UID}/d1/2.jpg`,
    `entry-images/drafts/${ADMIN_UID}/d1/2_600.jpg`,
  ]);
  const [meta] = await adminApp().storage().bucket().file(`entry-images/drafts/${ADMIN_UID}/d1/0.jpg`).getMetadata();
  expect(meta.contentType).toBe("image/jpeg");
  expect(Math.max(r0.width!, r0.height!)).toBeLessThanOrEqual(1600);
  // Brave 약관 — 함수는 Firestore 에 아무것도 쓰지 않는다(검색 결과 저장 없음).
  expect((await db().collection("tournamentDrafts").get()).size).toBe(0);
});

test("[통합] 한도(429 · 월 0)를 만나면 멈추고 그때까지 찾은 칸은 남긴다", async () => {
  const out = await callFn<Res>("autoSourceImages", {
    draftId: "d2",
    slots: [
      { slot: 0, name: "Creator01" },
      { slot: 1, name: "Creator02" },
      { slot: 2, name: "LimitHit" },
      { slot: 3, name: "Creator04" },
      { slot: 4, name: "Creator05" },
      { slot: 5, name: "Creator06" },
    ],
  });
  expect(out.code).toBe("limit");
  const okSlots = out.results.filter((r) => r.ok).map((r) => r.slot);
  expect(okSlots).toEqual(expect.arrayContaining([0, 1]));
  expect(out.results.some((r) => r.slot === 2)).toBe(false);
  expect(out.results.length).toBeLessThan(6);
  expect((await files(`entry-images/drafts/${ADMIN_UID}/d2/`)).length).toBe(okSlots.length * 2);
});

test("[통합] [삭제] — 그 대회 그림 폴더와 그 초안 폴더만 지운다 · 다른 대회 · 다른 초안은 그대로", async () => {
  const { id } = await seedImageTournament("delT1");
  await seedImageTournament("keepT1");
  const bucket = adminApp().storage().bucket();
  const draftDir = `entry-images/drafts/${ADMIN_UID}/draftOfDel/`;
  const otherDraft = `entry-images/drafts/${ADMIN_UID}/otherDraft/`;
  for (const p of [`${draftDir}5.jpg`, `${draftDir}5_600.jpg`, `${otherDraft}1.jpg`]) {
    await bucket.file(p).save(readFileSync(fixture("01.jpg")), { contentType: "image/jpeg", resumable: false });
  }
  // 발행 복사(finalizeEntryImages)가 남기는 표시 — 이 그림이 온 초안 폴더.
  await bucket.file(`entry-images/tournaments/${id}/0.jpg`).setMetadata({ metadata: { draftDir } });
  expect((await files(`entry-images/tournaments/${id}/`)).length).toBe(96);

  await expect(callFn("manageTournament", { action: "delete", tournamentId: id })).resolves.toEqual({ status: "deleted" });

  expect(await files(`entry-images/tournaments/${id}/`)).toEqual([]);
  expect(await files(draftDir)).toEqual([]);
  expect((await files("entry-images/tournaments/keepT1/")).length).toBe(96);
  expect(await files(otherDraft)).toEqual([`${otherDraft}1.jpg`]);
});

// ── E2E: 화면 ────────────────────────────────────────────────────────────────

const NOBODY = 6;
const aiNames = Array.from({ length: 48 }, (_, i) => (i === NOBODY ? "Nobody Seven" : `Creator${String(i + 1).padStart(2, "0")}`));

async function stubAiFill(page: Page) {
  await page.route(/\/aiFillContestants$/, (route) =>
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        result: { contestants: aiNames.map((name) => ({ name, nationality: "KR", affiliation: "", imageSearchKeyword: "" })) },
      }),
    }),
  );
}

async function openLab(page: Page) {
  await stubAiCallables(page);
  await stubAiFill(page);
  await page.goto("/admin/lab?lang=ko");
  await signInAsAdmin(page);
  await dismissConsent(page); // 쿠키 동의 바가 칸 그림을 덮지 않게(증거 그림)
}

async function openDraft(page: Page) {
  await expect(page.getByTestId("draft-picker")).toBeVisible();
  await page.getByTestId("draft-row").filter({ hasText: DRAFT_TITLE }).getByTestId("draft-open").click();
  await expect(page.getByTestId("contestant-grid")).toBeVisible();
}

async function openTools(page: Page) {
  if (!(await page.getByTestId("lab-manual-tools").isVisible())) await page.getByTestId("lab-manual-tools-toggle").click();
}

const preview = (page: Page, i: number) => page.getByTestId(`contestant-pick-${i}`);
const nameOf = (page: Page, i: number) => page.getByLabel(`Contestant ${i + 1} 이름`, { exact: true });

async function imageSlots(page: Page): Promise<number> {
  let n = 0;
  for (let i = 0; i < 48; i++) if (/127\.0\.0\.1:9199/.test((await preview(page, i).getAttribute("style")) ?? "")) n++;
  return n;
}

test("[E2E] [이미지 생성] → 47칸 그림 · 끝 알림 · [새 이미지 찾기] · 주소 3줄 · [이미지만 찾기] · 발행 → 무대 · 표지 · 차트 → [삭제]", async ({ page }) => {
  test.setTimeout(300_000);
  // 빈 2단계 초안(종류 미정 · 이름 없음) — AI 채우기 이름을 쓴다. 심은 뒤에 연다(새로고침은 연결을 끊는다).
  const draftId = await seedDraft("e2eDraftPr2", "image");
  await db().collection("tournamentDrafts").doc(draftId).update({ contestants: [], mediaKind: admin.firestore.FieldValue.delete() });
  const errors = collectConsoleErrors(page);
  await openLab(page);
  await openDraft(page);

  // ① [이미지 생성]
  const callsBefore = braveCalls;
  await page.getByTestId("lab-generate-images").click();
  await expect(page.getByTestId("lab-generate-images")).toContainText("이미지 찾는 중…", { timeout: 30_000 });
  await expect(page.getByText("✓ 48칸을 채우고 그림 47장을 넣었어요 · 손볼 칸 1개")).toBeVisible({ timeout: 180_000 });
  expect(braveCalls - callsBefore).toBe(48);
  expect(await imageSlots(page)).toBe(47);
  await expect(page.getByTestId(`slot-image-notfound-${NOBODY}`)).toHaveText("세로 400px 이상인 그림을 찾지 못했어요");
  await expect(page.getByTestId("contestant-sourcing-0")).toHaveAttribute("data-sourcing-status", "suggested");
  await expect(page.getByTestId("contestant-image-refresh-0")).toHaveText("새 이미지 찾기");
  await page.getByTestId("contestant-grid").screenshot({ path: shot("r1-generate-grid.png") });
  await page.getByTestId(`contestant-node-${NOBODY}`).screenshot({ path: shot("r1-notfound-slot.png") });

  // ② [새 이미지 찾기] — 그 칸만 바뀐다
  const before0 = await preview(page, 0).getAttribute("style");
  const before1 = await preview(page, 1).getAttribute("style");
  await page.getByTestId("contestant-image-refresh-0").click();
  await expect(preview(page, 0)).not.toHaveAttribute("style", before0 ?? "", { timeout: 60_000 });
  expect(await preview(page, 1).getAttribute("style")).toBe(before1);
  await expect.poll(async () => {
    const cs = (await db().collection("tournamentDrafts").doc(draftId).get()).get("contestants") as { imageSource?: { sourceUrl?: string } }[];
    return cs?.[0]?.imageSource?.sourceUrl;
  }, { timeout: 30_000 }).toBe(`${BASE}/img/02.jpg?q=1`);

  // ③ [이미지 주소 한꺼번에 넣기] — 빈 칸 3개(6 · 10 · 11)에 3줄(정상 2 · 실패 1)
  await page.getByTestId("slot-image-url-10").click(); // 켜진 [이미지] = 빼기
  await page.getByTestId("slot-image-url-11").click();
  await expect.poll(() => imageSlots(page)).toBe(45);
  // 손으로 그림을 뺀 칸에는 "제안" 배지가 남지 않는다
  await expect(page.getByTestId("contestant-sourcing-10")).toHaveCount(0);
  await openTools(page);
  await page.getByTestId("lab-open-image-links").click();
  const modal = page.getByTestId("image-links-modal");
  await expect(modal).toContainText("이미지 주소 한꺼번에 넣기");
  await expect(modal).toContainText("한 줄에 주소 하나씩, 칸 순서대로 붙여 넣으세요(최대 48줄). 그림이 없는 칸부터 채워요.");
  await page.getByTestId("image-links-input").fill(`${BASE}/img/40.jpg\n${BASE}/page.html\n${BASE}/img/41.jpg`);
  await page.getByTestId("image-links-submit").click();
  await expect(page.getByTestId("image-links-fail-2")).toHaveText("2번째 줄: 그림 파일이 아니에요", { timeout: 60_000 });
  await modal.screenshot({ path: shot("r3-paste-lines.png") });
  await page.getByTestId("image-links-cancel").click();
  await expect(modal).toHaveCount(0);
  expect(await imageSlots(page)).toBe(47);
  expect(/127\.0\.0\.1:9199/.test((await preview(page, NOBODY).getAttribute("style")) ?? "")).toBe(true);
  expect(/127\.0\.0\.1:9199/.test((await preview(page, 10).getAttribute("style")) ?? "")).toBe(false);
  expect(/127\.0\.0\.1:9199/.test((await preview(page, 11).getAttribute("style")) ?? "")).toBe(true);
  await expect(page.getByTestId(`slot-image-notfound-${NOBODY}`)).toHaveCount(0);

  // ④ [이미지만 찾기] — 이름은 그대로, 그림 없는 칸(10)만
  const namesBefore = await Promise.all([0, 10, 47].map((i) => nameOf(page, i).inputValue()));
  await expect(page.getByTestId("lab-find-images-only")).toHaveAttribute("title", "이름은 그대로 두고, 그림이 없는 칸만 찾아요");
  const callsFind = braveCalls;
  await page.getByTestId("lab-find-images-only").click();
  await expect.poll(() => imageSlots(page), { timeout: 60_000 }).toBe(48);
  expect(braveCalls - callsFind).toBe(1);
  expect(await Promise.all([0, 10, 47].map((i) => nameOf(page, i).inputValue()))).toEqual(namesBefore);

  // ⑤ 발행 → 무대
  await page.getByTestId("contestant-pick-0").click();
  await page.getByTestId("contestant-pick-1").click();
  await page.getByTestId("publish-button").click();
  for (const n of [1, 2, 3]) await page.getByTestId(`confirm-check-${n}`).check();
  await page.getByTestId("confirm-publish").click();
  await expect(page.getByText("✓ 토너먼트 생성 완료")).toBeVisible({ timeout: 90_000 });
  const tSnap = await db().collection("tournaments").where("hostUid", "==", ADMIN_UID).get();
  expect(tSnap.size).toBe(1);
  const tid = tSnap.docs[0].id;
  const cSnap = await db().collection("contestants").where("tournamentId", "==", tid).get();
  const first = cSnap.docs.find((d) => d.get("order") === 1)!.data();
  expect(first.media.image.origin).toBe("search");
  expect(first.media.image.storagePath).toBe(`entry-images/tournaments/${tid}/0.jpg`);
  expect((await files(`entry-images/tournaments/${tid}/`)).length).toBe(96);
  await expectNoConsoleErrors(errors);

  await page.goto(`/arena/${tid}?lang=ko`);
  const still = page.getByTestId("stage-still").first();
  await expect(still).toBeVisible({ timeout: 30_000 });
  await page.screenshot({ path: shot("r5-stage-1440.png") });

  // VS 표지(피치) · 차트 아바타
  await db().collection("tournaments").doc(tid).update({ featured: true });
  await page.goto("/?lang=ko");
  const cover = page.getByTestId("vsthumb-a-img").first();
  await expect(cover).toHaveAttribute("src", new RegExp(`${tid}%2F0_600\\.jpg`), { timeout: 30_000 });
  await page.screenshot({ path: shot("r5-pitch-cover-1440.png") });
  const ids = cSnap.docs.sort((a, b) => (a.get("order") as number) - (b.get("order") as number)).map((d) => d.id);
  const row = (i: number, score: number) => ({
    rank: i + 1, contestantId: ids[i], name: aiNames[i], videoId: null,
    imageUrl: `http://127.0.0.1:9199/v0/b/${BUCKET}/o/${encodeURIComponent(`entry-images/tournaments/${tid}/${i}_600.jpg`)}?alt=media`,
    voteCount: 10 - i, rate: 50, crownScore: score, placementRate: 0.5, winRate: 0.5, shareRate: 0.5,
  });
  await db().collection("ranking_cache").doc(tid).set({
    tournamentId: tid, rankings: [row(0, 800), row(1, 600)], totalVotes: 19, generationSequence: 0, runsTotal: 20,
    generatedAt: admin.firestore.Timestamp.now(), previousGeneratedAt: null,
  });
  await page.goto(`/arena/${tid}/ranking?lang=ko`);
  await expect(page.getByTestId("rank-row").first().locator(".rank-av img")).toHaveAttribute("src", new RegExp(`${tid}%2F0_600\\.jpg`), { timeout: 30_000 });
  await page.screenshot({ path: shot("r5-chart-avatar-1440.png") });

  // ⑥ [삭제] → 그 대회 그림 폴더 0개 (다른 대회 폴더는 그대로)
  await seedImageTournament("keepT2");
  await db().collection("ranking_cache").doc(tid).delete();
  await page.goto("/admin/lab?lang=ko");
  await signInAsAdmin(page);
  const del = page.getByTestId(`delete-${tid}`);
  await expect(del).toBeVisible({ timeout: 30_000 });
  await del.click();
  await page.getByTestId(`admin-confirm-${tid}`).getByRole("button").first().click();
  await expect.poll(() => files(`entry-images/tournaments/${tid}/`), { timeout: 60_000 }).toEqual([]);
  expect((await files("entry-images/tournaments/keepT2/")).length).toBe(96);
  console.log(`[PR2] E2E 발행 대회 ${tid} · 삭제 뒤 그림 0개 · 다른 대회 96개 그대로`);
});

test("[E2E] 검색 키가 없을 때(가짜 응답) — 이름은 남고 문구 13", async ({ page }) => {
  await seedDraft("e2eDraftNoKey", "image");
  await page.route(/\/autoSourceImages$/, (route) =>
    route.fulfill({ contentType: "application/json", body: JSON.stringify({ result: { ok: false, code: "no-key" } }) }),
  );
  await openLab(page);
  await openDraft(page);
  await openTools(page);
  await page.getByTestId("lab-find-images-only").click();
  await expect(page.getByText("이미지 검색 키가 없어 그림을 넣지 못해요.")).toBeVisible({ timeout: 30_000 });
  await expect(nameOf(page, 0)).toHaveValue("엔트리01");
  expect(await imageSlots(page)).toBe(0);
  await page.screenshot({ path: shot("r6-no-key.png") });
});

test("[E2E] 검색 한도(가짜 Brave 429) — 찾은 칸은 남고 문구 14", async ({ page }) => {
  const id = await seedDraft("e2eDraftLimit", "image");
  const ref = db().collection("tournamentDrafts").doc(id);
  const cs = (await ref.get()).get("contestants") as { name: string }[];
  cs[2] = { ...cs[2], name: "LimitHit" };
  await ref.update({ contestants: cs });
  await openLab(page);
  await openDraft(page);
  await openTools(page);
  await page.getByTestId("lab-find-images-only").click();
  await expect(page.getByText("이미지 검색 한도입니다. 남은 칸은 수동으로 넣어 주세요.")).toBeVisible({ timeout: 60_000 });
  const n = await imageSlots(page);
  expect(n).toBeGreaterThanOrEqual(2);
  expect(n).toBeLessThan(6);
  expect(/127\.0\.0\.1:9199/.test((await preview(page, 2).getAttribute("style")) ?? "")).toBe(false);
  await page.screenshot({ path: shot("r6-limit.png") });
});

/** 이름을 앞 12칸만 남긴다(묶음 2개 · 6칸씩) — 실패 알림 시험을 짧게. */
async function keepFirst12(id: string, rename: Record<number, string> = {}) {
  const ref = db().collection("tournamentDrafts").doc(id);
  const cs = (await ref.get()).get("contestants") as { name: string; affiliation: string }[];
  await ref.update({
    contestants: cs.map((c, i) => (i >= 12 ? { ...c, name: "", affiliation: "" } : rename[i] ? { ...c, name: rename[i] } : c)),
  });
}

test("[E2E] 검색 실패 — 네트워크(요청이 서버에 닿지 못함) · 앞 묶음에서 찾은 칸은 남고 문구 15", async ({ page }) => {
  const id = await seedDraft("e2eDraftNetFail", "image");
  await keepFirst12(id);
  let posts = 0;
  await page.route(/\/autoSourceImages$/, async (route) => {
    if (route.request().method() !== "POST") return route.continue();
    posts++;
    // 둘째 묶음에서 연결이 끊긴다 — fetch 자체가 실패한다.
    if (posts === 2) return route.abort("internetdisconnected");
    return route.continue();
  });
  await openLab(page);
  await openDraft(page);
  await openTools(page);
  await page.getByTestId("lab-find-images-only").click();
  await expect(page.getByText("네트워크가 끊겨 이미지 검색에 실패했어요. 다시 시도하거나, 그림을 수동으로 넣어 주세요.")).toBeVisible({ timeout: 60_000 });
  await expect(page.getByText("서버에 문제가 생겨 이미지 검색에 실패했어요. 다시 시도하거나, 그림을 수동으로 넣어 주세요.")).toHaveCount(0);
  expect(posts).toBe(2);
  // 앞 묶음(0~5칸)은 그대로 · 끊긴 묶음(6~11칸)은 비어 있고 "못 찾았어요"로 적지 않는다.
  for (let i = 0; i < 6; i++) expect(/127\.0\.0\.1:9199/.test((await preview(page, i).getAttribute("style")) ?? "")).toBe(true);
  expect(await imageSlots(page)).toBe(6);
  await expect(page.getByTestId("slot-image-notfound-6")).toHaveCount(0);
  await expect(nameOf(page, 6)).toHaveValue("엔트리07");
  await page.screenshot({ path: shot("r7-network-fail.png") });
});

test("[E2E] 검색 실패 — 서버(가짜 Brave 500) · 다른 칸은 찾고 그 칸은 '못 찾았어요'가 아니라 문구 16", async ({ page }) => {
  const id = await seedDraft("e2eDraftServerFail", "image");
  await keepFirst12(id, { 3: "BraveDown" });
  await openLab(page);
  await openDraft(page);
  await openTools(page);
  await page.getByTestId("lab-find-images-only").click();
  await expect(page.getByText("서버에 문제가 생겨 이미지 검색에 실패했어요. 다시 시도하거나, 그림을 수동으로 넣어 주세요.")).toBeVisible({ timeout: 60_000 });
  await expect(page.getByText("네트워크가 끊겨 이미지 검색에 실패했어요. 다시 시도하거나, 그림을 수동으로 넣어 주세요.")).toHaveCount(0);
  expect(await imageSlots(page)).toBe(11);
  expect(/127\.0\.0\.1:9199/.test((await preview(page, 3).getAttribute("style")) ?? "")).toBe(false);
  await expect(page.getByTestId("slot-image-notfound-3")).toHaveCount(0);
  await page.screenshot({ path: shot("r8-server-fail.png") });
});

test("[E2E] 검색 정확도 — 검색어 = 이름 + 소속 + STEP 1 키워드 앞 1개 · 제목에 이름이 든 결과를 먼저 고른다", async ({ page }) => {
  const id = await seedDraft("e2eDraftTitlePick", "image");
  await keepFirst12(id, { 0: "TitlePick Ann" });
  await db().collection("tournamentDrafts").doc(id).update({ keywords: ["beauty creator", "women influencer"] });
  await openLab(page);
  await openDraft(page);
  await openTools(page);
  const from = braveQueries.length;
  await page.getByTestId("lab-find-images-only").click();
  await expect.poll(() => imageSlots(page), { timeout: 60_000 }).toBe(12);
  const qs = braveQueries.slice(from);
  expect(qs).toHaveLength(12);
  expect(qs).toContain("TitlePick Ann 그룹1 beauty creator");
  expect(qs).toContain("엔트리02 그룹2 beauty creator");
  expect(qs.some((q) => q.includes("women influencer"))).toBe(false);
  // Brave 첫 결과(05)가 아니라 제목에 이름이 든 둘째 결과(06)
  await expect.poll(async () => {
    const cs = (await db().collection("tournamentDrafts").doc(id).get()).get("contestants") as { imageSource?: { sourceUrl?: string } }[];
    return cs?.[0]?.imageSource?.sourceUrl;
  }, { timeout: 30_000 }).toBe(`${BASE}/img/06.jpg`);
  // 제목 글자는 초안에 실리지 않는다(Brave 약관)
  const saved = JSON.stringify((await db().collection("tournamentDrafts").doc(id).get()).get("contestants"));
  expect(saved).not.toMatch(/official profile|pony farm/i);
});

for (const [lang, find, links] of [
  ["en", "Find images only", "Paste image links"],
  ["es", "Buscar solo imágenes", "Pegar enlaces de imagen"],
] as const) {
  test(`[E2E] 도구 줄 ${lang} — 승인 문구`, async ({ page }) => {
    await stubAiCallables(page);
    await seedDraft("e2eDraftLang", "image");
    await page.goto(`/admin/lab?lang=${lang}`);
    await signInAsAdmin(page);
    await openDraft(page);
    await openTools(page);
    await expect(page.getByTestId("lab-find-images-only")).toHaveText(find);
    await expect(page.getByTestId("lab-open-image-links")).toHaveText(links);
    await expect(page.getByTestId("fill-blanks-button")).toHaveText(lang === "en" ? "Fill blanks + find images" : "Rellenar vacíos + buscar imágenes");
    await page.getByTestId("lab-manual-tools").screenshot({ path: shot(`r7-tools-${lang}.png`) });
  });
}
