/**
 * ARENA-1 PR 1 — VS 스플릿 무대 E2E (원장 D-08 · D-11 · D-12 · D-17 · D-21).
 *
 *   ① 스플릿 렌더 — 1440 데스크톱 / 390×844 모바일 세로 / 844×390 모바일 가로
 *   ② 무대 금지 4종 부재 — 라운드 라벨 · 득표율 · 마감 타이머 · 개발자 고지문 (R2 · D-11)
 *   ③ 재생 iframe ≤ 1 · 진입 시 0 (R3 · R4 자동재생 금지)
 *   ④ 모바일 1탭 = arm(선택 안 나감) / 2탭 = 확정 (D-17)
 *   ⑤ 회전해도 진행 유지 — 리로드·리마운트 없이 같은 매치, 가로에선 메뉴 없음 (D-17 ①③)
 *   ⑥ 세로 숏츠 참가자 — 원본 비율 포스터(oar2) + 위 40% 크롭 (D-11 · D-14 · D-15)
 *   ⑦ 배너 자리 기본 공지 3언어 — 빈 상자 0 (D-21)
 *
 * 시드·정리는 c1-arena-flow 와 같은 방식(firebase-admin). 이 스펙의 Tournament 를 따로 둬
 * 판 원장(tournament_runs)이 다른 스펙과 섞이지 않게 한다. i18n 의존 단언은 ?lang= 고정.
 * CI(프리뷰 + 시크릿)에서 돈다 — 로컬 아님.
 */
import { expect, test, type Page } from "@playwright/test";
import * as admin from "firebase-admin";
import { round1OrderedIds } from "@/lib/arena/matches";

const TID = "arena1-e2e-tournament";
const UID = process.env.C1_TEST_UID ?? "";
const E2E_SEED = 1;

/** 세로 숏츠(9:16) · 가로(16:9) 실제 임베드 id. 재생 성공 여부는 단언하지 않는다(외부 영상). */
const PORTRAIT_VIDEO = "0UtKS4wCjKM";
const LANDSCAPE_VIDEO = "9bZkp7q19f0";

let consoleErrors: string[] = [];

function loadServiceAccount(): admin.ServiceAccount | null {
  const raw = process.env.FIREBASE_ADMIN_SDK_KEY;
  if (!raw) return null;
  const decoded = raw.trim().startsWith("{") ? raw : Buffer.from(raw, "base64").toString("utf8");
  return JSON.parse(decoded) as admin.ServiceAccount;
}
function db(): admin.firestore.Firestore {
  if (admin.apps.length === 0) {
    const sa = loadServiceAccount();
    if (!sa) throw new Error("FIREBASE_ADMIN_SDK_KEY required for ARENA-1 E2E.");
    admin.initializeApp({ credential: admin.credential.cert(sa) });
  }
  return admin.firestore();
}

/** 시드된 1라운드 순서 — m0 = [0, 1]. */
function seededRound1Ids(): string[] {
  const contestants = Array.from({ length: 48 }, (_, i) => ({ id: `${TID}_c${i + 1}`, order: i + 1 }));
  return round1OrderedIds(contestants, E2E_SEED);
}
const nameOf = (id: string) => `P${id.slice(`${TID}_c`.length)}`;

