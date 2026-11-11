/**
 * EDITOR-FIX-1 E2E — 서버 초안 자동 저장 · 이어서 만들기 · 한글 키워드 Enter.
 *
 * 흐름 ①: 빈 편집기 → 제목·키워드 입력 → "저장됨" → **새로고침** → [이어서 만들기]
 *         목록에 그 초안 → [열기] → 제목·키워드 그대로.
 * 흐름 ②: 한글 조합 중 Enter(isComposing) → 칩 0개 · 조합이 끝난 뒤 Enter → 칩 1개("키워드").
 *
 * Firestore 쓰기는 진짜다(프리뷰 프로젝트의 tournamentDrafts) — **규칙이 배포돼 있어야
 * 돈다.** 정리는 이 spec 이 쓴 제목의 초안만 지운다(labDrafts.ts).
 */
import { expect, test } from "@playwright/test";
import { deleteE2EDrafts, openFreshLabEditor, seedE2EDraft } from "./labDrafts";
import { stubManageTournament } from "./labManage";

const TITLE = "EDITOR-FIX-1 E2E";
let consoleErrors: string[] = [];

test.use({ viewport: { width: 1600, height: 1000 } }); // ≥1440 (DesktopOnly)

test.beforeEach(async ({ page }) => {
  consoleErrors = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });
});

test.afterEach(async () => {
  expect(consoleErrors, "Console errors must be 0").toHaveLength(0);
});

test.afterAll(async () => {
  await deleteE2EDrafts([TITLE]);
});

test.describe("EDITOR-FIX-1 — 초안 자동 저장", () => {
  test.skip(!process.env.PREVIEW_URL, "PREVIEW_URL not set — 프리뷰 없이는 /admin/lab에 갈 수 없다");

  test("제목·키워드 입력 → 새로고침 → 이어서 만들기 → 값 그대로", async ({ page }) => {
    await deleteE2EDrafts([TITLE]);
    await openFreshLabEditor(page);

    await page.getByLabel("Tournament 제목").fill(TITLE);
    await page.getByLabel("키워드 추가").fill("초안보존");
    await page.getByLabel("키워드 추가").press("Enter");
    await expect(page.getByTestId("keyword-chip")).toHaveText(/초안보존/);

    const status = page.getByTestId("draft-save-status");
    await expect(status).toHaveAttribute("data-status", "saved", { timeout: 15_000 });

    await page.reload();
    const picker = page.getByTestId("draft-picker");
    await expect(picker).toBeVisible();
    const row = page.getByTestId("draft-row").filter({ hasText: TITLE });
    await expect(row).toHaveCount(1);
    await row.getByTestId("draft-open").click();

    await expect(page.getByLabel("Tournament 제목")).toHaveValue(TITLE);
    await expect(page.getByTestId("keyword-chip")).toHaveCount(1);
    await expect(page.getByTestId("keyword-chip")).toHaveText(/초안보존/);
  });

  test("한글 키워드: 조합 중 Enter 는 확정하지 않고, 조합이 끝난 뒤 Enter → 키워드 1개", async ({
    page,
  }) => {
    await openFreshLabEditor(page);
    const input = page.getByLabel("키워드 추가");
    await input.fill("키워드");

    // IME 가 조합 중일 때 브라우저가 보내는 keydown 그대로(isComposing · keyCode 229).
    await input.evaluate((el) => {
      el.dispatchEvent(
        new KeyboardEvent("keydown", {
          key: "Enter",
          code: "Enter",
          keyCode: 229,
          isComposing: true,
          bubbles: true,
          cancelable: true,
        }),
      );
    });
    await expect(page.getByTestId("keyword-chip")).toHaveCount(0);
    await expect(input).toHaveValue("키워드");

    await input.press("Enter");
    await expect(page.getByTestId("keyword-chip")).toHaveCount(1);
    await expect(page.getByTestId("keyword-chip")).toHaveText(/키워드/);
    await expect(input).toHaveValue("");
  });
});

/**
 * EDITOR-GRID-FIX — 아주 긴 유튜브 제목(200자) 한 칸이 8열 그리드를 넓혀 페이지가 가로로
 * 넘치던 고장(대표 실측 2026-11-10). 1440×900 창에서 ① 페이지 가로 넘침 없음 ② 첫 줄 8칸
 * ③ 제목 줄이 칸 안에서 "…" 로 잘림.
 */
