/**
 * THUMB-1 PR 1 E2E — 편집기 대표 매치 (원장 D-35 · D-56).
 *
 * A·B 고르기 전 게시 잠김 → 2개 고르면 열림 → 세 번째 누르면 A 교체 →
 * 위치 막대를 움직이면 미리보기(피치 카드 1개)가 바로 바뀐다.
 *
 * 게시는 하지 않는다(게시 → thumbnailPair 저장은 b1-admin-lab.spec.ts). 콜러블은 전부
 * 스텁. 이 spec 이 친 내용은 자동 저장으로 초안이 되므로 제목으로 지운다.
 */
import { expect, test, type Page } from "@playwright/test";
import { deleteE2EDrafts, openFreshLabEditor } from "./labDrafts";
import { attachVideosToFirstSlots, stubVideoInspector } from "./labVideos";

const TITLE = "THUMB-1 E2E";
let consoleErrors: string[] = [];

function fakeContestants() {
  return Array.from({ length: 48 }, (_, i) => ({
    name: `THUMB Player ${i + 1}`,
    nationality: "KR",
    affiliation: "",
    imageSearchKeyword: `thumb player ${i + 1}`,
  }));
}

async function stubFill(page: Page) {
  await page.route("**/aiFillContestants*", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ result: { contestants: fakeContestants() } }),
    }),
  );
}

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

test.describe("THUMB-1 — 대표 매치 고르기", () => {
  test.skip(!process.env.PREVIEW_URL, "PREVIEW_URL not set — 프리뷰 없이는 /admin/lab에 갈 수 없다");

  test("잠김 → A·B 고르면 열림 → 세 번째는 A 교체 → 막대가 미리보기를 바꾼다", async ({ page }) => {
    await stubFill(page);
    await stubVideoInspector(page, 3);
    await deleteE2EDrafts([TITLE]);
    await openFreshLabEditor(page); // ?lang=ko 고정

    await page.getByLabel("Tournament 제목").fill(TITLE);
    await page.getByLabel("카테고리").selectOption("FOOTBALL");
    await page.getByLabel("키워드 추가").fill("thumb-e2e");
    await page.getByLabel("키워드 추가").press("Enter");
    await page.getByTestId("lab-next-button").click();

    await page.getByTestId("lab-generate-images").click();
    await expect(page.getByTestId("lab-step2-counter")).toContainText("48/48");
    await attachVideosToFirstSlots(page, 3);
    await expect(page.getByTestId("lab-step2-counter")).toContainText("48/48");

    const publish = page.getByTestId("publish-button");
    const reason = page.getByTestId("pair-lock-reason");
    await expect(page.getByTestId("pair-panel")).toBeVisible();

    // ① 아무것도 안 고름 — 48칸이 다 차도 잠김 + 이유 한 줄.
    await expect(publish).toBeDisabled();
    await expect(reason).toHaveText("A와 B를 모두 골라야 생성할 수 있습니다");

    // 영상이 없는 칸은 고를 수 없다.
    await expect(page.getByTestId("contestant-pick-10")).not.toHaveAttribute("role", "button");

    // ② A 만.
    await page.getByTestId("contestant-pick-0").click();
    await expect(page.getByTestId("contestant-node-0")).toHaveAttribute("data-pair", "a");
    await expect(reason).toHaveText("B를 아직 고르지 않았습니다");
    await expect(publish).toBeDisabled();

    // ③ A·B — 열림. 위치 기본값 = 가로 영상 가운데 50.
    await page.getByTestId("contestant-pick-1").click();
    await expect(page.getByTestId("contestant-node-1")).toHaveAttribute("data-pair", "b");
    await expect(reason).toHaveAttribute("data-complete", "true");
    await expect(publish).toBeEnabled();
    await expect(page.getByTestId("pair-pos-a-value")).toHaveText("50%");

    // ④ 세 번째 → A 교체(1번 표시가 빠지고 3번이 A).
    await page.getByTestId("contestant-pick-2").click();
    await expect(page.getByTestId("contestant-node-2")).toHaveAttribute("data-pair", "a");
    await expect(page.getByTestId("contestant-node-0")).toHaveAttribute("data-pair", "");
    await expect(page.getByTestId("contestant-node-1")).toHaveAttribute("data-pair", "b");
    await expect(page.getByTestId("pair-slot-a-name")).toHaveText("E2E Video C");

    // ⑤ 막대 → 미리보기의 A 그림이 좌우로만 움직인다.
    const previewA = page.getByTestId("pair-preview-thumb").getByTestId("vsthumb-a-img");
    await expect(previewA).toHaveCSS("object-position", "50% 50%");
    const slider = page.getByTestId("pair-pos-a");
    await slider.focus();
    for (let i = 0; i < 20; i++) await slider.press("ArrowLeft");
    await expect(page.getByTestId("pair-pos-a-value")).toHaveText("30%");
    await expect(previewA).toHaveCSS("object-position", "30% 50%");

    // ⑥ 1440 창(The Lab 의 하한)에서 가로로 넘치지 않는다 — 패널·게시 버튼이 잘리지 않는다.
    await page.setViewportSize({ width: 1440, height: 1000 });
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow, "1440 에서 가로 넘침(px)").toBe(0);
    await expect(publish).toBeInViewport({ ratio: 1 });
  });
});
