/**
 * LAB-FIX-3 (원장 D-89) — 엔트리 칸 [영상]·[이미지] 켜고 끄기 · 주소 기억 · [초안 목록] 펼침 (에뮬레이터).
 *
 * 지시서 §5 의 1·2·3·4·6·8·9 를 걷는다(`?lang=ko`). 유튜브 검사·제목 추출 콜러블은 검수기와 같은 모양의
 * 가짜 응답으로 대신한다 — CI 는 바깥 사이트(유튜브 · AI)를 부르지 않는다. 몇 번 불렸는지는 여기서 센다.
 * 1440×900 창에서 칸 높이(px)도 재어 시험 기록(annotations)에 남긴다(§3-7).
 */
import { expect, test, type Page } from "@playwright/test";
import * as admin from "firebase-admin";
import {
  ADMIN_UID,
  DRAFT_TITLE,
  MISMATCH_SLOT,
  collectConsoleErrors,
  db,
  dismissConsent,
  resetEmulators,
  seedCategories,
  seedDraft,
  signInAsAdmin,
  startFakeImageServer,
  stubYouTubeImages,
} from "./helpers";

const VID = "dQw4w9WgXcQ";
const YT_URL = `https://www.youtube.com/watch?v=${VID}`;
const BLANK_SLOT = 7; // 이름까지 비운 칸
const NAMED_SLOT = 3; // 이름만 있는 칸(엔트리04)
const IMAGE_SLOT = 5;
const AUTO_SLOT = MISMATCH_SLOT; // 시드가 영상을 넣어 둔 칸 = 자동 칸

let server: Awaited<ReturnType<typeof startFakeImageServer>>;
test.beforeAll(async () => {
  server = await startFakeImageServer();
});
test.afterAll(async () => server?.close());
test.beforeEach(async () => {
  await resetEmulators();
  await seedCategories();
});

/** 검수기와 같은 모양의 가짜 콜러블 — 부른 횟수와 받은 값을 센다. */
async function stubYouTubeCallables(page: Page) {
  const calls = { validate: [] as string[][], extract: [] as { n: number; entryUnit: string }[] };
  await page.route(/\/validateYouTubeLinks$/, async (route) => {
    const ids = (JSON.parse(route.request().postData() ?? "{}") as { data: { videoIds: string[] } }).data.videoIds;
    calls.validate.push(ids);
    const verdicts = ids.map((videoId) => ({
      videoId, exists: true, embeddable: true, regionBlockedIn: [], regionAllowedOnly: [], ageRestricted: false,
      isLive: false, durationSec: 200, title: "IVE 아이브 'I AM' MV", channelTitle: "STARSHIP", thumbnailUrl: "",
      status: "pass", reasons: [],
    }));
    await route.fulfill({ contentType: "application/json", body: JSON.stringify({ result: { verdicts, apiCalls: 1 } }) });
  });
  await page.route(/\/extractContestantsFromVideos$/, async (route) => {
    const data = (JSON.parse(route.request().postData() ?? "{}") as { data: { items: { videoId: string }[]; entryUnit: string } }).data;
    calls.extract.push({ n: data.items.length, entryUnit: data.entryUnit });
    const extractions = data.items.map((v) => ({ videoId: v.videoId, name: "아이브", affiliation: "STARSHIP", nationality: "KR", confident: true }));
    await route.fulfill({ contentType: "application/json", body: JSON.stringify({ result: { extractions } }) });
  });
  return calls;
}

async function openSeededDraft(page: Page) {
  await page.goto("/admin/lab?lang=ko");
  await signInAsAdmin(page);
  await dismissConsent(page);
  await page.getByTestId("draft-row").filter({ hasText: DRAFT_TITLE }).getByTestId("draft-open").click();
  await expect(page.getByTestId("contestant-grid")).toBeVisible();
}

async function seedWithBlankSlot(): Promise<string> {
  const id = await seedDraft();
  const ref = db().collection("tournamentDrafts").doc(id);
  const cs = (await ref.get()).get("contestants") as Record<string, unknown>[];
  cs[BLANK_SLOT] = { name: "", nationality: "", affiliation: "", imageSearchKeyword: "" };
  await ref.update({ contestants: cs });
  return id;
}

