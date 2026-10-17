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
import { deleteE2EDrafts, openFreshLabEditor } from "./labDrafts";

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