async function seedTournament(): Promise<void> {
  const d = db();
  const batch = d.batch();
  batch.set(d.doc(`tournaments/${TID}`), {
    title: "ARENA-1 Split Stage",
    titleI18n: { ko: "ARENA-1 스플릿 무대", en: "ARENA-1 Split Stage", es: "ARENA-1 Escenario" },
    description: { ko: "무대 E2E", en: "Stage E2E", es: "Escenario E2E" },
    category: "KPOP",
    status: "active",
    hostUid: "seed-operator",
    currentRound: 1,
    totalContestants: 48,
    settings: { aiNews: false, multiLang: false, showRanking: true },
    featured: false,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  // m0 의 왼쪽 = 세로 숏츠, 오른쪽 = 가로 영상. 나머지는 영상 없음(이니셜 포스터).
  const [m0Left, m0Right] = seededRound1Ids();
  for (let i = 1; i <= 48; i++) {
    const id = `${TID}_c${i}`;
    const media =
      id === m0Left
        ? { type: "embed", embed: { videoId: PORTRAIT_VIDEO, start: 5, end: 20, orientation: "portrait", focusY: 40 } }
        : id === m0Right
          ? { type: "embed", embed: { videoId: LANDSCAPE_VIDEO, start: 60, end: 75 } }
          : null;
    batch.set(d.doc(`contestants/${id}`), {
      tournamentId: TID,
      hostUid: "seed-operator",
      order: i,
      name: `P${i}`,
      nationality: "KR",
      affiliation: "E2E",
      imageSearchKeyword: `p${i}`,
      ...(media ? { media } : {}),
    });
  }
  await batch.commit();
}

/** 이 Voter 의 이 Tournament 판 상태를 전부 지운다 — 매 테스트 m0 에서 시작 (ADR-0004). */
async function resetVoterProgress(): Promise<void> {
  const d = db();
  const snap = await d.collection("votes").where("userId", "==", UID).where("tournamentId", "==", TID).get();
  const batch = d.batch();
  snap.forEach((doc) => batch.delete(doc.ref));
  await batch.commit();
  await d.doc(`tournament_runs/${UID}_${TID}`).delete().catch(() => {});
  for (let r = 1; r <= 5; r++) {
    const suffix = r === 1 ? "" : `_r${r}`;
    await d.doc(`roundProgress/${UID}_${TID}${suffix}`).delete().catch(() => {});
    await d.doc(`crown_cards/${UID}_${TID}${suffix}`).delete().catch(() => {});
    await d.doc(`bracket_seeds/${UID}_${TID}${suffix}`).delete().catch(() => {});
  }
  // 대진을 결정적으로 (HF-2).
  await d.doc(`bracket_seeds/${UID}_${TID}`).set({
    seed: E2E_SEED,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
}

async function cleanup(): Promise<void> {
  await resetVoterProgress().catch(() => {});
  const d = db();
  await d.doc(`bracket_seeds/${UID}_${TID}`).delete().catch(() => {});
  const snap = await d.collection("contestants").where("tournamentId", "==", TID).get();
  const batch = d.batch();
  snap.forEach((doc) => batch.delete(doc.ref));
  await batch.commit();
  await d.doc(`tournaments/${TID}`).delete().catch(() => {});
}

/** 1라운드 24매치 중 n개를 미리 채운다(관리자 시드) — 진행 지점을 만드는 가장 싼 방법. */
async function seedRound1Votes(n: number): Promise<void> {
  const d = db();
  const ids = seededRound1Ids();
  const batch = d.batch();
  for (let i = 0; i < n; i++) {
    batch.set(d.doc(`votes/${TID}_${UID}_r1_m${i}`), {
      userId: UID,
      tournamentId: TID,
      round: 1,
      matchId: `${TID}:r1:m${i}`,
      contestantId: ids[i * 2],
      date: "2020-01-01", // 과거 날짜 — 오늘의 판 한도에 잡히지 않는다
      runIndex: 1,
      isGuest: false,
    });
  }
  await batch.commit();
}

/**
 * 2~4라운드를 관리자 시드로 채워 **결승만 남긴다**(c1 의 THE FINAL 테스트와 같은 방식).
 * 라운드별 매치 수: 2라운드 12 · 3라운드 6 · 4라운드 3.
 */
async function seedLaterRounds(): Promise<void> {
  const d = db();
  const batch = d.batch();
  for (const [round, count] of [
    [2, 12],
    [3, 6],
    [4, 3],
  ] as const) {
    for (let i = 0; i < count; i++) {
      batch.set(d.doc(`votes/${TID}_${UID}_r${round}_m${i}`), {
        userId: UID,
        tournamentId: TID,
        round,
        matchId: `${TID}:r${round}:m${i}`,
        contestantId: `${TID}_c${i + 1}`,
        date: "2020-01-01",
        runIndex: 1,
        isGuest: false,
      });
    }
  }
  await batch.commit();
}

async function votesFor(): Promise<number> {
  const snap = await db().collection("votes").where("userId", "==", UID).where("tournamentId", "==", TID).get();
  return snap.size;
}

const stage = (page: Page) => page.getByTestId("split-stage");

/** PR 2a — 매치 화면에서 뺀 게스트 안내 (원장 "RUN-1 게스트 안내 · 바뀜 2026-09-20"). */
const GUEST_NOTICE = {
  ko: "로그인 없이 하루 3번까지 참여가 가능해요!",
  en: "Join up to 3 times a day",
  es: "Participa hasta 3 veces al día",
} as const;

/**
 * PR 2a — 전체화면 호출을 세는 스파이.
 *
 * 헤드리스 크로미움에서 실제 전체화면은 불안정해서(요청이 조용히 거부되기도 한다) 화면 크기로
 * 판정할 수 없다. 대신 requestFullscreen/exitFullscreen 을 감싸 **호출 횟수**로 본다.
 * `fullscreenElement` 도 흉내 내어 "이미 전체화면이면 다시 요청하지 않는다"까지 볼 수 있게 한다.
 */
async function installFullscreenSpy(page: Page, opts: { supported?: boolean } = {}): Promise<void> {
  await page.addInitScript((supported: boolean) => {
    const w = window as unknown as { __fsCalls: string[] };
    w.__fsCalls = [];
    let fake: Element | null = null;
    Object.defineProperty(document, "fullscreenElement", {
      configurable: true,
      get: () => fake,
    });
    if (!supported) {
      // 아이폰 사파리 흉내 — 기능 자체가 없다.
      // @ts-expect-error 테스트에서 일부러 지운다
      delete Element.prototype.requestFullscreen;
      return;
    }
    Element.prototype.requestFullscreen = function requestFullscreen(this: Element) {
      w.__fsCalls.push("request");
      fake = this;
      document.dispatchEvent(new Event("fullscreenchange"));
      return Promise.resolve();
    };
    document.exitFullscreen = function exitFullscreen() {
      w.__fsCalls.push("exit");
      fake = null;
      document.dispatchEvent(new Event("fullscreenchange"));
      return Promise.resolve();
    };
  }, opts.supported ?? true);
}

const fsCalls = (page: Page): Promise<string[]> =>
  page.evaluate(() => (window as unknown as { __fsCalls?: string[] }).__fsCalls ?? []);

async function openStage(page: Page, lang = "ko"): Promise<void> {
  await page.goto(`/arena/${TID}?lang=${lang}`);
  await expect(stage(page)).toBeVisible({ timeout: 30_000 });
  await dismissCookieBanner(page);
}

/**
 * 첫 방문 쿠키 배너(하단 고정)는 모바일 가로 390 높이에서 무대 아래쪽을 덮어 탭을 가로챈다.
 * 이 스펙은 무대를 본다 — 배너 자신의 [필수만] 버튼으로 닫고 시작한다. (흔적 쿠키를 미리
 * 심는 방법은 쓸 수 없다: 버전 "1.0" 의 점 때문에 앱이 그 쿠키를 읽지 못한다 — 별도 보고.)
 */
async function dismissCookieBanner(page: Page): Promise<void> {
  const reject = page.getByRole("button", { name: /Reject non-essential/ });
  const shown = await reject
    .waitFor({ state: "visible", timeout: 8_000 })
    .then(() => true)
    .catch(() => false);
  if (!shown) return;
  await reject.click();
  await expect(reject).toBeHidden();
}

async function box(page: Page, selector: string) {
  const b = await page.locator(selector).first().boundingBox();
  if (!b) throw new Error(`no box for ${selector}`);
  return { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height) };
}

test.describe("ARENA-1 VS 스플릿 무대", () => {
  test.skip(!process.env.PREVIEW_URL, "PREVIEW_URL not set — ARENA-1 E2E runs in CI");

  test.beforeAll(async () => {
    await cleanup().catch(() => {});
    await seedTournament();
  });
  test.afterAll(async () => cleanup());

  test.beforeEach(async ({ page }) => {
    // ARENA-1 PR 2b — 첫 입장 안내 팝업(기기당 1회)이 칸 클릭을 가로채지 않게, 이 스펙은
    // "이미 본 기기"로 시작한다. 팝업 자체는 arena1-split-stage 의 전용 테스트가 본다.
    await page.addInitScript(() => {
      try {
        localStorage.setItem("wc48:arena:intro:v1", "1");
      } catch {
        /* 저장소가 막힌 환경 — 그 경우 팝업은 애초에 뜨지 않는다 */
      }
    });
    await resetVoterProgress();

    consoleErrors = [];
    page.on("console", (m) => {
      if (m.type() !== "error") return;
      const t = m.text();
      if (t.includes("Could not reach Cloud Firestore backend")) return;
      // 유튜브 플레이어(제3자 iframe)가 스스로 남기는 로그는 앱의 오류가 아니다.
      const src = m.location()?.url ?? "";
      if (/youtube\.com|ytimg\.com|googlevideo\.com|doubleclick\.net|google\.com/.test(src)) return;
      consoleErrors.push(t);
    });
  });
  test.afterEach(async () => {
    expect(consoleErrors, "Console errors must be 0").toHaveLength(0);
  });

  test.describe("데스크톱 1440", () => {
    test.use({ viewport: { width: 1440, height: 900 } });

    test("① 스플릿 렌더 — 칸 정사각 두 개 맞붙음(틈 0), 프레임 = 칸×2 + 패딩 20, VS 정중앙, 탭 줄 없음", async ({ page }) => {
      await openStage(page);
      await expect(stage(page)).toHaveAttribute("data-stage-mode", "desktop");
      const frame = await box(page, '[data-stage-layer="frame"]');
      const left = await box(page, '[data-testid="vote-left"]');
      const right = await box(page, '[data-testid="vote-right"]');
      // D-17 규칙: 한 변 = min(가로 자리 (1440-120-40)/2=640, 세로 자리 900-프레임위-40), 상한 640.
      // 프레임 윗변은 글꼴 렌더에 따라 몇 px 달라진다(CI 리눅스 222 · 로컬 195) — 숫자가 아니라
      // 규칙을 검산한다. 디자인 값 그대로(1320×680·640)는 아래 "충분히 높은 화면" 테스트가 본다.
      const expected = Math.min(640, Math.floor(900 - frame.y - 40));
      expect([left.w, left.h, right.w, right.h]).toEqual([expected, expected, expected, expected]);
      expect(frame.w).toBe(expected * 2 + 40);
      expect(frame.h).toBe(expected + 40);
      expect(right.x - (left.x + left.w)).toBe(0); // 틈 0
      // D-08 네 층 — 아레나 탭 줄(ModuleNav)은 매치 화면에 없다 (대표 판정 2026-09-19).
      await expect(page.getByTestId("module-nav")).toHaveCount(0);
      await expect(stage(page).getByText("VS", { exact: true })).toBeVisible();
      await page.screenshot({ path: "playwright-report/arena1-desktop-1440.png", fullPage: true });
    });

    test("② 무대 금지 4종 부재 — 라운드 라벨 · 득표율 · 마감 타이머 · 개발자 고지문", async ({ page }) => {
      await openStage(page, "en");
      const text = (await stage(page).innerText()).replace(/\s+/g, " ");
      expect(text).not.toMatch(/ROUND OF|THE FINAL|QUARTER|SEMI/i); // 라운드 라벨
      expect(text).not.toMatch(/\d\s*%/); // 득표율
      expect(text).not.toMatch(/ENDS IN|DEADLINE|\d{1,2}:\d{2}/i); // 마감 타이머
      expect(text).not.toMatch(/No Vote Rate|VOTE 3\/5|No Round|ENDS-IN/i); // vs-foot
      await expect(page.locator('[class*="vsFoot"]')).toHaveCount(0);
      // 선택 버튼 없음 — 칸 자체가 선택 (D-11 조작 ④)
      await expect(stage(page).getByText(/VOTE LEFT|VOTE RIGHT/)).toHaveCount(0);
    });

    test("③ 재생 iframe — 진입 0개, 호버한 쪽 1개, 옆칸으로 옮겨도 ≤ 1", async ({ page }) => {
      await openStage(page);
      await page.mouse.move(5, 5);
      await page.waitForTimeout(1500);
      await expect(stage(page).locator("iframe")).toHaveCount(0); // R4 자동재생 금지
      await expect(page.getByTestId("stage-player")).toHaveCount(0);
      await page.hover('[data-testid="vote-left"]');
      // 재생기는 호버한 쪽에만 붙는다. (유튜브 API 로드 성공 여부는 외부 사정이라 iframe 은 ≤1 로만 본다)
      await expect(page.getByTestId("stage-player")).toHaveCount(1);
      await page.waitForTimeout(3000);
      expect(await stage(page).locator("iframe").count()).toBeLessThanOrEqual(1);
      await page.hover('[data-testid="vote-right"]', { position: { x: 560, y: 320 } });
      await page.waitForTimeout(1500);
      // arm 이 오른쪽으로 옮겨가고, 왼쪽 재생기는 내려간다 — 동시 재생 ≤ 1 (R3).
      // 오른쪽 재생기가 떠 있는지는 단언하지 않는다: 유튜브가 CI 의 데이터센터 IP 에 재생 오류를
      // 돌려주면 StageSide 는 설계대로 재생기를 내리고 포스터로 산다(2026-09-19 CI 실측).
      await expect(stage(page)).toHaveAttribute("data-stage-status", "focusR");
      await expect(page.getByTestId("vote-left").locator('[data-testid="stage-player"]')).toHaveCount(0);
      expect(await page.getByTestId("stage-player").count()).toBeLessThanOrEqual(1);
      expect(await stage(page).locator("iframe").count()).toBeLessThanOrEqual(1);
    });

    test("⑥ 세로 숏츠 — 원본 비율 포스터(oar2) · 위 40% 크롭 · 검은 띠 없음", async ({ page }) => {
      await openStage(page);
      const poster = page.getByTestId("vote-left").locator("img").first();
      await expect(poster).toHaveAttribute("src", new RegExp(`/vi/${PORTRAIT_VIDEO}/(oar2|hqdefault)\\.jpg`));
      expect(await poster.evaluate((el) => getComputedStyle(el).objectPosition)).toBe("50% 40%");
      expect(await poster.evaluate((el) => getComputedStyle(el).objectFit)).toBe("cover");
      await page.getByTestId("vote-left").screenshot({ path: "playwright-report/arena1-portrait-short.png" });
      // 호버 → iframe 은 영상과 같은 9:16 비율 상자 (정사각 창문 안)
      await page.hover('[data-testid="vote-left"]');
      const crop = page.getByTestId("vote-left").locator('[class*="LoopPlayer_crop"]');
      await expect(crop).toHaveCount(1, { timeout: 5_000 });
      const ratio = await crop.evaluate((el) => el.getBoundingClientRect().height / el.getBoundingClientRect().width);
      expect(ratio).toBeCloseTo(16 / 9, 1);
    });

    test("마우스 클릭 = 곧바로 확정 → 다음 매치 (선택 엔진 그대로)", async ({ page }) => {
      await openStage(page);
      const [m0Left] = seededRound1Ids();
      await expect(page.getByTestId("vote-left")).toContainText(nameOf(m0Left));
      await page.getByTestId("vote-left").click();
      await expect(page.getByTestId("vote-left")).not.toContainText(nameOf(m0Left), { timeout: 15_000 });
      await expect.poll(votesFor, { timeout: 15_000 }).toBe(1);
    });

    test("화면이 충분히 높으면 디자인 값 그대로 — 프레임 1320×680 · 좌우 여백 60 · 칸 640", async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 1100 });
      await openStage(page);
      const frame = await box(page, '[data-stage-layer="frame"]');
      expect([frame.x, frame.w, frame.h]).toEqual([60, 1320, 680]);
      const left = await box(page, '[data-testid="vote-left"]');
      expect([left.w, left.h]).toEqual([640, 640]);
    });

    for (const lang of ["ko", "en", "es"] as const) {
      test(`⑦ 배너 자리 기본 공지 (${lang}) — 빈 상자 없음`, async ({ page }) => {
        await openStage(page, lang);
        const banner = page.getByTestId("banner-slot");
        await expect(banner).toBeVisible();
        await expect(banner).toHaveAttribute("data-banner-slot", "arena-match-below");
        const copy = {
          ko: "대회를 마치면 크라운 카드가 생겨요 — 친구에게 공유해 보세요",
          en: "Finish a tournament to earn your Crown Card — share it with friends",
          es: "Termina un torneo y consigue tu Crown Card — compártela con tus amigos",
        }[lang];
        // 로그인한 테스트 계정 = 크라운 카드 공유 유도 (§5 게이트 4). 관리자 배너가 켜져 있으면 그게 이긴다.
        if ((await banner.getAttribute("data-banner-source")) === "default") {
          await expect(banner).toContainText(copy);
        }
        expect((await banner.innerText()).trim().length).toBeGreaterThan(0);
        // PR 2b(D-21 바뀜 09-21): 자리 = 광고 크기. 데스크톱 970×90.
        const b = await box(page, '[data-testid="banner-slot"]');
        expect([b.w, b.h]).toEqual([970, 90]);
        await banner.screenshot({ path: `playwright-report/arena1-banner-${lang}.png` });
      });
    }
  });

  test.describe("모바일 (터치)", () => {
    test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

    test("① 세로 390×844 — 상하 2분할 · 칸 정사각 · 가로 안내 한 줄", async ({ page }) => {
      await openStage(page);
      await expect(stage(page)).toHaveAttribute("data-stage-mode", "portrait");
      const left = await box(page, '[data-testid="vote-left"]');
      const right = await box(page, '[data-testid="vote-right"]');
      expect(left.w).toBe(left.h);
      expect(right.y - (left.y + left.h)).toBe(0); // 위아래로 맞붙음
      expect(left.x).toBe(right.x);
      await expect(page.getByTestId("stage-rotate-hint")).toHaveText("가로로 돌리면 무대가 더 크게 열립니다");
      // 배너 — 모바일 세로 320×100 (원장 D-21 바뀜 2026-09-21 · 광고 표준 크기)
      const frame = await box(page, '[data-stage-layer="frame"]');
      const banner = await box(page, '[data-testid="banner-slot"]');
      expect(frame.w).toBe(366);
      expect([banner.w, banner.h]).toEqual([320, 100]);
      await page.screenshot({ path: "playwright-report/arena1-portrait-390.png", fullPage: true });
    });

    test("④⑤ 1탭 arm · 2탭 확정 · 회전해도 진행 유지 · 가로는 메뉴 없음", async ({ page }) => {
      // 이 테스트가 보는 것은 탭 규칙과 회전이다. 스파이를 심어 **진짜** 전체화면을 막는다 —
      // PR 2a 이후 가로에서 탭하면 실제로 전체화면에 들어가고, 그 상태의 창은 크기를 바꿀 수
      // 없어 아래 setViewportSize 가 거부된다(2026-09-21 CI 실측). 전체화면 동작 자체는
      // 아래 전용 테스트가 호출 횟수로 본다.
      await installFullscreenSpy(page);
      await openStage(page);
      const [m0Left] = seededRound1Ids();

      // 1탭 — 확대·재생만. 선택은 나가지 않는다.
      await page.getByTestId("vote-left").tap();
      await expect(stage(page)).toHaveAttribute("data-stage-status", "focusL");
      await page.waitForTimeout(1500);
      expect(await votesFor()).toBe(0);
      await expect(page.getByTestId("vote-left")).toContainText(nameOf(m0Left));

      // 2탭 — 확정 → 다음 매치.
      await page.getByTestId("vote-left").tap();
      await expect(page.getByTestId("vote-left")).not.toContainText(nameOf(m0Left), { timeout: 15_000 });
      await expect.poll(votesFor, { timeout: 15_000 }).toBe(1);
      const m1Left = (await page.getByTestId("vote-left").innerText()).trim();

      // 회전 — 리로드·리마운트 없이 같은 매치에서 이어진다.
      await page.evaluate(() => ((window as unknown as { __stageMarker: number }).__stageMarker = 1));
      await page.setViewportSize({ width: 844, height: 390 });
      await expect(stage(page)).toHaveAttribute("data-stage-mode", "landscape");
      await expect(page.locator(".wc-nav")).toBeHidden(); // D-17 ③
      await expect(page.getByTestId("stage-rotate-hint")).toHaveCount(0); // D-17 ②
      await expect(page.getByTestId("banner-slot")).toHaveCount(0); // D-21 바뀜 — 가로는 배너 없음
      await expect(page.getByTestId("module-nav")).toHaveCount(0);
      expect(await page.evaluate(() => (window as unknown as { __stageMarker?: number }).__stageMarker)).toBe(1);
      expect((await page.getByTestId("vote-left").innerText()).trim()).toBe(m1Left);
      const l = await box(page, '[data-testid="vote-left"]');
      const r = await box(page, '[data-testid="vote-right"]');
      expect(l.w).toBe(l.h);
      expect(r.x - (l.x + l.w)).toBe(0); // 좌우 50:50
      await page.screenshot({ path: "playwright-report/arena1-landscape-844.png" });

      // 가로에서도 같은 탭 규칙 — 확정하면 선택이 이어서 쌓인다(판이 처음으로 돌아가지 않는다).
      await page.getByTestId("vote-left").tap();
      await page.getByTestId("vote-left").tap();
      await expect.poll(votesFor, { timeout: 15_000 }).toBe(2);

      // 세로로 되돌리면 메뉴가 돌아온다 — 나가는 길.
      await page.setViewportSize({ width: 390, height: 844 });
      await expect(page.locator(".wc-nav")).toBeVisible();
    });

    // ── PR 2a — 모바일 가로 첫 탭 전체화면 (원장 "D-17 · 바뀜 2026-09-20") ──
    test("가로 첫 탭에 전체화면 1회 · 같은 진입에서 추가 0회 · 세로 복귀 시 해제", async ({ page }) => {
      await installFullscreenSpy(page);
      await page.setViewportSize({ width: 844, height: 390 });
      await openStage(page);
      await expect(stage(page)).toHaveAttribute("data-stage-mode", "landscape");
      expect(await fsCalls(page)).toEqual([]); // 진입만으로는 요청하지 않는다(사용자 동작 필요)

      // 첫 탭: 전체화면 1회 + 탭 규칙 그대로 arm (전체화면은 탭을 소비하지 않는다)
      await page.getByTestId("vote-left").tap();
      expect(await fsCalls(page)).toEqual(["request"]);
      await expect(stage(page)).toHaveAttribute("data-stage-status", "focusL");
      expect(await votesFor()).toBe(0);

      // 두 번째 탭: 추가 요청 없음 + 선택 확정 (2탭 규칙 불변)
      const [m0Left] = seededRound1Ids();
      await page.getByTestId("vote-left").tap();
      expect(await fsCalls(page)).toEqual(["request"]);
      await expect(page.getByTestId("vote-left")).not.toContainText(nameOf(m0Left), { timeout: 15_000 });
      await expect.poll(votesFor, { timeout: 15_000 }).toBe(1);

      // 같은 가로 진입에서 또 탭해도 추가 요청 없음
      await page.getByTestId("vote-right").tap();
      expect(await fsCalls(page)).toEqual(["request"]);

      // 세로로 돌리면 자동 해제, 다시 가로로 오면 새 진입이라 한 번 더
      await page.setViewportSize({ width: 390, height: 844 });
      await expect(stage(page)).toHaveAttribute("data-stage-mode", "portrait");
      await expect.poll(() => fsCalls(page), { timeout: 5_000 }).toEqual(["request", "exit"]);
      await page.setViewportSize({ width: 844, height: 390 });
      await expect(stage(page)).toHaveAttribute("data-stage-mode", "landscape");
      await page.getByTestId("vote-left").tap();
      expect(await fsCalls(page)).toEqual(["request", "exit", "request"]);
    });

    test("모바일 세로에서는 전체화면을 요청하지 않는다", async ({ page }) => {
      await installFullscreenSpy(page);
      await openStage(page);
      await page.getByTestId("vote-left").tap();
      await expect(stage(page)).toHaveAttribute("data-stage-status", "focusL");
      expect(await fsCalls(page)).toEqual([]);
    });

    test("전체화면을 지원하지 않는 기기(아이폰 사파리 흉내) — 콘솔 에러 0 · 무대가 화면 밖으로 넘치지 않는다", async ({ page }) => {
      await installFullscreenSpy(page, { supported: false });
      await page.setViewportSize({ width: 844, height: 390 });
      await openStage(page);
      await page.getByTestId("vote-left").tap();
      await expect(stage(page)).toHaveAttribute("data-stage-status", "focusL");
      expect(await fsCalls(page)).toEqual([]);
      // 칸은 남는 높이 안에 들어간다 (D-17 칸 규칙 — 기기별 숫자 하드코딩 없음)
      const l = await box(page, '[data-testid="vote-left"]');
      const f = await box(page, '[data-stage-layer="frame"]');
      expect(l.w).toBe(l.h);
      expect(f.y + f.h).toBeLessThanOrEqual(390);
    });
  });

  // ── PR 2a — 매치 화면 게스트 안내 제거 (원장 "RUN-1 게스트 안내 · 바뀜") ──
  test.describe("게스트 안내", () => {
    for (const lang of ["ko", "en", "es"] as const) {
      test(`매치 화면에 게스트 안내가 없다 (${lang})`, async ({ page }) => {
        await openStage(page, lang);
        await expect(stage(page)).not.toContainText(GUEST_NOTICE[lang]);
        await expect(page.getByText(GUEST_NOTICE[lang])).toHaveCount(0);
      });
    }
  });

  // ══ ARENA-1 PR 2b — 네 화면 (디자인 정본 10~27) ══
  test.describe("PR 2b · 확정 연출 · 결승 · 배너", () => {
    test.use({ viewport: { width: 1440, height: 900 } });

    test("확정 연출 — 금색 고리 두 겹 · 크라운 0건 · 520ms 뒤 다음 매치", async ({ page }) => {
      await openStage(page);
      const [m0Left] = seededRound1Ids();
      await page.getByTestId("vote-left").click();
      // 고리는 확정 순간에만, 두 겹 (D-11 · 디자인 10)
      await expect(page.getByTestId("confirm-ring")).toHaveCount(2);
      // 크라운 표식은 무대 어디에도 없다 (D-28)
      await expect(page.locator('[data-testid="split-stage"] [class*="crown" i]')).toHaveCount(0);
      await expect(page.locator('[data-testid="split-stage"] img[src*="crown" i]')).toHaveCount(0);
      await expect(page.getByTestId("vote-left")).not.toContainText(nameOf(m0Left), { timeout: 15_000 });
      await expect.poll(votesFor, { timeout: 15_000 }).toBe(1);
    });

    test("배너 자리 = 광고 표준 크기 (D-21 바뀜 09-21)", async ({ page }) => {
      await openStage(page);
      const banner = page.getByTestId("banner-slot");
      await expect(banner).toHaveAttribute("data-banner-variant", "desktop");
      const b = await box(page, '[data-testid="banner-slot"]');
      expect([b.w, b.h]).toEqual([970, 90]);
    });

    test("결승 3분할 — 세 칸 정사각 · 띠 3색 · 크라운 0건 (D-06 · D-29 · D-28)", async ({ page }) => {
      await seedRound1Votes(24);
      await seedLaterRounds(); // 2~4라운드까지 채워 결승만 남긴다
      // openStage 는 split-stage 를 기다린다 — 결승 화면에는 그것이 없다.
      await page.goto(`/arena/${TID}?lang=ko`);
      await dismissCookieBanner(page);
      await expect(page.getByTestId("final-stage")).toBeVisible({ timeout: 30_000 });
      const l = await box(page, '[data-testid="vote-left"]');
      const m = await box(page, '[data-testid="vote-mid"]');
      const r = await box(page, '[data-testid="vote-right"]');
      for (const c of [l, m, r]) expect(c.w).toBe(c.h); // 정사각
      expect([m.x - (l.x + l.w), r.x - (m.x + m.w)]).toEqual([0, 0]); // 균등·틈 0
      const frame = await box(page, '[data-stage-layer="frame"]');
      expect(frame.w).toBe(1320); // 매치와 같은 프레임
      // 띠 3색 — 왼쪽 Turquoise · 가운데 Crown Gold · 오른쪽 Crimson (D-29)
      const bands = await page.evaluate(() =>
        ["vote-left", "vote-mid", "vote-right"].map((id) => {
          const el = document.querySelector(`[data-testid="${id}"] [class*="band"]`);
          return el ? getComputedStyle(el).backgroundColor : "";
        }),
      );
      expect(bands[0]).toContain("0, 163, 183");
      expect(bands[1]).toContain("252, 208, 6");
      expect(bands[2]).toContain("215, 6, 58");
      await expect(page.locator('[data-testid="final-stage"] [class*="crown" i]')).toHaveCount(0);
      // 무대 금지 4종 (R2)
      const text = (await page.getByTestId("final-stage").innerText()).replace(/\s+/g, " ");
      expect(text).not.toMatch(/ROUND OF|\d\s*%|ENDS IN/i);
      await page.screenshot({ path: "playwright-report/arena1-final-1440.png", fullPage: true });
    });

    test("라운드 전환 — 라운드 이름은 이 화면에만 · 탭하면 바로 (R2 · D-06)", async ({ page }) => {
      await seedRound1Votes(23); // 마지막 한 매치만 남긴다
      await openStage(page);
      await expect(page.getByTestId("split-stage")).toBeVisible();
      // 매치 화면에는 라운드 이름이 없다
      expect((await page.getByTestId("split-stage").innerText())).not.toMatch(/ROUND OF/i);
      await page.getByTestId("vote-left").click();
      const transition = page.getByTestId("round-transition");
      await expect(transition).toBeVisible({ timeout: 20_000 });
      await expect(page.getByTestId("round-prev")).toHaveText("ROUND OF 48");
      await expect(page.getByTestId("round-next")).toHaveText("ROUND OF 24");
      await expect(transition).toContainText("24"); // 코너: 다음 라운드에 오르는 인원 수
      await expect(page.locator(".wc-nav")).toBeHidden(); // 전체화면 · 메뉴 없음
      await expect(page.getByTestId("banner-slot")).toHaveCount(0); // 배너 없음(D-26)
      await page.screenshot({ path: "playwright-report/arena1-round-transition.png" });
      // 탭하면 바로 넘어간다 — 2초를 기다리지 않는다
      await transition.click();
      await expect(transition).toBeHidden({ timeout: 3_000 });
      await expect(page.getByTestId("split-stage")).toBeVisible();
    });
  });

  // 첫 입장 팝업은 "아직 안 본 기기"여야 하므로 초기 스크립트를 덮어쓴다.
  test.describe("PR 2b · 첫 입장 팝업 (D-13)", () => {
    test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

    test("첫 진입에 1회 · 닫기 전 선택 불가 · 세로에서만 회전 안내 · 두 번째 방문엔 없음", async ({ page }) => {
      // ⚠️ 이 스펙의 beforeEach 는 매 이동마다 "이미 봤다"를 심는다. 여기서는 **첫 문서에서만**
      // 그 값을 지워 팝업을 띄우고, 새로고침 뒤에는 앱이 적은 값이 그대로 살아 있게 둔다
      // (매 이동마다 지우면 재방문 검사가 거짓으로 깨진다 — 2026-09-23 CI 실측).
      await page.addInitScript(() => {
        try {
          if (!sessionStorage.getItem("wc48:e2e:intro-cleared")) {
            sessionStorage.setItem("wc48:e2e:intro-cleared", "1");
            localStorage.removeItem("wc48:arena:intro:v1");
          }
        } catch {
          /* 막힌 환경 */
        }
      });
      await page.goto(`/arena/${TID}?lang=ko`);
      await dismissCookieBanner(page);
      const intro = page.getByTestId("arena-intro");
      await expect(intro).toBeVisible({ timeout: 30_000 });
      await expect(intro).toContainText("Crown Card는 Tournament가 끝난 뒤 공개됩니다");
      await expect(page.getByTestId("arena-intro-rotate")).toBeVisible(); // 세로에서만

      // 닫기 전에는 선택할 수 없다 — 칸을 탭해도 arm 되지 않는다.
      await page.getByTestId("vote-left").tap({ force: true }).catch(() => {});
      await expect(page.getByTestId("split-stage")).toHaveAttribute("data-stage-status", "idle");
      expect(await votesFor()).toBe(0);

      await page.getByTestId("arena-intro-start").tap();
      await expect(intro).toHaveCount(0);
      await page.getByTestId("vote-left").tap();
      await expect(page.getByTestId("split-stage")).toHaveAttribute("data-stage-status", "focusL");

      // 두 번째 방문 — 같은 기기라 다시 뜨지 않는다.
      await page.reload();
      await dismissCookieBanner(page);
      await expect(page.getByTestId("split-stage")).toBeVisible({ timeout: 30_000 });
      await expect(page.getByTestId("arena-intro")).toHaveCount(0);
    });
  });
});