const draftSlot = async (draftId: string, i: number) =>
  ((await db().collection("tournamentDrafts").doc(draftId).get()).get("contestants") as Record<string, unknown>[])[i];

test("§5-1·2·3 [영상] 넣기 → 켜짐 · 이름 채움 · 다시 누르면 빠짐 · 주소 기억 · 비유튜브 문구", async ({ page }) => {
  const draftId = await seedWithBlankSlot();
  const errors = collectConsoleErrors(page);
  await stubYouTubeImages(page);
  const calls = await stubYouTubeCallables(page);
  await openSeededDraft(page);

  // ① 이름이 빈 칸 — 검사 1회 · 추출 1회 · 그 칸만
  const nameOf = (i: number) => page.getByTestId(`contestant-node-${i}`).locator("input").first();
  const before8 = await nameOf(8).inputValue();
  await page.getByTestId(`slot-video-${BLANK_SLOT}`).click();
  const input = page.getByTestId(`slot-video-input-${BLANK_SLOT}`);
  await expect(input).toHaveAttribute("placeholder", "영상 주소 붙여 넣기");
  await input.fill(YT_URL);
  await input.press("Enter");
  await expect(page.getByTestId(`slot-video-${BLANK_SLOT}`)).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByTestId(`slot-video-input-${BLANK_SLOT}`)).toHaveCount(0);
  expect(calls.validate).toEqual([[VID]]);
  expect(calls.extract).toEqual([{ n: 1, entryUnit: "individual" }]);
  const node = page.getByTestId(`contestant-node-${BLANK_SLOT}`);
  await expect(node.locator("input").first()).toHaveValue("아이브");
  await expect(page.getByTestId(`contestant-pick-${BLANK_SLOT}`)).toHaveAttribute("style", /ytimg\.com/);
  await expect(nameOf(8)).toHaveValue(before8);
  await page.screenshot({ path: test.info().outputPath("1-video-added.png") });

  // ② 이름 있는 칸 — 이름 그대로(D-88) · 추출 안 부름
  await page.getByTestId(`slot-video-${NAMED_SLOT}`).click();
  await page.getByTestId(`slot-video-input-${NAMED_SLOT}`).fill(YT_URL);
  await page.getByTestId(`slot-line-submit-${NAMED_SLOT}`).click();
  await expect(page.getByTestId(`slot-video-${NAMED_SLOT}`)).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByTestId(`contestant-node-${NAMED_SLOT}`).locator("input").first()).toHaveValue("엔트리04");
  expect(calls.extract).toHaveLength(1);

  // 켜진 [영상] → 줄 닫힘 + 영상 빠짐(묻지 않음)
  await page.getByTestId(`slot-video-${NAMED_SLOT}`).click();
  await expect(page.getByTestId(`slot-video-${NAMED_SLOT}`)).toHaveAttribute("aria-pressed", "false");
  await expect(page.getByTestId(`slot-video-input-${NAMED_SLOT}`)).toHaveCount(0);
  await expect(page.getByTestId(`contestant-pick-${NAMED_SLOT}`)).not.toHaveAttribute("style", /ytimg\.com/);
  // 다시 [영상] → 먼저 넣은 주소가 채워져 있음 → Enter → 같은 영상
  await page.getByTestId(`slot-video-${NAMED_SLOT}`).click();
  await expect(page.getByTestId(`slot-video-input-${NAMED_SLOT}`)).toHaveValue(YT_URL);
  await page.getByTestId(`slot-video-input-${NAMED_SLOT}`).press("Enter");
  await expect(page.getByTestId(`slot-video-${NAMED_SLOT}`)).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByTestId(`contestant-pick-${NAMED_SLOT}`)).toHaveAttribute("style", /ytimg\.com/);
  await page.screenshot({ path: test.info().outputPath("2-video-toggle.png") });

  // ③ 비유튜브 → 승인 문구 3번 · 콜러블 안 부름
  const validateBefore = calls.validate.length;
  await page.getByTestId("slot-video-12").click();
  await page.getByTestId("slot-video-input-12").fill("https://vimeo.com/76979871");
  await page.getByTestId("slot-video-input-12").press("Enter");
  await expect(page.getByTestId("slot-video-fail-12")).toHaveText("지금은 유튜브 영상만 넣을 수 있어요.");
  expect(calls.validate).toHaveLength(validateBefore);
  await page.screenshot({ path: test.info().outputPath("3-not-youtube.png") });

  // 초안에는 기억, 손 넣기 표시
  await expect.poll(async () => (await draftSlot(draftId, NAMED_SLOT))?.manualVideoUrl ?? null, { timeout: 20_000 }).toBe(YT_URL);
  expect((await draftSlot(draftId, NAMED_SLOT))?.manualVideo).toBe(true);
  expect(errors, errors.join("\n")).toHaveLength(0);
});

