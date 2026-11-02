/**
 * ARENA-2 PR 1 E2E — 아레나 홈 /arena (원장 D-37 · D-63 · D-68 · D-69 · D-71 · 킥 §4).
 *
 *   ① 전광판 기본 · ?t= · 입장하기 → 매치 무대
 *   ② 진행 중 줄 클릭 → 전광판 교체(?t=) · 뒤로 가기
 *   ③ 카테고리 탭 → ?cat= · 진행 중과 마감 게시판을 함께 거름
 *   ④ 게시판 10줄/쪽 · 마감 최신순 · 검색(제목 en · 챔피언 이름) · 결과 없음
 *   ⑤ 휴대폰 390 — 엔트리 6줄(12명) + 더 보기
 *   ⑥ 배너·광고 칸 빈 상자 0
 *   ⑦ 피치 카드 → /arena?t=
 *   ⑧ 챔피언 없는(10판 미만 · 캐시 없음) 마감 대회는 게시판과 Record Room 에서 빠지고 차트 주소는 열린다 (D-72)
 *   ⑨ 추천 대회(PR 2 · D-70) — 전광판 대회 제외 · 같은 카테고리 먼저 · 탭 거르기 · 카드 → 전광판 · 입장하기 · 뉴스 칸 3개
 *   ⑩ 가로 띠 배너 = 970×90 · 728×90 · 320×100 만 (D-74) — 1024 에서 띠 옆 칸은 숨김
 *
 * 기사는 심지 않는다 — 뉴스룸(/news)엔 시험 기사를 거르는 칸이 없어 실서비스 팬에게 보인다.
 * 뉴스 칸의 기사 고르기·그리기는 유닛(arenaPicks · picksView)이 본다.
 *
 * admin SDK 로 진행 중 3개 · 마감 11개(전부 챔피언 캐시) + 챔피언 없는 마감 2개를 잠깐 심고 끝나면 지운다. 미리보기는
 * 실서비스와 같은 DB 라 다른 대회가 섞여 있다 — 이번 실행의 표식(RUN)으로 검색해 우리 것만 센다.
 * "마감 대회가 하나도 없을 때"(정본 D-5)는 여기서 만들 수 없어 유닛(closedBoardView.test)이 본다.
 * `?lang=` 로 언어를 고정한다.
 */
import { expect, test, type ConsoleMessage, type Page } from "@playwright/test";
import * as admin from "firebase-admin";
import { e2eMark } from "./e2eMark";

const RUN = `r${Date.now().toString(36)}`;
const DESKTOP = { width: 1440, height: 900 };
const PHONE = { width: 390, height: 844 };
const MIN = 60_000;

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

let consoleErrors: string[] = [];
const seeded = { tournaments: [] as string[], contestants: [] as string[], caches: [] as string[] };
let A1 = "";
let A2 = "";
let A3 = "";
let closedIds: string[] = [];
let hiddenIds: string[] = [];
const CHAMP_INDEX = 4;
const CHAMP_EN = `Arena2Champ${RUN}`;

function ensureAdmin(): typeof admin | null {
  if (admin.apps.length > 0) return admin;
  const raw = process.env.FIREBASE_ADMIN_SDK_KEY;
  if (!raw) return null;
  const json = raw.trim().startsWith("{") ? raw : Buffer.from(raw, "base64").toString("utf8");
  admin.initializeApp({ credential: admin.credential.cert(JSON.parse(json) as admin.ServiceAccount) });
  return admin;
}

const activeTitle = (n: number) => ({ ko: `아레나2 진행 ${RUN} ${n}`, en: `Arena2 Active ${RUN} ${n}`, es: `Arena2 Activo ${RUN} ${n}` });
const closedTitle = (n: number) => {
  const nn = String(n).padStart(2, "0");
  return { ko: `아레나2 마감 ${RUN} ${nn}`, en: `Arena2 Closed ${RUN} ${nn}`, es: `Arena2 Cerrado ${RUN} ${nn}` };
};

