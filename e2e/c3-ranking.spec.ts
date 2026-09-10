/**
 * C-3 Ranking E2E (@c3) — handoff §11 Phase D / §10.1.
 *
 * Seeds `ranking_cache` docs directly with firebase-admin (the cron's output —
 * admin SDK bypasses the write:false rule) in three states, then loads
 * `/arena/{id}/ranking` against the live preview/localhost app:
 *   - loaded  → rank rows + Vote Rate (%) + Vote-Count regression guard
 *   - anomaly → crimson anomaly badge + tag + flagged #1
 *   - empty   → "No ranking yet" (and KO determinism)
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
const TID_LOCKED = `${PREFIX}-locked`; // Deadline in the future → locked (W-7)
const ALL = [TID_LOADED, TID_EMPTY, TID_MANY, TID_LOCKED];
// W-7: the ranking is revealed ONLY after the Deadline, so the visible-data
// tournaments are seeded CLOSED (past), and TID_LOCKED stays open (future).
const CLOSED = new Set([TID_LOADED, TID_EMPTY, TID_MANY]);

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
  rate: number,
) {
  return {
    rank,
    contestantId,
    name,
    videoId: null,
    voteCount: SECRET_VOTE_COUNT, // internal only — must not render
    rate,
  };
}

async function seed(): Promise<void> {
  const d = db();
  const batch = d.batch();
  // W-7: CLOSED tournaments are past their Deadline (ranking revealed); TID_LOCKED
  // stays in the future (ranking locked). Dynamic dates ([[feedback-seed-date-
  // anti-pattern]]).
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
  const loadedRankings = [
    entry(1, "c1", "L. Messi", 60),
    entry(2, "c2", "C. Ronaldo", 25),
    entry(3, "c3", "Neymar Jr", 10),
    entry(4, "c4", "K. Mbappe", 5),
  ];
  // ranking_cache carries PURE Voter data only — no anomaly fields (W-2).
  batch.set(d.doc(`ranking_cache/${TID_LOADED}`), {
    tournamentId: TID_LOADED,
    rankings: loadedRankings,
    totalVotes: SECRET_VOTE_COUNT * 4,
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
    generationSequence: 1,
    generatedAt: admin.firestore.FieldValue.serverTimestamp(),
    previousGeneratedAt: null,
  });
  // TID_LOCKED has REAL cached data, but the future Deadline must keep it sealed
  // (locked state) — proving W-7 hides existing rankings, not just empty ones.
  batch.set(d.doc(`ranking_cache/${TID_LOCKED}`), {
    tournamentId: TID_LOCKED,
    rankings: loadedRankings,
    totalVotes: SECRET_VOTE_COUNT * 4,
    generationSequence: 1,
    generatedAt: admin.firestore.FieldValue.serverTimestamp(),
    previousGeneratedAt: null,
  });
  // TID_EMPTY: no ranking_cache doc at all → empty state.
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

test.describe("@c3 Ranking — Vote Rate surface", () => {
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

  test("loaded — renders Vote Rate rows, NEVER a Vote Count", async ({ page }) => {
    await page.goto(`/arena/${TID_LOADED}/ranking?lang=en`);

    const view = page.getByTestId("ranking-view");
    await expect(view).toHaveAttribute("data-rank", "loaded", { timeout: 30_000 });
    await expect(page.getByTestId("rank-row")).toHaveCount(4);
    await expect(page.getByTestId("rank-rate").first()).toHaveText("60.0%");
    await expect(page.getByText("L. Messi")).toBeVisible();

    // ── Vote Count regression guard (trap #7) ───────────────────────
    await expect(page.locator("text=/^\\d+표$/")).toHaveCount(0);
    await expect(page.locator("text=/Total Votes/i")).toHaveCount(0);
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

  test("W-7 — locked before Deadline: sealed even with cached data", async ({ page }) => {
    await page.goto(`/arena/${TID_LOCKED}/ranking?lang=ko`);
    const view = page.getByTestId("ranking-view");
    await expect(view).toHaveAttribute("data-rank", "locked", { timeout: 30_000 });
    await expect(page.getByTestId("rank-locked")).toBeVisible();
    await expect(page.getByText("토너먼트 진행 중")).toBeVisible();
    // The real cached rows must NOT leak while locked.
    await expect(page.getByTestId("rank-row")).toHaveCount(0);
    const body = (await page.locator("body").innerText()).toLowerCase();
    expect(body).not.toContain("messi");
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

  test("empty (en) — No ranking yet", async ({ page }) => {
    await page.goto(`/arena/${TID_EMPTY}/ranking?lang=en`);
    const view = page.getByTestId("ranking-view");
    await expect(view).toHaveAttribute("data-rank", "empty", { timeout: 30_000 });
    await expect(page.getByText("No ranking yet")).toBeVisible();
  });

  test("empty (ko) — i18n determinism", async ({ page }) => {
    await page.goto(`/arena/${TID_EMPTY}/ranking?lang=ko`);
    await expect(page.getByTestId("ranking-view")).toHaveAttribute(
      "data-rank",
      "empty",
      { timeout: 30_000 },
    );
    await expect(page.getByText("아직 랭킹이 없어요")).toBeVisible();
    // W-1 copy guard: ambiguous "절대 수치 비공개" direct-translation is gone.
    await expect(page.locator("text=절대 수치")).toHaveCount(0);
    // W-2 guard: no anomaly "이상 징후" language anywhere on the Voter surface.
    await expect(page.locator("text=이상 징후")).toHaveCount(0);
  });

  /**
   * RUN-1 PR 3 · AC 15 — "다음 발표" 한 줄은 **노출 보류 상태**다 (2026-09-10 대표 확정).
   *
   * 판정 함수(`lib/ranking/nextRankingUpdate`)와 §8 승인 문구 2키는 들어가 있고 단위 테스트가
   * 시각 경계·글자까지 못박는다. 막힌 것은 화면 노출뿐이다 — 이 화면은 W-7 때문에 **마감 후에만**
   * 보이는데 크론은 **마감 전** 대회만 집계하므로, 보이는 자리에서 "다음 발표"가 늘 거짓이 된다.
   *
   * 그래서 여기서 지키는 것은 **줄이 없다는 사실**이고, 동시에 그 부재가 "테스트가 아무것도 안
   * 본 것"이 아님을 확인한다 — 기존 안내 한 줄(`.rank-note`)이 실제로 그려졌는지 함께 본다.
   * W-7 결정이 뒤집혀 노출이 켜지면 이 테스트가 먼저 빨개져 짝을 맞추라고 알린다.
   */
  for (const lang of ["ko", "en", "es"] as const) {
    test(`AC 15 — 다음 발표 한 줄은 아직 노출되지 않는다 (${lang})`, async ({ page }) => {
      await page.goto(`/arena/${TID_LOADED}/ranking?lang=${lang}`);
      await expect(page.getByTestId("ranking-view")).toHaveAttribute(
        "data-rank",
        "loaded",
        { timeout: 30_000 },
      );
      // 헤더가 실제로 그려졌다는 증거 — 이게 없으면 아래 부재 단언이 공허해진다.
      await expect(page.locator(".rank-head .rank-note")).toHaveCount(1);
      await expect(page.getByTestId("ranking-next-update")).toHaveCount(0);
    });
  }
});
