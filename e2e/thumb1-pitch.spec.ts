/**
 * THUMB-1 PR 2 E2E — The Pitch 화이트 · 카드 커버 = 대표 매치 VS 장면 · 배너 자리 pitch-between
 * (원장 D-35 · D-39 · D-40 · D-21 · D-55 · D-59 · 킥 §4 ㉣).
 *
 *   ① 화이트(라이트 토큰) · 카드 = 16:9 VS 커버 + 제목은 커버 안 + 참가하기 버튼
 *   ② 배너 970×90(데스크톱) · 320×100(모바일 세로) · 없음(휴대폰 가로) · 런칭 전 = 사전등록 → /launch
 *   ③ 고른 A·B 가 커버에 · 그림이 깨지면(㉣) 앞 번호로 대체 · 엔트리가 지워져도 대체
 *   ④ 관리자 목록(The Lab)에 "대표 매치 그림 깨짐" 표시
 *
 * ③④는 admin SDK 로 대회 1개(엔트리 4개)를 잠깐 심고 끝나면 지운다(B-1 게시 테스트와 같은 방식 —
 * 실제 프로젝트에 쓰므로 제목으로 알아볼 수 있게). 그림 깨짐은 i.ytimg 요청을 404 로 바꿔 만든다.
 * `?lang=` 로 언어를 고정한다.
 */
import { expect, test, type ConsoleMessage, type Page } from "@playwright/test";
import * as admin from "firebase-admin";
import { e2eMark } from "./e2eMark";

/** lib/launch/launchAt 의 LAUNCH_AT_MS 와 같은 값(2026-11-26 00:00 KST) — e2e 는 앱 모듈을 직접 읽지 않는다. */
const LAUNCH_AT_MS = Date.parse("2026-11-26T00:00:00+09:00");
const TITLE = "THUMB-1 E2E Pitch";
const VID = { a: "9bZkp7q19f0", b: "dQw4w9WgXcQ", c: "kJQP7kiw5Fk" } as const;

let consoleErrors: string[] = [];
/** 심은 대회 — 테스트마다 따로 심고 afterAll 에서 전부 지운다. */
const seededIds: string[] = [];

/** pitch.spec.ts 와 같은 환경 소음 + 일부러 404 로 만든 그림 요청. */
const IGNORED_CONSOLE = [
  /Failed to load resource/i,
  /GSI_LOGGER/i,
  /\bFedCM\b/i,
  /accounts list is empty/i,
  /identitytoolkit/i,
  /status of (401|403|429)/i,
  /Could not reach Cloud Firestore backend/i,
  /Failed to fetch RSC payload/i,
];

function ensureAdmin(): typeof admin | null {
  if (admin.apps.length > 0) return admin;
  const raw = process.env.FIREBASE_ADMIN_SDK_KEY;
  if (!raw) return null;
  const json = raw.trim().startsWith("{") ? raw : Buffer.from(raw, "base64").toString("utf8");
  admin.initializeApp({ credential: admin.credential.cert(JSON.parse(json) as admin.ServiceAccount) });
  return admin;
}

/**
 * 대회 1개 + 엔트리 4개. 1번 = 영상 없음 · 2번 = c · 3번 = a · 4번 = b.
 * 대표 매치 = A 3번(a) · B 4번(b). A 그림이 깨지면 → 영상 있는 앞 번호 = 2번.
 */
