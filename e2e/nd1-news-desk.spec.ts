/**
 * ND-1 News Desk — E2E (handoff §11.4). Public surfaces + Console-error 0 (§11.6).
 *
 * Per repo convention there is no RTL/jsdom layer; the DOM-level behaviors are
 * verified here against the Vercel Preview:
 *   ② public: /news 목록 · /news/[slug] (내려간/미발행 slug → 404 아닌 안내) ·
 *      기사 지면 AI-Report 존재
 *   ③ NewsRail: The Pitch(/)에 노출
 *   + 한/영 토글 · 320px 모바일 스모크
 *
 * The admin publish flow (① 초안 생성→편집→발행→내리기) requires the operator
 * account + callable and is covered by the Phase D′ walkthrough on the preview;
 * it is not asserted signed-out here (it would just hit the AdminAuthGuard).
 * Every test asserts zero console errors.
 */
import { expect, test, type ConsoleMessage } from "@playwright/test";

let consoleErrors: string[] = [];

/** Environmental console noise (signed-out GSI / headless Firestore) — not ND-1 defects. */
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

test.describe("ND-1 News Desk — public", () => {
  test("/news renders the newsroom (list or empty state)", async ({ page }) => {
    await page.goto("/news?lang=en");
    await expect(page.getByRole("heading", { name: /Newsroom/i })).toBeVisible();
    // Either published items or the empty-state notice — both are valid.
    const items = page.getByTestId("news-list-item");
    const empty = page.getByTestId("news-list-empty");
    await expect(items.first().or(empty)).toBeVisible();
  });

  test("/news/[unknown-slug] shows an 안내 (not a hard 404)", async ({ page }) => {
    await page.goto("/news/20000101-zzzzzz?lang=en");
    await expect(page.getByTestId("article-not-found")).toBeVisible();
  });

  test("language toggle is present on /news", async ({ page }) => {
    await page.goto("/news?lang=en");
    await expect(page.getByTestId("lang-toggle")).toBeVisible();
  });

  test("NewsRail is mounted on The Pitch (/)", async ({ page }) => {
    await page.goto("/?lang=en");
    await expect(page.getByTestId("news-rail")).toBeVisible();
  });

  test("mobile 320px: /news does not overflow horizontally", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 720 });
    await page.goto("/news?lang=en");
    await expect(page.getByRole("heading", { name: /Newsroom/i })).toBeVisible();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth + 1,
    );
    expect(overflow).toBe(true);
  });

  test("a published article page shows the ✦ AI-Report block (when one exists)", async ({ page }) => {
    // Data-dependent: only assert when the preview has ≥1 published article.
    await page.goto("/news?lang=en");
    const first = page.getByTestId("news-list-item").first();
    if ((await first.count()) === 0) {
      test.skip(true, "no published article seeded on this preview");
    }
    await first.click();
    await expect(page.getByTestId("ai-report")).toBeVisible();
    // AI-Report v2.5: 8px · 50% opacity · gold mono (본문 블록 최하단).
    const styles = await page.getByTestId("ai-report").evaluate((el) => {
      const s = getComputedStyle(el);
      return { size: s.fontSize, opacity: s.opacity };
    });
    expect(styles.size).toBe("8px");
    expect(Number(styles.opacity)).toBeCloseTo(0.5, 1);
  });
});
