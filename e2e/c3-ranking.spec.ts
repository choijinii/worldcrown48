/**
 * C-3 차트 E2E (@c3) — 구 "랭킹" 화면. 주소·컬렉션 이름은 그대로다.
 *
 * `ranking_cache` 문서를 firebase-admin 으로 직접 심고(크론의 산출물 — admin SDK는
 * write:false 규칙을 우회한다) `/arena/{id}/ranking` 을 연다.
 *   - loaded  → 차트 줄 + **Crown Score** + Vote Count 유출 방지
 *   - waiting → 판수 10 미만 · 캐시 없음 → 같은 기다림 안내
 *   - 상시 공개 → **마감 전 대회를 비로그인으로 열어도 숫자가 보인다** (D-30)
 *
 * ⚠️ 뒤집힌 것 (D-30, 2026-09-23): 예전에는 마감 전이면 `locked` 로 잠갔고 그것을
 * 지키는 테스트가 있었다. 그 규칙은 폐기됐다 — 이제 같은 자리에서 **열리는 것**을 지킨다.
 *
 * Determinism: `?lang=` is forced on every navigation ([[feedback-i18n-test-
 * determinism]]); deadlines are seeded dynamically (now + 30d, [[feedback-seed-
 * date-anti-pattern]]). Console errors must be 0. CI-verified (needs PREVIEW_URL
 * + FIREBASE_ADMIN_SDK_KEY); skipped locally.
 */
import { expect, test } from "@playwright/test";
import * as admin from "firebase-admin";

const PREFIX = "c3-e2e";
const TID_LOADED = `${PREFIX}-loaded`;
const TID_EMPTY = `${PREFIX}-empty`;
const TID_MANY = `${PREFIX}-many`; // 14 rows — mobile top-12 cutoff (W-3)
const TID_OPEN = `${PREFIX}-open`; // 마감이 한참 남은 대회 → 그래도 열린다 (D-30)
const TID_FEW = `${PREFIX}-few`; // 완주 판수 10 미만 → 기다림 안내 (정본 §5)
const ALL = [TID_LOADED, TID_EMPTY, TID_MANY, TID_OPEN, TID_FEW];
// D-30: 마감 여부는 이제 공개를 가르지 않는다. 마감 지난 대회와 남은 대회를 섞어 두고
// **둘 다 보이는지** 확인한다. 마감 전 대회(TID_OPEN)가 이 PR의 핵심 증거다.
const CLOSED = new Set([TID_LOADED, TID_EMPTY, TID_MANY]);
/** 차트가 열리는 최소 완주 판수 (lib/ranking/rankState MIN_RUNS_FOR_CHART). */
const MIN_RUNS = 10;

// A distinctive voteCount that must NEVER reach the DOM (Vote Count 금지, trap #7).
const SECRET_VOTE_COUNT = 7777;

let consoleErrors: string[] = [];

function loadServiceAccount(): admin.ServiceAccount | null {
  const raw = process.env.FIREBASE_ADMIN_SDK_KEY;
  if (!raw) return null;
  const decoded = raw.trim().startsWith("{")
    ? raw
    : Buffer.from(raw, "base64").toString("utf8");
  return JSON.parse(decoded) as admin.ServiceAccount;
}
function db(): admin.firestore.Firestore {
  if (admin.apps.length === 0) {
    const sa = loadServiceAccount();
    if (!sa) throw new Error("FIREBASE_ADMIN_SDK_KEY required for C-3 E2E.");
    admin.initializeApp({ credential: admin.credential.cert(sa) });
  }
  return admin.firestore();
}

function entry(
  rank: number,
  contestantId: string,
  name: string,
  crownScore: number,
) {
  return {
    rank,
    contestantId,
    name,
    videoId: null,
    voteCount: SECRET_VOTE_COUNT, // internal only — must not render
    rate: 25, // 이상 징후(T-1·T-2) 판정용으로만 남는 값 — 화면에 안 나온다
    crownScore,
    // 세 비율은 캐시에만 실린다 (화면에 나열하지 않는다 · 대표 2026-09-24).
    placementRate: 0.5,
    winRate: 0.3,
    shareRate: 0.8,
  };
}

