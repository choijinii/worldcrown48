/**
 * LAB-FIX-3b — 엔트리 칸 버튼 줄 · 이미지 대회 빈칸 버튼 이름 (에뮬레이터).
 *
 * 지시서 §10-1 의 확인 항목을 걷는다.
 *  ① 영상 대회: 리뷰 표시(이름↔영상 불일치)가 있는 칸과 없는 칸의 [영상] 세로 위치(px)가 같다.
 *     두 칸은 내용이 같게 만든다(둘 다 손으로 넣은 영상 + 제목 한 줄) — 다른 것은 리뷰 표시 하나뿐.
 *  ② 주소 칸을 열기 전 · 연 뒤 · 실패 문구가 뜬 뒤 · 닫은 뒤 [영상] 위치가 같다.
 *  ③ 빈칸 버튼 이름: 영상 대회 = "빈칸 채우고 영상까지" · 이미지 대회 = "빈칸 채우기" / "Fill blanks" / "Rellenar vacíos".
 */
import { expect, test, type Page } from "@playwright/test";
import {
  DRAFT_TITLE,
  MISMATCH_SLOT,
  collectConsoleErrors,
  db,
  resetEmulators,
  seedCategories,
  seedDraft,
  signInAsAdmin,
  stubYouTubeImages,
} from "./helpers";

const VID = "dQw4w9WgXcQ";
const FLAGGED = MISMATCH_SLOT; // 10 — 제목 "Other MV" 에 이름·소속이 없다 → 불일치 표시
const CLEAN = MISMATCH_SLOT + 1; // 11 — 제목에 이름이 있다 → 표시 없음
const EMPTY = MISMATCH_SLOT + 2; // 12 — 영상 없는 칸(주소 칸 열기)

test.beforeEach(async () => {
  await resetEmulators();
  await seedCategories();
});

async function openDraft(page: Page, lang: "ko" | "en" | "es" = "ko") {
  await stubYouTubeImages(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`/admin/lab?lang=${lang}`);
  await signInAsAdmin(page);
  await page.getByTestId("draft-row").filter({ hasText: DRAFT_TITLE }).getByTestId("draft-open").click();
  await expect(page.getByTestId("contestant-grid")).toBeVisible();
}

const top = async (page: Page, id: string) => {
  const box = await page.getByTestId(id).boundingBox();
  if (!box) throw new Error(`${id} 가 화면에 없다`);
  return box.y;
};

async function openTools(page: Page) {
  if (!(await page.getByTestId("lab-manual-tools").isVisible())) await page.getByTestId("lab-manual-tools-toggle").click();
}

