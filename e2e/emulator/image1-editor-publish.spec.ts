/**
 * IMAGE-1 PR 1 — §11.2 E2E ① · ③ (에뮬레이터).
 *
 *   ① 시험 jpg 48장(setInputFiles) → "48 / 48" → 초안 자동 저장 → 새로고침 뒤 그림 남아 있음
 *   ③ [토너먼트 생성] → 확인창(체크 전 [발행하기] 꺼짐 · 불일치 칸 번호 누르면 그 칸으로) → 체크 3 → 발행
 *      → 엔트리 문서 media.image 가 대회 경로 복사본 · 초안 그림 정리 · 무대에 정지 그림
 */
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { expect, test, type Page } from "@playwright/test";
import {
  ADMIN_UID,
  DRAFT_TITLE,
  FIXTURE_48,
  MISMATCH_SLOT,
  adminApp,
  collectConsoleErrors,
  db,
  expectNoConsoleErrors,
  expectNoForbiddenWords,
  resetEmulators,
  seedCategories,
  seedDraft,
  signInAsAdmin,
  stubAiCallables,
  stubYouTubeImages,
} from "./helpers";

const EVIDENCE = join(__dirname, "..", "..", "outputs", "image-1-pr1-evidence");
mkdirSync(EVIDENCE, { recursive: true });

test.beforeEach(async () => {
  await resetEmulators();
  await seedCategories();
});

async function openSeededDraft(page: Page): Promise<void> {
  await page.goto("/admin/lab?lang=ko");
  await signInAsAdmin(page);
  await expect(page.getByTestId("draft-picker")).toBeVisible();
  await page.getByTestId("draft-row").filter({ hasText: DRAFT_TITLE }).getByTestId("draft-open").click();
  await expect(page.getByTestId("contestant-grid")).toBeVisible();
}

async function draftImageCount(id: string): Promise<number> {
  const snap = await db().collection("tournamentDrafts").doc(id).get();
  const cs = (snap.get("contestants") ?? []) as { imageUrl?: string }[];
  return cs.filter((c) => typeof c.imageUrl === "string" && c.imageUrl.length > 0).length;
}