async function seed(): Promise<void> {
  const a = ensureAdmin()!;
  const db = a.firestore();
  const now = Date.now();
  const hostUid = process.env.TEST_UID ?? "e2e";
  const batch = db.batch();
  const ts = (ms: number) => a.firestore.Timestamp.fromMillis(ms);

  // 진행 중 3개 — 마감이 가장 가까운 순이 되게(목록 앞쪽에 보이게) 몇 분 뒤로.
  const cats = ["KPOP", "CREATOR", "KPOP"];
  const actives = cats.map((category, i) => {
    const ref = db.collection("tournaments").doc();
    const title = activeTitle(i + 1);
    batch.set(ref, {
      title: title.ko,
      titleI18n: title,
      description: { ko: `설명 ${RUN}`, en: `About ${RUN}`, es: `Sobre ${RUN}` },
      category,
      status: "active",
      ...e2eMark(), // OPS-FIX-1 · D-66
      featured: false,
      hostUid,
      totalContestants: 48,
      createdAt: ts(now),
      tournamentDeadline: ts(now + 30 * MIN + i * MIN),
    });
    return ref;
  });
  [A1, A2, A3] = actives.map((r) => r.id);
  seeded.tournaments.push(A1, A2, A3);

  // A1 엔트리 14명(휴대폰 12명 + 더 보기) · A2 · A3 는 2명.
  actives.forEach((t, ti) => {
    const n = ti === 0 ? 14 : 2;
    for (let i = 1; i <= n; i++) {
      const c = db.collection("contestants").doc();
      seeded.contestants.push(c.id);
      batch.set(c, { tournamentId: t.id, hostUid, order: i, name: `엔트리${ti + 1}-${i}`, nameI18n: { ko: `엔트리${ti + 1}-${i}`, en: `Entry${ti + 1}-${i}`, es: `Entry${ti + 1}-${i}` } });
    }
  });

  // 마감 11개 — i=0 이 가장 최근에 마감. 카테고리는 3개 중 1개꼴로 CREATOR.
  closedIds = [];
  for (let i = 0; i < 11; i++) {
    const ref = db.collection("tournaments").doc();
    const title = closedTitle(i);
    batch.set(ref, {
      title: title.ko,
      titleI18n: title,
      category: i % 3 === 0 ? "CREATOR" : "KPOP",
      status: "active",
      ...e2eMark(),
      featured: false,
      hostUid,
      totalContestants: 48,
      createdAt: ts(now - 2 * 86_400_000),
      tournamentDeadline: ts(now - (i + 1) * MIN),
    });
    closedIds.push(ref.id);
    seeded.tournaments.push(ref.id);
  }
  // 챔피언 = 차트 캐시 1위(10판 이상일 때만 · chartChampion). 11개 모두 챔피언이 있다 —
  // 챔피언이 없는 마감 대회는 게시판에 오지 않는다(D-72). 검색용 이름은 CHAMP_INDEX 하나만.
  closedIds.forEach((id, i) => {
    const en = i === CHAMP_INDEX ? CHAMP_EN : `Crowned${RUN}x${i}`;
    const ko = i === CHAMP_INDEX ? `챔프${RUN}` : `왕관${RUN}x${i}`;
    batch.set(db.doc(`ranking_cache/${id}`), {
      tournamentId: id,
      runsTotal: 12,
      totalVotes: 0,
      rankings: [{ contestantId: "x", name: ko, nameI18n: { ko, en, es: en }, crownScore: 900 }],
    });
    seeded.caches.push(id);
  });

  // 챔피언 없는 마감 2개 — 9판 캐시 하나 · 캐시 없음 하나. 마감 시각을 위 줄들 사이에 끼운다
  // (개수만이 아니라 순서 한가운데서도 빠지는지 본다).
  hiddenIds = [];
  for (const [i, runs] of [[0, 9], [1, null]] as const) {
    const ref = db.collection("tournaments").doc();
    batch.set(ref, {
      title: `아레나2 소수 ${RUN} ${i}`,
      titleI18n: { ko: `아레나2 소수 ${RUN} ${i}`, en: `Arena2 Few ${RUN} ${i}`, es: `Arena2 Pocos ${RUN} ${i}` },
      category: "KPOP",
      status: "active",
      ...e2eMark(),
      featured: false,
      hostUid,
      totalContestants: 48,
      createdAt: ts(now - 2 * 86_400_000),
      tournamentDeadline: ts(now - (i * 4 + 1.5) * MIN),
    });
    if (runs !== null) {
      batch.set(db.doc(`ranking_cache/${ref.id}`), {
        tournamentId: ref.id,
        runsTotal: runs,
        totalVotes: 0,
        rankings: [{ contestantId: "x", name: `소수${RUN}`, crownScore: 0 }],
      });
      seeded.caches.push(ref.id);
    }
    hiddenIds.push(ref.id);
    seeded.tournaments.push(ref.id);
  }
  await batch.commit();
}