test("§5-4·5·8 [이미지] 넣기 → 켜짐 → 빼기 · [이미지 파일] 그림도 켜진 [이미지]로 빠짐 · 새로고침 뒤 주소 기억 (이미지 대회)", async ({ page }) => {
  const draftId = await seedDraft("e2eDraft1", "image"); // D-90 — [이미지]는 이미지 대회에서만
  const errors = collectConsoleErrors(page);
  await stubYouTubeImages(page);
  await stubYouTubeCallables(page);
  await openSeededDraft(page);
  const imgUrl = `${server.base}/img/05.jpg`;

  await page.getByTestId(`slot-image-url-${IMAGE_SLOT}`).click();
  const input = page.getByTestId(`slot-image-url-input-${IMAGE_SLOT}`);
  await expect(input).toHaveAttribute("placeholder", "이미지 주소 붙여 넣기");
  await expect(page.getByTestId(`slot-line-submit-${IMAGE_SLOT}`)).toHaveAttribute("aria-label", "넣기 (Enter)");
  await input.fill(imgUrl);
  await page.getByTestId(`slot-line-submit-${IMAGE_SLOT}`).click();
  await expect(page.getByTestId(`slot-image-badge-${IMAGE_SLOT}`)).toHaveText("그림", { timeout: 30_000 });
  await expect(page.getByTestId(`slot-image-url-${IMAGE_SLOT}`)).toHaveAttribute("aria-pressed", "true");
  await page.screenshot({ path: test.info().outputPath("4-image-added.png") });

  await page.getByTestId(`slot-image-url-${IMAGE_SLOT}`).click();
  await expect(page.getByTestId(`slot-image-badge-${IMAGE_SLOT}`)).toHaveCount(0);
  await expect(page.getByTestId(`slot-image-url-${IMAGE_SLOT}`)).toHaveAttribute("aria-pressed", "false");

  // ⑤ [이미지 파일]로 넣은 그림도 켜진 [이미지]로 빠진다
  await page.getByTestId("slot-image-file-input-6").setInputFiles("e2e/fixtures/entry-images/06.jpg");
  await expect(page.getByTestId("slot-image-url-6")).toHaveAttribute("aria-pressed", "true", { timeout: 30_000 });
  await page.getByTestId("slot-image-url-6").click();
  await expect(page.getByTestId("slot-image-badge-6")).toHaveCount(0);

  // ⑧ 새로고침 뒤에도 주소 기억
  await expect.poll(async () => (await draftSlot(draftId, IMAGE_SLOT))?.manualImageUrl ?? null, { timeout: 20_000 }).toBe(imgUrl);
  await expect.poll(async () => (await draftSlot(draftId, IMAGE_SLOT))?.imageUrl ?? null, { timeout: 20_000 }).toBe(null);
  await page.reload();
  await signInAsAdmin(page);
  await page.getByTestId("draft-row").filter({ hasText: DRAFT_TITLE }).getByTestId("draft-open").click();
  await page.getByTestId(`slot-image-url-${IMAGE_SLOT}`).click();
  await expect(page.getByTestId(`slot-image-url-input-${IMAGE_SLOT}`)).toHaveValue(imgUrl);
  await page.screenshot({ path: test.info().outputPath("8-remembered-after-reload.png") });
  expect(errors, errors.join("\n")).toHaveLength(0);
});

