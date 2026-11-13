/**
 * LAB-FIX-3 추가분 (원장 D-90) — 대회 종류(영상 대회 · 이미지 대회) 잠금 (에뮬레이터 · `?lang=ko`).
 *
 * 추가 지시서 §5 의 1~6 을 걷는다. AI 채우기 · 검색 견적은 가짜 응답(바깥 사이트를 부르지 않는다).
 * [동영상 생성]은 채우기 → 견적 창까지 가고 [취소] 한다 — 영상 검색은 하지 않는다.
 */
import { expect, test, type Page } from "@playwright/test";
import {
  DRAFT_TITLE,
  MISMATCH_SLOT,
  collectConsoleErrors,
  db,
  dismissConsent,
  resetEmulators,
  seedCategories,
  seedDraft,
  signInAsAdmin,
  stubAiCallables,
  stubYouTubeImages,
} from "./helpers";

const NOTE = "처음 누른 버튼으로 대회 종류(영상 · 이미지)가 정해집니다. 바꾸려면 초안을 지우고 새로 시작하세요.";

test.beforeEach(async () => {
  await resetEmulators();
  await seedCategories();
});

async function stubFillAndQuote(page: Page) {
  await stubAiCallables(page);
  await page.route(/\/aiFillContestants$/, (route) =>
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        result: {
          contestants: Array.from({ length: 48 }, (_, i) => ({
            name: `종류시험${i + 1}`, nationality: "KR", affiliation: `그룹${i + 1}`, imageSearchKeyword: "",
          })),
        },
      }),
    }),
  );
  // 견적(드라이런)만 — 실제 검색은 [취소]로 돌리지 않는다.
  await page.route(/\/autoSourceVideos$/, (route) =>
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        result: {
          dryRun: true,
          quota: {
            estimate: { searchCalls: 48, units: 4800 },
            usage: { searchCalls: 0, units: 0 },
            remaining: { searchCalls: 100, units: 10000 },
            cachedSlots: 0,
            searchableSlots: 48,
            searchMaxResults: 5,
          },
        },
      }),
    }),
  );
}

async function fillStep1(page: Page, title: string) {
  await page.getByLabel("Tournament 제목").fill(title);
  await page.getByLabel("카테고리").selectOption("KPOP");
  await page.getByLabel("키워드 추가").fill("종류");
  await page.getByLabel("키워드 추가").press("Enter");
  await page.getByTestId("lab-next-button").click();
  await expect(page.getByTestId("contestant-grid")).toBeVisible();
}

const draftKind = async (title: string) => {
  const snap = await db().collection("tournamentDrafts").where("title", "==", title).get();
  return snap.empty ? undefined : (snap.docs[0].get("mediaKind") as string | undefined);
};