async function unseed(): Promise<void> {
  const a = ensureAdmin();
  if (!a) return;
  const db = a.firestore();
  const batch = db.batch();
  for (const id of seeded.contestants) batch.delete(db.collection("contestants").doc(id));
  for (const id of seeded.tournaments) batch.delete(db.collection("tournaments").doc(id));
  for (const id of seeded.caches) batch.delete(db.doc(`ranking_cache/${id}`));
  await batch.commit();
}

/** 동의 바가 화면을 가리지 않게 — 저장된 동의 쿠키(NAV-1 prime 과 같은 값). */
async function prime(page: Page, baseURL: string | undefined) {
  const savedAt = Date.now() - 24 * 60 * 60 * 1000;
  await page.context().addCookies([{ name: "wc48_consent", value: `1.0.${savedAt}`, url: baseURL ?? "http://localhost:3000" }]);
}

/**
 * 화면은 서버가 그려 보내 클릭보다 먼저 보인다 — 엔트리(화면이 직접 읽음)가 뜨면 화면이 살아난 것.
 * 전광판이 A1 인 주소에서만 쓴다(엔트리가 있는 대회).
 */
async function ready(page: Page) {
  await expect(page.getByTestId("arena-board-entry").first()).toBeVisible({ timeout: 15_000 });
}

/** 진행 중 목록에서 그 대회 줄이 보일 때까지 "더 보기". */
async function revealRow(page: Page, id: string) {
  const row = page.locator(`[data-testid='arena-active-row'][data-tid='${id}']`);
  for (let i = 0; i < 10 && (await row.count()) === 0; i++) {
    const more = page.getByTestId("arena-active-more");
    if ((await more.count()) === 0) break;
    await more.click();
  }
  await expect(row).toBeVisible();
  return row;
}

test.beforeEach(({ page }) => {
  consoleErrors = [];
  page.on("console", (m: ConsoleMessage) => {
    if (m.type() !== "error") return;
    const text = m.text();
    if (IGNORED_CONSOLE.some((re) => re.test(text))) return;
    consoleErrors.push(text);
  });
  page.on("pageerror", (e) => consoleErrors.push(`pageerror: ${e.message}`));
});

test.afterEach(() => {
  expect(consoleErrors, `Console errors:\n${consoleErrors.join("\n")}`).toHaveLength(0);
});

