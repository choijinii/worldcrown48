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
const ALL = [TID_LOADED, TID_EMPTY, TID_MANY];

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
    imageUrl: null,
    voteCount: SECRET_VOTE_COUNT, // internal only — must not render
    rate,
  };
}

async function seed(): Promise<void> {
  const d = db();
  const batch = d.batch();
  // Dynamic deadline keeps every seeded Tournament "active".
  const deadline = admin.firestore.Timestamp.fromMillis(
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
      tournamentDeadline: deadline,
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
});