async function seed(): Promise<void> {
  const d = db();
  const batch = d.batch();
  // 마감 시각은 이제 공개를 가르지 않는다(D-30). 다만 "다음 발표" 줄은 마감 뒤에 감추므로
  // 마감 지난 대회와 남은 대회를 둘 다 심는다. 날짜는 동적으로 만든다
  // ([[feedback-seed-date-anti-pattern]]).
  const pastDeadline = admin.firestore.Timestamp.fromMillis(
    Date.now() - 1 * 86_400 * 1000,
  );
  const futureDeadline = admin.firestore.Timestamp.fromMillis(
    Date.now() + 30 * 86_400 * 1000,
  );
  for (const tid of ALL) {
    batch.set(d.doc(`tournaments/${tid}`), {
      title: "Strikers of the Century",
      category: "FOOTBALL",
      status: "active",
      hostUid: "seed-operator",
      currentRound: 1,
      totalContestants: 48,
      tournamentDeadline: CLOSED.has(tid) ? pastDeadline : futureDeadline,
      settings: { aiNews: false, multiLang: false, showRanking: true },
      featured: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  }
  // Crown Score 순 (정본 §0) — 549는 정본 §4 계산 예시의 값이다.
  const loadedRankings = [
    entry(1, "c1", "L. Messi", 549),
    entry(2, "c2", "C. Ronaldo", 401),
    entry(3, "c3", "Neymar Jr", 233),
    entry(4, "c4", "K. Mbappe", 88),
  ];
  // ranking_cache carries PURE Voter data only — no anomaly fields (W-2).
  batch.set(d.doc(`ranking_cache/${TID_LOADED}`), {
    tournamentId: TID_LOADED,
    rankings: loadedRankings,
    totalVotes: SECRET_VOTE_COUNT * 4,
    runsTotal: 120,
    generationSequence: 1,
    generatedAt: admin.firestore.FieldValue.serverTimestamp(),
    previousGeneratedAt: null,
  });
  // 14-row cache for the W-3 mobile top-12 cutoff test (desktop shows all 14).
  const manyRankings = Array.from({ length: 14 }, (_, i) =>
    entry(i + 1, `m${i + 1}`, `Player ${i + 1}`, 90 - i * 5),
  );
  batch.set(d.doc(`ranking_cache/${TID_MANY}`), {
    tournamentId: TID_MANY,
    rankings: manyRankings,
    totalVotes: SECRET_VOTE_COUNT * 14,
    runsTotal: 120,
    generationSequence: 1,
    generatedAt: admin.firestore.FieldValue.serverTimestamp(),
    previousGeneratedAt: null,
  });
  // TID_OPEN — 마감이 30일 남은 대회에 진짜 데이터가 있다. **비로그인으로 열어도
  // 숫자가 보여야 한다** (D-30). 예전에는 이 자리가 `locked` 를 지키는 테스트였다.
  batch.set(d.doc(`ranking_cache/${TID_OPEN}`), {
    tournamentId: TID_OPEN,
    rankings: loadedRankings,
    totalVotes: SECRET_VOTE_COUNT * 4,
    runsTotal: 120,
    generationSequence: 1,
    generatedAt: admin.firestore.FieldValue.serverTimestamp(),
    previousGeneratedAt: null,
  });
  // TID_FEW — 줄은 있는데 완주 판수가 10에 못 미친다 → 점수 대신 기다림 안내 (정본 §5).
  batch.set(d.doc(`ranking_cache/${TID_FEW}`), {
    tournamentId: TID_FEW,
    rankings: loadedRankings,
    totalVotes: SECRET_VOTE_COUNT * 4,
    runsTotal: MIN_RUNS - 1,
    generationSequence: 1,
    generatedAt: admin.firestore.FieldValue.serverTimestamp(),
    previousGeneratedAt: null,
  });
  // TID_EMPTY: no ranking_cache doc at all → 같은 기다림 안내.
  await batch.commit();
}

async function cleanup(): Promise<void> {
  const d = db();
  const batch = d.batch();
  for (const tid of ALL) {
    batch.delete(d.doc(`tournaments/${tid}`));
    batch.delete(d.doc(`ranking_cache/${tid}`));
  }
  await batch.commit().catch(() => undefined);
}

test.describe("@c3 차트 — Crown Score 화면", () => {
  test.skip(!process.env.PREVIEW_URL, "PREVIEW_URL not set — C-3 E2E parked until secret setup");

  test.beforeAll(async () => {
    await cleanup();
    await seed();
  });
  test.afterAll(async () => cleanup());

  test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    page.on("console", (m) => {
      if (m.type() !== "error") return;
      const t = m.text();
      if (t.includes("Could not reach Cloud Firestore backend")) return;
      consoleErrors.push(t);
    });
  });
  test.afterEach(async () => {
    expect(consoleErrors, "Console errors must be 0").toHaveLength(0);
  });

  test("loaded — Crown Score 줄을 그린다. Vote Count 는 절대 안 나온다", async ({ page }) => {
    await page.goto(`/arena/${TID_LOADED}/ranking?lang=en`);

    const view = page.getByTestId("ranking-view");
    await expect(view).toHaveAttribute("data-rank", "loaded", { timeout: 30_000 });
    await expect(page.getByTestId("rank-row")).toHaveCount(4);
    // 화면에 나가는 수치는 Crown Score 정수 하나뿐이다 (대표 2026-09-24).
    await expect(page.getByTestId("rank-score").first()).toHaveText("549");
    // 폐기된 표기가 되살아나지 않는지 — 퍼센트는 차트에 없다.
    await expect(page.getByTestId("rank-rate")).toHaveCount(0);
    await expect(page.getByText("L. Messi")).toBeVisible();

    // ── Vote Count regression guard (trap #7) ───────────────────────
    await expect(page.locator("text=/^\\d+표$/")).toHaveCount(0);
    await expect(page.locator("text=/Total Votes/i")).toHaveCount(0);
    await expect(page.locator("text=/Vote Rate/i")).toHaveCount(0);
    const body = (await page.locator("body").innerText()).toLowerCase();
    expect(body).not.toContain(String(SECRET_VOTE_COUNT)); // 7777 never leaks
    expect(body).not.toContain("votecount");

    // ── W-2 anomaly-removal regression guard ────────────────────────
    // ranking_cache no longer carries anomaly signal — the Voter surface
    // must never render an anomaly badge (a legit popular #1 ≠ "이상 징후").
    await expect(page.getByTestId("anomaly-badge")).toHaveCount(0);
    expect(body).not.toContain("anomaly");

    await page.setViewportSize({ width: 1440, height: 900 });
    await page.screenshot({ path: "playwright-report/c3-ranking-desktop1440.png", fullPage: true });
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.screenshot({ path: "playwright-report/c3-ranking-tablet768.png", fullPage: true });
    await page.setViewportSize({ width: 360, height: 800 });
    await page.screenshot({ path: "playwright-report/c3-ranking-mobile360.png", fullPage: true });
  });

  test("W-3 — mobile shows top 12 only; desktop shows all", async ({ page }) => {
    await page.goto(`/arena/${TID_MANY}/ranking?lang=en`);
    const view = page.getByTestId("ranking-view");
    await expect(view).toHaveAttribute("data-rank", "loaded", { timeout: 30_000 });
    const rows = page.getByTestId("rank-row");
    await expect(rows).toHaveCount(14); // all 14 are in the DOM either way

    // Mobile (≤520px): rows 13 & 14 are hidden via CSS (nth-child(n+13)).
    await page.setViewportSize({ width: 375, height: 800 });
    await expect(rows.nth(11)).toBeVisible(); // 12th row visible
    await expect(rows.nth(12)).not.toBeVisible(); // 13th row hidden
    await expect(rows.nth(13)).not.toBeVisible(); // 14th row hidden

    // Desktop: every active contestant is visible (find-your-candidate).
    await page.setViewportSize({ width: 1440, height: 900 });
    await expect(rows.nth(12)).toBeVisible();
    await expect(rows.nth(13)).toBeVisible();
  });

  /**
   * ⚠️ **뒤집힌 테스트** (D-30, 2026-09-23). 예전 이름은 "W-7 — locked before Deadline:
   * sealed even with cached data" 였고, 마감 전에는 숫자가 **안 보이는 것**을 지켰다.
   * 그 규칙은 폐기됐다 — 이제 같은 자리에서 **보이는 것**을 지킨다.
   *
   * 비로그인 컨텍스트인 것이 핵심이다: 공유 링크로 들어온 사람이 로그인 없이 바로
   * 순위를 봐야 퍼진다. `firestore.rules` 의 마감 게이트를 지운 것이 여기서 증명된다.
   */
  test("D-30 — 마감 전 대회도 비로그인으로 열린다 (뒤집힘: 예전 locked)", async ({ page }) => {
    await page.goto(`/arena/${TID_OPEN}/ranking?lang=ko`);
    const view = page.getByTestId("ranking-view");
    await expect(view).toHaveAttribute("data-rank", "loaded", { timeout: 30_000 });
    await expect(page.getByTestId("rank-row")).toHaveCount(4);
    await expect(page.getByText("L. Messi")).toBeVisible();
    await expect(page.getByTestId("rank-score").first()).toHaveText("549");
    // 잠금 화면은 이제 존재하지 않는다.
    await expect(page.getByTestId("rank-locked")).toHaveCount(0);
  });

  test("정본 §5 — 완주 판수 10 미만이면 점수 없이 기다림 안내", async ({ page }) => {
    await page.goto(`/arena/${TID_FEW}/ranking?lang=ko`);
    const view = page.getByTestId("ranking-view");
    await expect(view).toHaveAttribute("data-rank", "waiting", { timeout: 30_000 });
    await expect(page.getByTestId("rank-waiting")).toBeVisible();
    await expect(
      page.getByText("아직 참여가 적어요. 조금만 기다려주세요!"),
    ).toBeVisible();
    // 캐시에 줄이 있어도 점수는 새어 나가지 않는다.
    await expect(page.getByTestId("rank-row")).toHaveCount(0);
    const body = (await page.locator("body").innerText()).toLowerCase();
    expect(body).not.toContain("messi");
    // 판수 자체는 화면에 그리지 않는다 (킥 §E).
    expect(body).not.toContain("9");
  });

  test("W-6 — ModuleNav: 4 tabs, Ranking active, Newsroom disabled", async ({ page }) => {
    await page.goto(`/arena/${TID_LOADED}/ranking?lang=en`);
    const nav = page.getByTestId("module-nav");
    await expect(nav).toBeVisible({ timeout: 30_000 });

    // Ranking is the active tab on this route (exact-match, trap #6).
    await expect(page.getByTestId("module-tab-ranking")).toHaveAttribute(
      "data-active",
      "true",
    );
    await expect(page.getByTestId("module-tab-vs")).toHaveAttribute(
      "data-active",
      "false",
    );

    // Newsroom is disabled (C-4/C-5 unbuilt) — a <button>, not a link.
    const newsroom = page.getByTestId("module-tab-newsroom");
    await expect(newsroom).toBeDisabled();
    await expect(newsroom).toContainText("Coming soon");

    // VS Battle tab routes back to the base arena surface.
    await page.getByTestId("module-tab-vs").click();
    await expect(page).toHaveURL(new RegExp(`/arena/${TID_LOADED}(\\?|$)`));
  });

  test("캐시가 없는 대회도 같은 기다림 안내 (en) — 뒤집힘: 예전 empty", async ({ page }) => {
    await page.goto(`/arena/${TID_EMPTY}/ranking?lang=en`);
    const view = page.getByTestId("ranking-view");
    await expect(view).toHaveAttribute("data-rank", "waiting", { timeout: 30_000 });
    await expect(page.getByTestId("rank-waiting")).toBeVisible();
  });

  test("기다림 안내 (ko) — i18n determinism", async ({ page }) => {
    await page.goto(`/arena/${TID_EMPTY}/ranking?lang=ko`);
    await expect(page.getByTestId("ranking-view")).toHaveAttribute(
      "data-rank",
      "waiting",
      { timeout: 30_000 },
    );
    await expect(
      page.getByText("아직 참여가 적어요. 조금만 기다려주세요!"),
    ).toBeVisible();
    // W-1 copy guard: ambiguous "절대 수치 비공개" direct-translation is gone.
    await expect(page.locator("text=절대 수치")).toHaveCount(0);
    // W-2 guard: no anomaly "이상 징후" language anywhere on the Voter surface.
    await expect(page.locator("text=이상 징후")).toHaveCount(0);
  });

  /**
   * "다음 발표" 한 줄 — **이제 켜져 있다** (D-30).
   *
   * ⚠️ 뒤집힌 테스트다. 2026-09-10에는 이 줄을 **노출 보류**했고, 여기서 지키던 것은
   * "줄이 없다는 사실"이었다. 보류 사유는 이 화면이 마감 후에만 보이는데 크론은 마감 전
   * 대회만 집계해서 "다음 발표"가 늘 거짓이 되기 때문이었다. D-30이 그 전제를 없앴다 —
   * 마감 전에 보이므로 줄이 사실이 됐다.
   *
   * 반대쪽도 함께 지킨다: **마감이 지난 대회에서는 감춘다.** 그때부터는 더 발표되지
   * 않으므로 줄이 다시 거짓이 된다.
   */
  for (const lang of ["ko", "en", "es"] as const) {
    test(`다음 발표 줄 — 마감 전 대회에 보인다 (${lang})`, async ({ page }) => {
      await page.goto(`/arena/${TID_OPEN}/ranking?lang=${lang}`);
      await expect(page.getByTestId("ranking-view")).toHaveAttribute(
        "data-rank",
        "loaded",
        { timeout: 30_000 },
      );
      // 헤더가 실제로 그려졌다는 증거 — 이게 없으면 아래 단언이 공허해진다.
      await expect(page.locator(".rank-head .rank-note").first()).toBeVisible();
      // 새벽(KST 00:00~08:59)은 승인 문구가 없어 줄을 감춘다 — 그 구간에서는 0이 맞다.
      const count = await page.getByTestId("ranking-next-update").count();
      expect(count === 1 || count === 0).toBe(true);
    });
  }

  test("다음 발표 줄 — 마감이 지난 대회에서는 감춘다", async ({ page }) => {
    await page.goto(`/arena/${TID_LOADED}/ranking?lang=ko`);
    await expect(page.getByTestId("ranking-view")).toHaveAttribute(
      "data-rank",
      "loaded",
      { timeout: 30_000 },
    );
    await expect(page.locator(".rank-head .rank-note").first()).toBeVisible();
    await expect(page.getByTestId("ranking-next-update")).toHaveCount(0);
  });
});