test("§5-1·2·6·3 새 초안 → [동영상 생성]이 영상 대회로 잠금 · 새로고침 뒤 유지 · 새로 시작 → [이미지 생성]이 이미지 대회로 잠금", async ({ page }) => {
  test.setTimeout(180_000);
  const errors = collectConsoleErrors(page);
  await stubFillAndQuote(page);
  await stubYouTubeImages(page);
  await page.goto("/admin/lab?lang=ko");
  await signInAsAdmin(page);
  await dismissConsent(page);
  await fillStep1(page, "영상 대회 시험");

  // ① 종류 미정 — 칸에 넣기 버튼 없음 · 두 생성 버튼 켜짐 · 밑에 안내 한 줄
  await expect(page.getByTestId("lab-generate-videos")).toBeEnabled();
  await expect(page.getByTestId("lab-generate-images")).toBeEnabled();
  await expect(page.getByTestId("lab-media-kind-note")).toHaveText(NOTE);
  for (const id of ["slot-video-0", "slot-image-url-0", "slot-image-file-0"]) {
    await expect(page.getByTestId(id)).toHaveCount(0);
  }
  await page.getByTestId("lab-manual-tools-toggle").click();
  await expect(page.getByTestId("lab-open-embed-inspector")).toHaveCount(0);
  await expect(page.getByTestId("lab-add-image-files")).toHaveCount(0);
  await page.screenshot({ path: test.info().outputPath("k1-undecided.png") });

  // ② [동영상 생성] → 채우기 → 견적 창 [취소] → [이미지 생성] 꺼짐(툴팁 2a) · 칸에 [영상]만
  await page.getByTestId("lab-generate-videos").click();
  await expect(page.getByTestId("auto-source-confirm")).toBeVisible();
  await page.getByTestId("auto-source-confirm").getByRole("button", { name: "취소" }).click();
  await expect(page.getByTestId("lab-step2-counter")).toContainText("48/48");
  await expect(page.getByTestId("lab-generate-images")).toBeDisabled();
  await expect(page.getByTestId("lab-generate-images")).toHaveAttribute("title", "이 대회는 영상 대회입니다.");
  await expect(page.getByTestId("slot-video-0")).toHaveText("영상");
  await expect(page.getByTestId("slot-image-url-0")).toHaveCount(0);
  await expect(page.getByTestId("slot-image-file-0")).toHaveCount(0);
  await expect(page.getByTestId("lab-open-embed-inspector")).toBeVisible();
  await expect(page.getByTestId("lab-add-image-files")).toHaveCount(0);
  await expect.poll(() => draftKind("영상 대회 시험"), { timeout: 20_000 }).toBe("video");
  await page.screenshot({ path: test.info().outputPath("k2-video-locked.png") });

  // ⑥ 새로고침 뒤에도 종류 유지
  await page.reload();
  await signInAsAdmin(page);
  await page.getByTestId("draft-row").filter({ hasText: "영상 대회 시험" }).getByTestId("draft-open").click();
  await expect(page.getByTestId("lab-generate-images")).toBeDisabled();
  await expect(page.getByTestId("slot-video-0")).toBeVisible();

  // ③ [초안 목록] → [새로 시작] → [이미지 생성] → [동영상 생성] 꺼짐(툴팁 2b) · [이미지]·[이미지 파일]만 · 검수기 없음
  await page.getByTestId("draft-back-to-list").click();
  await page.getByTestId("draft-menu-new").click();
  await fillStep1(page, "이미지 대회 시험");
  await expect(page.getByTestId("lab-generate-videos")).toBeEnabled();
  await page.getByTestId("lab-generate-images").click();
  await expect(page.getByTestId("lab-step2-counter")).toContainText("48/48");
  await expect(page.getByTestId("lab-generate-videos")).toBeDisabled();
  await expect(page.getByTestId("lab-generate-videos")).toHaveAttribute("title", "이 대회는 이미지 대회입니다.");
  await expect(page.getByTestId("slot-image-url-0")).toHaveText("이미지");
  await expect(page.getByTestId("slot-image-file-0")).toHaveText("이미지 파일");
  await expect(page.getByTestId("slot-video-0")).toHaveCount(0);
  if (!(await page.getByTestId("lab-manual-tools").isVisible())) await page.getByTestId("lab-manual-tools-toggle").click();
  await expect(page.getByTestId("lab-open-embed-inspector")).toHaveCount(0);
  await expect(page.getByTestId("lab-add-image-files")).toBeVisible();
  await expect.poll(() => draftKind("이미지 대회 시험"), { timeout: 20_000 }).toBe("image");
  await page.screenshot({ path: test.info().outputPath("k3-image-locked.png") });
  expect(errors, errors.join("\n")).toHaveLength(0);
});

test("§5-4 종류 칸이 없는 옛 초안(영상만) → 영상 대회로 정해짐", async ({ page }) => {
  await seedDraft("e2eDraft1", "video", { storeKind: false });
  await stubYouTubeImages(page);
  await page.goto("/admin/lab?lang=ko");
  await signInAsAdmin(page);
  await page.getByTestId("draft-row").filter({ hasText: DRAFT_TITLE }).getByTestId("draft-open").click();
  await expect(page.getByTestId("contestant-grid")).toBeVisible();
  await expect(page.getByTestId("lab-generate-images")).toBeDisabled();
  await expect(page.getByTestId("lab-generate-images")).toHaveAttribute("title", "이 대회는 영상 대회입니다.");
  await expect(page.getByTestId("slot-video-0")).toBeVisible();
  await expect(page.getByTestId("slot-image-url-0")).toHaveCount(0);
});

test("§5-5 섞인 초안(영상 대회에 그림 칸) → 대표 매치를 골라도 발행 버튼 꺼짐 · 그림은 빼기 전용 켜진 [이미지]", async ({ page }) => {
  const id = await seedDraft("e2eDraft1", "video");
  const ref = db().collection("tournamentDrafts").doc(id);
  const cs = (await ref.get()).get("contestants") as Record<string, unknown>[];
  cs[5] = { ...cs[5], imageUrl: "http://127.0.0.1:9199/fake/5.jpg", imageThumbUrl: "http://127.0.0.1:9199/fake/5.jpg" };
  await ref.update({ contestants: cs });
  await stubYouTubeImages(page);
  await page.goto("/admin/lab?lang=ko");
  await signInAsAdmin(page);
  await page.getByTestId("draft-row").filter({ hasText: DRAFT_TITLE }).getByTestId("draft-open").click();
  await expect(page.getByTestId("contestant-grid")).toBeVisible();

  await page.getByTestId(`contestant-pick-${MISMATCH_SLOT}`).click();
  await page.getByTestId("contestant-pick-5").click();
  await expect(page.getByTestId("publish-button")).toBeDisabled();
  await expect(page.getByTestId("slot-image-url-5")).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByTestId("slot-image-file-5")).toHaveCount(0);
  await page.screenshot({ path: test.info().outputPath("k5-mixed-blocked.png") });
});