test("§5-6·7 자동 칸은 [새 영상 찾기]만 · 수동 칸에 [영상 찾기]·🔎·[그림 지우기] 없음 · 빈 칸 크라운 로고 · 칸 높이 (영상 대회)", async ({ page }) => {
  await seedDraft();
  await stubYouTubeImages(page);
  await openSeededDraft(page);

  // 자동 칸
  await expect(page.getByTestId(`contestant-refresh-${AUTO_SLOT}`)).toHaveText("새 영상 찾기");
  for (const id of ["slot-video", "slot-image-url", "slot-image-file"]) {
    await expect(page.getByTestId(`${id}-${AUTO_SLOT}`)).toHaveCount(0);
  }
  // 수동 칸 — 영상 대회라 [영상]만(D-90)
  await expect(page.getByTestId("slot-video-0")).toHaveText("영상");
  await expect(page.getByTestId("slot-image-url-0")).toHaveCount(0);
  await expect(page.getByTestId("slot-image-file-0")).toHaveCount(0);
  await expect(page.getByTestId("contestant-refresh-0")).toHaveCount(0);
  await expect(page.locator('[data-testid^="contestant-hint-"]')).toHaveCount(0);
  await expect(page.locator('[data-testid^="slot-image-remove-"]')).toHaveCount(0);
  await expect(page.getByTestId("slot-crown-0")).toHaveAttribute("src", "/brand/wc48-crown-filled.svg");

  // 칸을 화면 가운데로 — 창 아래 고정 띠에 가려진 채 찍히지 않게.
  await page.getByTestId(`contestant-node-${AUTO_SLOT}`).evaluate((el) => el.scrollIntoView({ block: "center" }));
  await expect(page.getByTestId(`contestant-refresh-${AUTO_SLOT}`)).toBeInViewport({ ratio: 1 });
  const manual = await page.getByTestId("contestant-node-0").boundingBox();
  const auto = await page.getByTestId(`contestant-node-${AUTO_SLOT}`).boundingBox();
  test.info().annotations.push({ type: "칸 높이(px) 1440×900", description: `수동 칸 ${manual?.height} · 자동 칸 ${auto?.height}` });
  console.log(`[LAB-FIX-3] 칸 높이 — 수동 칸 ${manual?.height}px · 자동 칸 ${auto?.height}px`);
  await page.getByTestId("contestant-node-0").evaluate((el) => el.scrollIntoView({ block: "center" }));
  await page.getByTestId("contestant-node-0").screenshot({ path: test.info().outputPath("6-manual-slot.png") });
  await page.getByTestId(`contestant-node-${AUTO_SLOT}`).evaluate((el) => el.scrollIntoView({ block: "center" }));
  await page.getByTestId(`contestant-node-${AUTO_SLOT}`).screenshot({ path: test.info().outputPath("6-auto-slot.png") });
});

test("§5-9 1440 창에서 [초안 목록] → 목록 전체가 화면 안 · 줄마다 [열기] 보임", async ({ page }) => {
  await seedDraft("e2eDraft1");
  // 긴 제목 초안 — 대표 실측(2026-11-13)의 실제 초안처럼 제목이 길면 목록 칸이 제목 길이만큼 늘어난다.
  const LONG = "K-pop 아이돌 VS 무대 디자인 — 2026 겨울 런칭 기념 무대 의상·조명·세트까지 함께 보는 아주 긴 제목의 시험 초안";
  for (const [id, title] of [["e2eDraft2", LONG], ["e2eDraft3", "세 번째 초안"]] as const) {
    await db().collection("tournamentDrafts").doc(id).set({
      hostUid: ADMIN_UID, schemaVersion: 1, step: 1, title, category: "KPOP", description: "", keywords: [],
      campaignSlug: "", deadlineMs: Date.now() + 86_400_000, contestants: [],
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  }
  await openSeededDraft(page);
  await page.getByTestId("draft-back-to-list").click();
  const menu = page.getByTestId("draft-menu");
  await expect(page.getByTestId("draft-menu-row")).toHaveCount(3);
  const vw = page.viewportSize()!.width;
  const box = (await menu.boundingBox())!;
  test.info().annotations.push({ type: "초안 목록 상자", description: `x ${box.x} ~ ${box.x + box.width} (창 ${vw})` });
  await page.screenshot({ path: test.info().outputPath("9-draft-menu.png") });
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(vw);
  for (const open of await page.getByTestId("draft-menu-open").all()) {
    await expect(open).toBeInViewport({ ratio: 1 });
  }
});