const GRID_TITLE = "EDITOR-GRID-FIX E2E";
const LONG_VIDEO_TITLE = "아주긴영상제목".repeat(30).slice(0, 200);

test.describe("EDITOR-GRID-FIX — 긴 영상 제목 칸 넘침", () => {
  test.skip(!process.env.PREVIEW_URL, "PREVIEW_URL not set — 프리뷰 없이는 /admin/lab에 갈 수 없다");
  test.use({ viewport: { width: 1440, height: 900 } });

  test.afterAll(async () => {
    await deleteE2EDrafts([GRID_TITLE]);
  });

  test("1440 창 · 200자 제목 칸 → 넘침 없음 · 한 줄 8칸 · 제목 잘림", async ({ page }) => {
    expect(LONG_VIDEO_TITLE).toHaveLength(200);
    await deleteE2EDrafts([GRID_TITLE]);
    const contestants = Array.from({ length: 48 }, (_, i) => ({
      name: `E2E 엔트리 ${i + 1}`,
      nationality: "KR",
      affiliation: "E2E",
      imageSearchKeyword: "",
      videoId: "dQw4w9WgXcQ",
      videoTitle: i === 0 ? LONG_VIDEO_TITLE : "짧은 제목",
      videoChannel: "E2E 채널",
    }));
    const seeded = await seedE2EDraft({
      schemaVersion: 1,
      step: 2,
      title: GRID_TITLE,
      category: "",
      description: "",
      keywords: [],
      campaignSlug: "",
      deadlineMs: 0,
      contestants,
      thumbnailPair: { a: null, b: null, aPos: null, bPos: null, next: "a" },
    });
    expect(seeded, "관리자 키·TEST_UID 가 있어야 초안을 심는다").toBe(true);

    await stubManageTournament(page);
    await page.goto("/admin/lab?lang=ko");
    const row = page.getByTestId("draft-row").filter({ hasText: GRID_TITLE });
    await expect(row).toHaveCount(1);
    await row.getByTestId("draft-open").click();

    const meta = page.getByTestId("slot-meta-0");
    await expect(meta).toBeVisible();
    await expect(meta).toHaveAttribute("title", `${LONG_VIDEO_TITLE} · E2E 채널`);
    await meta.scrollIntoViewIfNeeded();

    await test.info().attach("1440x900", {
      body: await page.screenshot(),
      contentType: "image/png",
    });

    // ① 페이지 전체가 가로로 넘치지 않는다
    const widths = await page.evaluate(() => ({
      scroll: document.documentElement.scrollWidth,
      inner: window.innerWidth,
    }));
    expect(widths.scroll, `scrollWidth ${widths.scroll} > innerWidth ${widths.inner}`).toBeLessThanOrEqual(
      widths.inner,
    );

    // ② 첫 줄에 8칸 — 0~7번이 같은 높이, 8번은 다음 줄. 8번 칸 오른쪽 끝이 창 안.
    const tops: number[] = [];
    for (let i = 0; i <= 8; i++) {
      const box = await page.getByTestId(`contestant-node-${i}`).boundingBox();
      expect(box, `칸 ${i} 이 그려져야 한다`).not.toBeNull();
      tops.push(Math.round(box!.y));
      if (i === 7) expect(box!.x + box!.width).toBeLessThanOrEqual(widths.inner);
    }
    expect(new Set(tops.slice(0, 8)).size, `첫 줄 top: ${tops.join(",")}`).toBe(1);
    expect(tops[8]).toBeGreaterThan(tops[0]);

    // ③ 제목 줄이 칸 너비 안에서 잘린다(내용이 더 길다 = "…" 로 줄임)
    const clip = await meta.evaluate((el) => ({ scroll: el.scrollWidth, client: el.clientWidth }));
    expect(clip.client, "제목 줄에 너비가 있어야 한다(인라인이면 0)").toBeGreaterThan(0);
    expect(clip.scroll, `scrollWidth ${clip.scroll} ≤ clientWidth ${clip.client}`).toBeGreaterThan(clip.client);
  });
});