async function seed(): Promise<{ id: string; c: string[] }> {
  const a = ensureAdmin()!;
  const db = a.firestore();
  const now = a.firestore.Timestamp.now();
  const hostUid = process.env.TEST_UID ?? "e2e";
  const tRef = db.collection("tournaments").doc();
  const cRefs = [0, 1, 2, 3].map(() => db.collection("contestants").doc());
  const media = [undefined, VID.c, VID.a, VID.b];
  const batch = db.batch();
  batch.set(tRef, {
    title: TITLE,
    titleI18n: { ko: TITLE, en: TITLE, es: TITLE },
    category: "FOOTBALL",
    status: "active",
    ...e2eMark(), // OPS-FIX-1 · D-66 — 실서비스 목록에서 빠지는 시험 표시
    featured: false,
    hostUid,
    totalContestants: 48,
    createdAt: now,
    tournamentDeadline: a.firestore.Timestamp.fromMillis(Date.now() + 7 * 86_400_000),
    thumbnailPair: { a: cRefs[2].id, b: cRefs[3].id, aPos: 22, bPos: 78 },
  });
  cRefs.forEach((r, i) =>
    batch.set(r, {
      tournamentId: tRef.id,
      hostUid,
      order: i + 1,
      name: `THUMB Pitch ${i + 1}`,
      ...(media[i] ? { media: { embed: { videoId: media[i] } } } : {}),
    }),
  );
  await batch.commit();
  return { id: tRef.id, c: cRefs.map((r) => r.id) };
}

async function unseed(id: string): Promise<void> {
  const db = ensureAdmin()!.firestore();
  const cs = await db.collection("contestants").where("tournamentId", "==", id).get();
  const batch = db.batch();
  cs.forEach((d) => batch.delete(d.ref));
  batch.delete(db.collection("tournaments").doc(id));
  await batch.commit();
}

/** 한 영상의 포스터 요청을 전부 404 로 — 원본이 지워진 영상(㉣)처럼. */
async function breakVideo(page: Page, videoId: string): Promise<void> {
  await page.route(`https://i.ytimg.com/vi/${videoId}/**`, (route) => route.fulfill({ status: 404, body: "" }));
}

test.beforeEach(({ page }) => {
  consoleErrors = [];
  page.on("console", (m: ConsoleMessage) => {
    if (m.type() !== "error") return;
    const text = m.text();
    if (IGNORED_CONSOLE.some((re) => re.test(text))) return;
    consoleErrors.push(text);
  });
});

test.afterEach(() => {
  expect(consoleErrors, `Console errors:\n${consoleErrors.join("\n")}`).toHaveLength(0);
});

test.afterAll(async () => {
  for (const id of seededIds) await unseed(id);
});