test("① 48장 넣기 → 48 / 48 → 저장 → 새로고침 뒤 남음 → ③ 확인창 → 발행 → 무대 정지 그림", async ({ page }) => {
  test.setTimeout(240_000);
  const draftId = await seedDraft();
  const errors = collectConsoleErrors(page);
  await stubAiCallables(page);
  await stubYouTubeImages(page);
  await openSeededDraft(page);

  // ① 도구 줄을 열고 48장
  await page.getByTestId("lab-manual-tools-toggle").click();
  await expect(page.getByTestId("lab-add-image-files")).toBeVisible();
  await page.getByTestId("lab-add-image-files-input").setInputFiles(FIXTURE_48);
  await expect(page.getByTestId("image-progress")).toHaveText("48 / 48", { timeout: 90_000 });
  await expect(page.getByTestId("image-progress")).toHaveAttribute("data-busy", "false");
  // 그림만 있는 칸 = "그림" 배지 · 10번 칸은 영상이 먼저라 배지 없음
  await expect(page.getByTestId("slot-image-badge-0")).toHaveText("그림");
  await expect(page.getByTestId(`slot-image-badge-${MISMATCH_SLOT}`)).toHaveCount(0);
  await expect(page.getByTestId("contestant-pick-0")).toHaveAttribute("style", /127\.0\.0\.1:9199/);

  // 자동 저장(초안 문서에 48칸 그림)
  await expect.poll(() => draftImageCount(draftId), { timeout: 30_000 }).toBe(48);
  const [draftFiles] = await adminApp().storage().bucket().getFiles({ prefix: `entry-images/drafts/${ADMIN_UID}/${draftId}/` });
  expect(draftFiles.length).toBe(96); // 1600 + 600 두 장씩

  // 새로고침 뒤에도 남아 있다
  await page.reload();
  await expect(page.getByTestId("draft-picker")).toBeVisible();
  await page.getByTestId("draft-row").filter({ hasText: DRAFT_TITLE }).getByTestId("draft-open").click();
  await expect(page.getByTestId("slot-image-badge-0")).toBeVisible();
  await expect(page.getByTestId("slot-image-badge-47")).toBeVisible();

  // 48칸 미리보기 주소가 전부 실제로 열린다(600 사본 · 우리 Storage) — 캡처 전에 다 불러오게 한다.
  const thumbs = await page.evaluate(() =>
    Array.from({ length: 48 }, (_, i) => {
      const el = document.querySelector<HTMLElement>(`[data-testid="contestant-pick-${i}"]`);
      return /url\("?([^")]+)"?\)/.exec(el?.style.backgroundImage ?? "")?.[1] ?? "";
    }),
  );
  expect(thumbs.filter((u) => u.includes("127.0.0.1:9199")).length).toBe(47); // 10번 칸은 영상 썸네일
  for (const u of thumbs.filter((x) => x.includes("127.0.0.1:9199"))) {
    expect((await page.request.get(u)).status(), u).toBe(200);
  }
  await page.evaluate(
    (urls) => Promise.all(urls.map((u) => new Promise((r) => { const im = new Image(); im.onload = im.onerror = r; im.src = u; }))),
    thumbs,
  );
  await page.getByTestId("contestant-grid").screenshot({ path: join(EVIDENCE, "editor-grid-48-1440.png") });

  // 이름↔영상 불일치 배지(10번 칸) · 금지 낱말 없음
  await expect(page.getByTestId(`contestant-node-${MISMATCH_SLOT}`).locator('[data-review-flag="name-video-mismatch"]')).toBeVisible();
  await expectNoForbiddenWords(page);

  // [만들기 매뉴얼]
  await page.getByTestId("lab-making-manual").click();
  await expect(page.getByTestId("making-manual")).toContainText("대회 만들기 — 이렇게 진행하세요");
  await page.getByTestId("making-manual-close").click();
  await expect(page.getByTestId("making-manual")).toHaveCount(0);

  // ③ 대표 매치(그림 칸 둘) → [토너먼트 생성] → 확인창
  await page.getByTestId("contestant-pick-0").click();
  await page.getByTestId("contestant-pick-1").click();
  await expect(page.getByTestId("publish-button")).toBeEnabled();
  await page.getByTestId("publish-button").click();
  const dialog = page.getByTestId("publish-confirm");
  await expect(dialog).toBeVisible();
  await expect(page.getByTestId("confirm-publish")).toBeDisabled();
  await expect(page.getByTestId("confirm-warn")).toContainText("이름과 영상이 다를 수 있는 칸 1개");
  await page.screenshot({ path: join(EVIDENCE, "publish-confirm-1440.png") });

  // 불일치 칸 번호를 누르면 확인창이 닫히고 그 칸으로 간다
  await page.getByTestId(`confirm-goto-${MISMATCH_SLOT}`).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByTestId(`contestant-node-${MISMATCH_SLOT}`)).toBeInViewport();

  // 다시 열고 체크 3 → 발행
  await page.getByTestId("publish-button").click();
  await page.getByTestId("confirm-check-1").check();
  await page.getByTestId("confirm-check-2").check();
  await expect(page.getByTestId("confirm-publish")).toBeDisabled();
  await page.getByTestId("confirm-check-3").check();
  await expect(page.getByTestId("confirm-publish")).toBeEnabled();
  await page.getByTestId("confirm-publish").click();
  await expect(page.getByText("✓ 토너먼트 생성 완료")).toBeVisible({ timeout: 60_000 });

  // 발행 결과: 엔트리 문서 media.image = 대회 경로 복사본
  const tSnap = await db().collection("tournaments").where("hostUid", "==", ADMIN_UID).get();
  expect(tSnap.size).toBe(1);
  const tid = tSnap.docs[0].id;
  const cSnap = await db().collection("contestants").where("tournamentId", "==", tid).get();
  expect(cSnap.size).toBe(48);
  const byOrder = new Map(cSnap.docs.map((d) => [d.get("order") as number, d.data()]));
  const first = byOrder.get(1)!;
  expect(first.media.type).toBe("image");
  expect(first.media.image.storagePath).toBe(`entry-images/tournaments/${tid}/0.jpg`);
  expect(first.media.image.url).toContain(encodeURIComponent(`entry-images/tournaments/${tid}/0.jpg`));
  expect(first.media.image.origin).toBe("upload");
  const video = byOrder.get(MISMATCH_SLOT + 1)!;
  expect(video.media.type).toBe("embed");
  expect(video.media.image.storagePath).toBe(`entry-images/tournaments/${tid}/${MISMATCH_SLOT}.jpg`);
  const [tFiles] = await adminApp().storage().bucket().getFiles({ prefix: `entry-images/tournaments/${tid}/` });
  expect(tFiles.length).toBe(96);
  // 초안 그림은 정리된다 · 초안 문서도 같은 배치에서 지워졌다
  await expect
    .poll(async () => (await adminApp().storage().bucket().getFiles({ prefix: `entry-images/drafts/${ADMIN_UID}/${draftId}/` }))[0].length, { timeout: 30_000 })
    .toBe(0);
  expect((await db().collection("tournamentDrafts").doc(draftId).get()).exists).toBe(false);

  await expectNoConsoleErrors(errors);

  // 무대: 정지 그림(재생기 없음)
  const stageErrors = collectConsoleErrors(page);
  await page.goto(`/arena/${tid}?lang=ko`);
  await expect(page.getByTestId("stage-still").first()).toBeVisible({ timeout: 30_000 });
  const intro = page.getByTestId("arena-intro");
  if (await intro.isVisible()) await page.getByTestId("arena-intro-start").click();
  await expect(page.getByTestId("stage-player")).toHaveCount(0);
  await expectNoConsoleErrors(stageErrors);
});

test("리뷰 I-1 — 24장 + 24장을 연달아 넣어도 48칸이 다 다른 그림", async ({ page }) => {
  const draftId = await seedDraft();
  const errors = collectConsoleErrors(page);
  await stubYouTubeImages(page);
  await openSeededDraft(page);
  await page.getByTestId("lab-manual-tools-toggle").click();
  const input = page.getByTestId("lab-add-image-files-input");
  await input.setInputFiles(FIXTURE_48.slice(0, 24));
  await input.setInputFiles(FIXTURE_48.slice(24));
  await expect(page.getByTestId("image-progress")).toHaveText("48 / 48", { timeout: 90_000 });
  await expect(page.getByTestId("image-progress")).toHaveAttribute("data-busy", "false");
  await expect.poll(() => draftImageCount(draftId), { timeout: 30_000 }).toBe(48);
  const cs = (await db().collection("tournamentDrafts").doc(draftId).get()).get("contestants") as { imageStoragePath?: string }[];
  expect(new Set(cs.map((c) => c.imageStoragePath)).size).toBe(48);
  await expectNoConsoleErrors(errors);
});