test.describe("ARENA-2 — 아레나 홈", () => {
  test.skip(!process.env.PREVIEW_URL, "PREVIEW_URL not set");
  test.skip(!process.env.FIREBASE_ADMIN_SDK_KEY, "FIREBASE_ADMIN_SDK_KEY not set");
  test.describe.configure({ mode: "serial" });

  test.beforeAll(async () => {
    await seed();
  });
  test.afterAll(async () => {
    await unseed();
  });

  test("① 전광판 — 기본 · ?t= · 입장하기 → 매치 무대 · 화이트", async ({ page, baseURL }) => {
    await page.setViewportSize(DESKTOP);
    await prime(page, baseURL);
    await page.goto("/arena?lang=en");
    const main = page.getByTestId("arena-home");
    await expect(main).toHaveAttribute("data-theme", "light");
    await expect(main).toHaveCSS("background-color", "rgb(242, 242, 245)"); // --color-bg-light
    const boardId = await page.getByTestId("arena-board").getAttribute("data-board-id");
    expect(boardId).toBeTruthy();
    await expect(page.getByTestId("arena-board-enter")).toHaveAttribute("href", `/arena/${boardId}`);

    await page.goto(`/arena?t=${A1}&lang=en`);
    await expect(page.getByTestId("arena-board")).toHaveAttribute("data-board-id", A1);
    await expect(page.getByTestId("arena-board-title")).toHaveText(activeTitle(1).en);
    await expect(page.getByTestId("arena-board-entry")).toHaveCount(14);
    await expect(page.getByTestId("arena-board-entry").first()).toContainText("Entry1-1");
    // 마감 대회 id 를 ?t= 로 줘도 대기실은 없다 — 기본 전광판으로(D-37).
    await page.goto(`/arena?t=${closedIds[0]}&lang=en`);
    await expect(page.getByTestId("arena-board")).not.toHaveAttribute("data-board-id", closedIds[0]);

    await page.goto(`/arena?t=${A1}&lang=en`);
    await ready(page);
    await page.getByTestId("arena-board-enter").click();
    await expect(page).toHaveURL(new RegExp(`/arena/${A1}(\\?|$)`));
  });

  test("② 진행 중 줄의 빈 자리를 누르면 전광판이 바뀐다 · 뒤로 가기", async ({ page, baseURL }) => {
    await page.setViewportSize(DESKTOP);
    await prime(page, baseURL);
    await page.goto(`/arena?t=${A1}&lang=en`);
    await ready(page);
    const row = await revealRow(page, A3);
    await expect(row.getByTestId("arena-active-enter")).toHaveAttribute("href", `/arena/${A3}`);
    const box = await row.boundingBox();
    // 줄 오른쪽 위 빈 자리(제목·버튼이 아닌 곳). 줄이 첫 화면 아래에 있으니 locator 클릭으로
    // 스크롤해 누른다(page.mouse 는 화면 밖 좌표를 누르지 못한다).
    await row.click({ position: { x: box!.width - 12, y: 8 } });
    await expect(page).toHaveURL(new RegExp(`/arena\\?t=${A3}$`));
    await expect(page.getByTestId("arena-board")).toHaveAttribute("data-board-id", A3);
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeLessThan(50);
    await expect(row).toHaveAttribute("data-on-board", "true");
    await page.goBack();
    await expect(page.getByTestId("arena-board")).toHaveAttribute("data-board-id", A1);
  });

  test("③ 카테고리 탭 — ?cat= · 진행 중과 마감 게시판을 함께 거른다 (D-63)", async ({ page, baseURL }) => {
    await page.setViewportSize(DESKTOP);
    await prime(page, baseURL);
    await page.goto(`/arena?t=${A1}&lang=en`);
    await ready(page);
    await page.getByTestId("arena-tab-creator").click();
    await expect(page).toHaveURL(new RegExp(`/arena\\?t=${A1}&cat=creator$`));
    await expect(page.getByTestId("arena-tab-creator")).toHaveAttribute("aria-current", "true");
    await revealRow(page, A2);
    await expect(page.locator(`[data-testid='arena-active-row'][data-tid='${A1}']`)).toHaveCount(0);
    // 전광판은 탭과 무관하게 그대로
    await expect(page.getByTestId("arena-board")).toHaveAttribute("data-board-id", A1);
    await page.getByTestId("arena-search").fill(RUN);
    // CREATOR = i % 3 === 0 → 0 · 3 · 6 · 9
    await expect(page.getByTestId("arena-closed-row")).toHaveCount(4);
    // 새로고침해도 탭이 남는다(주소가 상태)
    await page.reload();
    await ready(page);
    await expect(page.getByTestId("arena-tab-creator")).toHaveAttribute("aria-current", "true");
    await page.getByTestId("arena-tab-all").click();
    await expect(page).toHaveURL(new RegExp(`/arena\\?t=${A1}$`));
  });

  test("④ 마감 게시판 — 10줄/쪽 · 최신순 · 검색(제목 en · 챔피언) · 랭킹 보기 → 차트", async ({ page, baseURL }) => {
    await page.setViewportSize(DESKTOP);
    await prime(page, baseURL);
    await page.goto(`/arena?t=${A1}&lang=ko`);
    await ready(page);
    await page.getByTestId("arena-search").fill(RUN);
    const rows = page.getByTestId("arena-closed-row");
    await expect(rows).toHaveCount(10);
    const ids = await rows.evaluateAll((els) => els.map((e) => e.getAttribute("data-tid")));
    expect(ids).toEqual(closedIds.slice(0, 10));
    await expect(rows.first()).toHaveAttribute("href", `/arena/${closedIds[0]}/ranking`);
    await expect(rows.first()).toContainText("랭킹 보기");
    await page.getByTestId("arena-closed-next").click();
    await expect(rows).toHaveCount(1);
    await expect(rows.first()).toHaveAttribute("data-tid", closedIds[10]);

    // 화면은 한국어인데 영어 제목으로 찾는다
    await page.getByTestId("arena-search").fill(closedTitle(7).en);
    await expect(rows).toHaveCount(1);
    await expect(rows.first()).toHaveAttribute("data-tid", closedIds[7]);

    // 챔피언 이름(영어 표기)으로 찾는다
    await page.getByTestId("arena-search").fill(CHAMP_EN.toLowerCase());
    await expect(rows).toHaveCount(1);
    await expect(rows.first()).toHaveAttribute("data-tid", closedIds[CHAMP_INDEX]);
    await expect(rows.first().getByTestId("arena-closed-champion")).toHaveText(`챔프${RUN}`);

    await page.getByTestId("arena-search").fill(`zz-${RUN}-none`);
    await expect(page.getByTestId("arena-closed-noresult")).toBeVisible();

    await page.getByTestId("arena-search").fill(CHAMP_EN);
    await rows.first().click();
    await expect(page).toHaveURL(new RegExp(`/arena/${closedIds[CHAMP_INDEX]}/ranking`));
  });

  test("⑤ 휴대폰 390 — 엔트리 6줄(12명) + 더 보기 · 진행 중 카드 · 배너 320×100", async ({ page, baseURL }) => {
    await page.setViewportSize(PHONE);
    await prime(page, baseURL);
    await page.goto(`/arena?t=${A1}&lang=ko`);
    await ready(page);
    await expect(page.getByTestId("arena-board-entry")).toHaveCount(14);
    await expect(page.locator("[data-testid='arena-board-entry']:visible")).toHaveCount(12);
    const more = page.getByTestId("arena-board-entries-more");
    await expect(more).toHaveText("엔트리 더 보기");
    await more.click();
    await expect(page.locator("[data-testid='arena-board-entry']:visible")).toHaveCount(14);
    await expect(more).toHaveAttribute("aria-expanded", "true");
    const banner = page.locator("[data-banner-slot='arena-between']");
    await expect(banner).toHaveAttribute("data-banner-variant", "leaderboard");
    const bb = await banner.boundingBox();
    expect([Math.round(bb!.width), Math.round(bb!.height)]).toEqual([320, 100]);
    await expect(page.locator("[data-banner-slot='arena-beside']")).toHaveCount(0); // 300×90 = 데스크톱만
    // 추천 대회 — 휴대폰은 2열 · 처음 4개까지
    expect(await page.getByTestId("arena-rec-card").count()).toBeLessThanOrEqual(4);
    const docWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(docWidth).toBeLessThanOrEqual(390);
  });

  test("⑥ 배너·광고 칸 — 빈 상자 0 (D-21 · D-69)", async ({ page, baseURL }) => {
    await page.setViewportSize(DESKTOP);
    await prime(page, baseURL);
    await page.goto("/arena?lang=en");
    const slots = page.getByTestId("banner-slot");
    await expect(slots).toHaveCount(5); // 진행 중 대회가 둘 이상이라 추천 구역(+ 칸)이 있다
    for (const name of ["arena-between", "arena-beside", "arena-side-active", "arena-side-recommend", "arena-side-closed"]) {
      const s = page.locator(`[data-banner-slot='${name}']`);
      await expect(s).toBeVisible();
      expect((await s.innerText()).trim().length, name).toBeGreaterThan(0);
    }
    const size = async (name: string) => page.locator(`[data-banner-slot='${name}']`).boundingBox();
    expect((await size("arena-between"))?.width).toBe(970);
    expect((await size("arena-beside"))?.width).toBe(300);
    expect((await size("arena-side-active"))?.width).toBe(300);
    expect((await size("arena-side-active"))?.height).toBeGreaterThanOrEqual(250);
  });

  test("⑦ 피치 카드 → /arena?t= (대기실을 거쳐 매치로 · D-71)", async ({ page, baseURL }) => {
    await page.setViewportSize(DESKTOP);
    await prime(page, baseURL);
    await page.goto("/?lang=en");
    const card = page.locator(`.pitch .tcard[href='/arena?t=${A1}']`);
    await expect(card).toBeVisible({ timeout: 15_000 });
    await expect(page.locator(".pitch .tcard[href^='/arena/']")).toHaveCount(0);
    await card.click();
    await expect(page).toHaveURL(new RegExp(`/arena\\?t=${A1}$`));
    await expect(page.getByTestId("arena-board")).toHaveAttribute("data-board-id", A1);
  });

  test("⑧ 챔피언 없는 마감 대회 — 게시판 · Record Room 에서 빠지고 차트 주소는 그대로 (D-72)", async ({ page, baseURL }) => {
    await page.setViewportSize(DESKTOP);
    await prime(page, baseURL);
    await page.goto(`/arena?t=${A1}&lang=en`);
    await ready(page);
    await page.getByTestId("arena-search").fill(`Arena2 Few ${RUN}`);
    await expect(page.getByTestId("arena-closed-noresult")).toBeVisible();
    await expect(page.getByTestId("arena-closed-row")).toHaveCount(0);

    await page.goto("/records?lang=en");
    await expect(page.getByTestId("records-ended")).toBeVisible();
    const ended = page.getByTestId("records-ended");
    await expect(ended.locator(`[data-tid='${closedIds[CHAMP_INDEX]}']`)).toHaveCount(1);
    for (const id of hiddenIds) await expect(ended.locator(`[data-tid='${id}']`)).toHaveCount(0);

    // 숨기기만 한다 — 차트 주소는 열린다(대회 데이터 삭제 없음).
    const res = await page.goto(`/arena/${hiddenIds[0]}/ranking?lang=en`);
    expect(res?.status()).toBe(200);
  });
  test("⑨ 추천 대회 — 전광판 제외 · 같은 카테고리 먼저 · 탭 · 카드 → 전광판 · 뉴스 칸 3개 (D-70)", async ({ page, baseURL }) => {
    await page.setViewportSize(DESKTOP);
    await prime(page, baseURL);
    await page.goto(`/arena?t=${A1}&lang=en`);
    await ready(page);
    const rec = page.getByTestId("arena-rec");
    await expect(rec.getByRole("heading", { level: 2 })).toHaveText("Recommended Tournaments");
    const cards = page.getByTestId("arena-rec-card");
    // 다 펼친다
    for (let i = 0; i < 10 && (await page.getByTestId("arena-rec-more").count()) > 0; i++) {
      await page.getByTestId("arena-rec-more").click();
    }
    const ids = await cards.evaluateAll((els) => els.map((e) => e.getAttribute("data-tid")));
    expect(ids).not.toContain(A1); // 전광판 대회는 빠진다
    expect(ids).toContain(A2);
    expect(ids).toContain(A3);
    expect(ids.indexOf(A3)).toBeLessThan(ids.indexOf(A2)); // A1 과 같은 KPOP 인 A3 가 CREATOR A2 보다 먼저

    const card = page.locator(`[data-testid='arena-rec-card'][data-tid='${A3}']`);
    await expect(card.getByTestId("arena-rec-enter")).toHaveAttribute("href", `/arena/${A3}`);
    const box = await card.boundingBox();
    await card.click({ position: { x: box!.width - 12, y: 8 } }); // 그림 자리 = 카드의 빈 자리
    await expect(page).toHaveURL(new RegExp(`/arena\\?t=${A3}$`));
    await expect(page.getByTestId("arena-board")).toHaveAttribute("data-board-id", A3);
    await expect(page.locator(`[data-testid='arena-rec-card'][data-tid='${A3}']`)).toHaveCount(0);

    // 탭 = 추천도 거른다
    await page.getByTestId("arena-tab-creator").click();
    const creatorIds = await cards.evaluateAll((els) => els.map((e) => e.getAttribute("data-tid")));
    expect(creatorIds).toContain(A2);
    expect(creatorIds).not.toContain(A1);

    // 뉴스 칸 3개 — 기사 줄이거나 "뉴스 없음" 모양 중 하나(빈 상자 없음)
    for (const id of ["arena-news-category", "arena-news-recommend", "arena-news-closed"]) {
      const items = await page.getByTestId(`${id}-item`).count();
      const empty = await page.getByTestId(`${id}-empty`).count();
      expect(items > 0 || empty === 1, id).toBe(true);
      expect(items).toBeLessThanOrEqual(3);
    }
  });

  test("⑩ 가로 띠 배너 = 표준 크기만 (970×90 · 728×90 · 320×100 · D-74)", async ({ page, baseURL }) => {
    await prime(page, baseURL);
    const banner = page.locator("[data-banner-slot='arena-between']");
    const beside = page.locator("[data-banner-slot='arena-beside']");
    const dims = async () => {
      const b = await banner.boundingBox();
      return `${Math.round(b!.width)}x${Math.round(b!.height)}`;
    };
    // 1440 — 970×90 과 띠 옆 300×90 이 나란히
    await page.setViewportSize(DESKTOP);
    await page.goto("/arena?lang=ko");
    await expect.poll(dims).toBe("970x90");
    await expect(beside).toBeVisible();
    // 1024 — 728 + 띠 옆이 안 들어가 띠 옆을 숨기고, 띠 폭(976)에 970 이 들어가 970×90 (727×90 ×)
    await page.setViewportSize({ width: 1024, height: 768 });
    await expect.poll(dims).toBe("970x90");
    await expect(beside).toBeHidden();
    // 그 사이 어떤 폭에서도 세 표준 크기 중 하나
    for (const w of [1300, 1180, 960, 900, 768, 600]) {
      await page.setViewportSize({ width: w, height: 1000 });
      await expect.poll(dims, { message: `${w}` }).toMatch(/^(970x90|728x90|320x100)$/);
    }
  });
});