test.describe("THUMB-1 — The Pitch", () => {
  test.skip(!process.env.PREVIEW_URL, "PREVIEW_URL not set");

  test("① 화이트 · 카드 커버 = 16:9 VS 장면 · 제목은 커버 안 · 참가하기", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/?lang=en");
    const pitch = page.locator("main.pitch");
    await expect(pitch).toHaveAttribute("data-theme", "light");
    await expect(pitch).toHaveCSS("background-color", "rgb(242, 242, 245)"); // --color-bg-light

    const card = page.locator(".pitch .tcard").first();
    await expect(card).toBeVisible();
    const cover = card.locator("[data-testid^='tcard-cover-']").first();
    const box = await cover.boundingBox();
    expect(box && Math.abs(box.width / box.height - 16 / 9) < 0.02, "커버 16:9").toBe(true);
    await expect(cover.getByText("VS", { exact: true })).toBeVisible();
    await expect(cover.locator("[data-testid$='-title']")).toHaveCSS("font-size", "17px");
    await expect(card.locator(".tcard-enter")).toHaveText("Pick Now");
    // 커버 위 금지: 라운드 라벨 · LIVE · 수치
    await expect(page.getByText(/ROUND OF|^LIVE$|\d+%/)).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBe(0);
  });

  test("② 배너 pitch-between — 970×90 · 728×90 · 320×100(D-74) · 휴대폰 가로 없음 · 런칭 전 사전등록 안내", async ({ page }) => {
    const slot = page.locator("[data-banner-slot='pitch-between']");

    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/?lang=ko");
    await expect(slot).toHaveAttribute("data-banner-variant", "leaderboard");
    const d = await slot.boundingBox();
    expect([Math.round(d!.width), Math.round(d!.height)]).toEqual([970, 90]);
    if ((await slot.getAttribute("data-banner-source")) === "default") {
      if (Date.now() < LAUNCH_AT_MS) {
        await expect(slot.locator("a")).toHaveAttribute("href", "/launch");
        await expect(slot).toContainText("사전등록에 참가하세요!");
      } else {
        await expect(slot.locator("a[href='/launch']")).toHaveCount(0);
      }
    }

    // 970 이 안 들어가는 폭 = 728×90 (D-74 — 727 같은 중간 크기 ×, 320 으로 내리기 ×)
    await page.setViewportSize({ width: 900, height: 1000 });
    await expect.poll(async () => Math.round((await slot.boundingBox())!.width)).toBe(728);
    expect(Math.round((await slot.boundingBox())!.height)).toBe(90);

    await page.setViewportSize({ width: 390, height: 844 });
    await expect.poll(async () => Math.round((await slot.boundingBox())!.width)).toBe(320);
    const m = await slot.boundingBox();
    expect(Math.round(m!.width)).toBe(320);
    expect(Math.round(m!.height)).toBeGreaterThanOrEqual(100);
    await expect(page.locator(".pitch .tcard [data-testid$='-title']").first()).toHaveCSS("font-size", "15px");

    await page.setViewportSize({ width: 844, height: 390 });
    await expect(slot).toHaveCount(0);
  });

  test.describe("심은 대회", () => {
    test.skip(!process.env.FIREBASE_ADMIN_SDK_KEY, "admin SDK 키가 없으면 대회를 심을 수 없다(CI 전용)");

    test("③ 고른 A·B → 그림 깨짐(㉣)이면 앞 번호 → 엔트리가 지워져도 대체", async ({ page }) => {
      const s = await seed();
      seededIds.push(s.id);
      await page.setViewportSize({ width: 1440, height: 900 });

      // 고른 그대로 — A = 3번(a, 22%) · B = 4번(b, 78%)
      await page.goto("/?lang=en");
      const cover = page.locator(`.tcard-cover:has([data-testid='tcard-cover-${s.id}'])`);
      await expect(cover).toHaveAttribute("data-cover-a", s.c[2]);
      await expect(cover).toHaveAttribute("data-cover-b", s.c[3]);
      const imgA = cover.getByTestId("vsthumb-a-img");
      await expect(imgA).toHaveAttribute("src", new RegExp(VID.a));
      await expect(imgA).toHaveCSS("object-position", "22% 50%");
      await expect(cover.locator("[data-testid$='-title']")).toHaveText(TITLE);

      // ㉣ A 원본이 사라짐 → 영상 있는 앞 번호(2번 · c) · 위치 기본 50
      await breakVideo(page, VID.a);
      await page.reload();
      await expect(cover).toHaveAttribute("data-cover-a", s.c[1]);
      await expect(cover).toHaveAttribute("data-cover-b", s.c[3]);
      await expect(cover.getByTestId("vsthumb-a-img")).toHaveCSS("object-position", "50% 50%");
      await page.unroute(`https://i.ytimg.com/vi/${VID.a}/**`);

      // B 엔트리 문서가 지워짐 → 남은 앞 번호(A 와 겹치지 않게) = 2번
      await ensureAdmin()!.firestore().collection("contestants").doc(s.c[3]).delete();
      await page.reload();
      await expect(cover).toHaveAttribute("data-cover-a", s.c[2]);
      await expect(cover).toHaveAttribute("data-cover-b", s.c[1]);
    });

    test("④ 관리자 목록 — 고른 그림이 깨지면 '대표 매치 그림 깨짐'", async ({ page }) => {
      const { id: seededId } = await seed();
      seededIds.push(seededId);
      await page.setViewportSize({ width: 1600, height: 1000 }); // The Lab ≥1440
      await page.goto("/admin/lab?lang=ko");
      const row = page.getByTestId(`tournament-row-${seededId}`);
      await expect(row).toBeVisible({ timeout: 20_000 });
      await expect(row.getByTestId(`cover-broken-${seededId}`)).toHaveCount(0);

      await breakVideo(page, VID.a);
      await page.reload();
      await expect(row.getByTestId(`cover-broken-${seededId}`)).toHaveText("⚠️ 대표 매치 그림 깨짐");
    });
  });
});