test("① 리뷰 표시가 있는 칸과 없는 칸의 [영상] 높이가 같다 · ② 주소 칸을 열고 닫아도 버튼이 그대로", async ({ page }) => {
  const errors = collectConsoleErrors(page);
  const id = await seedDraft("e2eDraft1", "video");
  const ref = db().collection("tournamentDrafts").doc(id);
  const cs = (await ref.get()).get("contestants") as Record<string, unknown>[];
  const manual = (title: string) => ({
    videoId: VID, videoStartSec: 0, videoEndSec: 15, videoSourceUrl: `https://www.youtube.com/watch?v=${VID}`,
    videoTitle: title, videoChannel: "Other Channel", manualVideo: true,
  });
  cs[FLAGGED] = { ...cs[FLAGGED], ...manual("Other MV") };
  cs[CLEAN] = { ...cs[CLEAN], ...manual(`${cs[CLEAN].name as string} MV`) };
  await ref.update({ contestants: cs });
  await openDraft(page);

  // 두 칸이 같은 가로줄에 있다(1440 창) — 칸 윗변이 같다.
  const flaggedCard = await top(page, `contestant-node-${FLAGGED}`);
  const cleanCard = await top(page, `contestant-node-${CLEAN}`);
  expect(flaggedCard).toBe(cleanCard);

  await expect(page.getByTestId(`contestant-review-${FLAGGED}`)).toBeVisible();
  await expect(page.getByTestId(`contestant-review-${CLEAN}`)).toHaveCount(0);
  await expect(page.getByTestId(`slot-video-${FLAGGED}`)).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByTestId(`slot-video-${CLEAN}`)).toHaveAttribute("aria-pressed", "true");

  const yFlagged = await top(page, `slot-video-${FLAGGED}`);
  const yClean = await top(page, `slot-video-${CLEAN}`);
  test.info().annotations.push({ type: "①[영상] y(px)", description: `표시 있음 ${yFlagged} · 표시 없음 ${yClean}` });
  expect(yFlagged).toBe(yClean);
  // 리뷰 표시와 같은 줄(오른쪽 끝)
  const review = (await page.getByTestId(`contestant-review-${FLAGGED}`).boundingBox())!;
  const btn = (await page.getByTestId(`slot-video-${FLAGGED}`).boundingBox())!;
  expect(btn.x).toBeGreaterThan(review.x);
  expect(Math.abs(btn.y - review.y)).toBeLessThan(btn.height);
  // 칸 높이는 키우지 않는다(지시서 §2-5) — 고치기 전과 비교하려고 기록만 남긴다.
  const h = async (i: number) => (await page.getByTestId(`contestant-node-${i}`).boundingBox())!.height;
  const heights = `표시 있음 칸 ${await h(FLAGGED)} · 표시 없음 칸 ${await h(CLEAN)} · 빈 칸 ${await h(EMPTY)} · 자동 칸 ${await h(0)}`;
  test.info().annotations.push({ type: "칸 높이(px) 1440×900", description: heights });
  console.log(`[3b] 칸 높이 ${heights} · [영상] y ${yFlagged}/${yClean}`);
  await page.getByTestId(`contestant-node-${FLAGGED}`).screenshot({ path: test.info().outputPath("r1-flagged.png") });
  await page.getByTestId(`contestant-node-${CLEAN}`).screenshot({ path: test.info().outputPath("r1-clean.png") });

  // ② 빈 칸: 열기 전 → 연 뒤 → 실패 문구 → 닫은 뒤
  const before = await top(page, `slot-video-${EMPTY}`);
  await page.getByTestId(`slot-video-${EMPTY}`).click();
  await expect(page.getByTestId(`slot-video-input-${EMPTY}`)).toBeVisible();
  const opened = await top(page, `slot-video-${EMPTY}`);
  const input = (await page.getByTestId(`slot-video-input-${EMPTY}`).boundingBox())!;
  expect(input.y).toBeGreaterThan(opened);
  await page.getByTestId(`slot-video-input-${EMPTY}`).fill("https://example.com/not-youtube");
  await page.getByTestId(`slot-video-input-${EMPTY}`).press("Enter");
  await expect(page.getByTestId(`slot-video-fail-${EMPTY}`)).toBeVisible();
  const failed = await top(page, `slot-video-${EMPTY}`);
  await page.getByTestId(`contestant-node-${EMPTY}`).screenshot({ path: test.info().outputPath("r2-line-open.png") });
  await page.getByTestId(`slot-video-${EMPTY}`).click();
  await expect(page.getByTestId(`slot-video-input-${EMPTY}`)).toHaveCount(0);
  const closed = await top(page, `slot-video-${EMPTY}`);
  test.info().annotations.push({ type: "②[영상] y(px)", description: `열기 전 ${before} · 연 뒤 ${opened} · 실패 문구 ${failed} · 닫은 뒤 ${closed}` });
  console.log(`[3b] 주소 칸 [영상] y 열기 전 ${before} · 연 뒤 ${opened} · 실패 문구 ${failed} · 닫은 뒤 ${closed}`);
  expect([opened, failed, closed]).toEqual([before, before, before]);

  // ③ 영상 대회 빈칸 버튼 이름은 그대로
  await openTools(page);
  await expect(page.getByTestId("fill-blanks-button")).toHaveText("빈칸 채우고 영상까지");
  expect(errors, errors.join("\n")).toHaveLength(0);
});

for (const [lang, label] of [["ko", "빈칸 채우기"], ["en", "Fill blanks"], ["es", "Rellenar vacíos"]] as const) {
  test(`③ 이미지 대회 빈칸 버튼 이름 (${lang}) = "${label}" · [이미지] 줄 오른쪽 끝`, async ({ page }) => {
    await seedDraft("e2eDraft1", "image");
    await openDraft(page, lang);
    await openTools(page);
    await expect(page.getByTestId("fill-blanks-button")).toHaveText(label);
    // 이미지 대회 칸 줄: 버튼 묶음이 칸 오른쪽 끝에 붙어 있다.
    const card = (await page.getByTestId("contestant-node-0").boundingBox())!;
    const file = (await page.getByTestId("slot-image-file-0").boundingBox())!;
    expect(card.x + card.width - (file.x + file.width)).toBeLessThan(12);
    await page.getByTestId("lab-manual-tools").screenshot({ path: test.info().outputPath(`r3-fill-${lang}.png`) });
  });
}
