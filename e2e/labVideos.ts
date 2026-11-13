/**
 * The Lab E2E 공용 — 칸에 유튜브 영상을 붙인다 (THUMB-1).
 *
 * 대표 매치(원장 D-35)는 **영상이 있는 칸**에서만 고를 수 있고, 둘 다 골라야 게시된다.
 * 그래서 게시까지 가는 spec 은 칸 몇 개에 영상이 있어야 한다.
 *
 * 검수기(LAB-EV-1)는 **빈 칸**에만 영상을 넣는다. 채우기는 48칸을 통째로 다시 쓰므로
 * 순서가 정해진다: 48칸 채우기 → 앞의 N칸을 ✕로 비우기 → 검수기로 영상 주입(추출 콜러블
 * 스텁이 이름까지 채운다) → 다시 48/48. 콜러블은 전부 스텁 — 실제 쿼터를 태우지 않는다.
 * 썸네일 그림은 진짜 i.ytimg 주소다(공개 영상).
 *
 * LAB-FIX-3 추가분(원장 D-90) — 검수기는 **영상 대회**에서만 보인다. 그래서 48칸 채우기는
 * [🖼 이미지 생성]이 아니라 [🎬 동영상 생성]으로 한다: 채우기(스텁) → 검색 견적 창(스텁 · 드라이런)
 * → [취소]. 영상 검색은 돌지 않는다(`fillAsVideoTournament`).
 */
import { expect, type Page } from "@playwright/test";

/** 공개 영상 — 썸네일이 늘 있는 것. */
export const E2E_VIDEOS = [
  { id: "9bZkp7q19f0", name: "E2E Video A" },
  { id: "dQw4w9WgXcQ", name: "E2E Video B" },
  { id: "kJQP7kiw5Fk", name: "E2E Video C" },
] as const;

/** `LinkVerdict`(lib/embed/verdict.ts) 모양 — 통과. */
function verdict(videoId: string) {
  return {
    videoId,
    exists: true,
    embeddable: true,
    regionBlockedIn: [],
    regionAllowedOnly: [],
    ageRestricted: false,
    isLive: false,
    durationSec: 200,
    title: `E2E ${videoId}`,
    channelTitle: "E2E channel",
    thumbnailUrl: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
    status: "pass",
    reasons: [],
  };
}

/**
 * [🎬 동영상 생성]으로 48칸을 이름만 채운다(영상 대회로 잠금 · D-90). 채우기 콜러블 스텁은 부르는 쪽이 둔다.
 * 검색 견적(autoSourceVideos 드라이런)은 여기서 스텁하고, 견적 창은 [취소]한다.
 */
export async function fillAsVideoTournament(page: Page): Promise<void> {
  await page.route("**/autoSourceVideos*", (route) =>
    route.fulfill({
      status: 200,
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
  await page.getByTestId("lab-generate-videos").click();
  const dialog = page.getByTestId("auto-source-confirm");
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "취소" }).click();
  await expect(dialog).toHaveCount(0);
}

/**
 * 칸은 비운 채 영상 대회로만 잠근다(D-90) — 채우기 스텁이 빈 명단을 주면 [동영상 생성]은 종류만 정하고
 * "검색할 칸 없음"으로 멈춘다. 빈 칸에서 검수기를 시험하는 spec 용.
 */
export async function lockAsVideoTournament(page: Page): Promise<void> {
  await page.route("**/aiFillContestants*", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ result: { contestants: [] } }) }),
  );
  await page.getByTestId("lab-generate-videos").click();
  await expect(page.getByTestId("lab-generate-images")).toBeDisabled();
  await page.unroute("**/aiFillContestants*");
}

/** 검수(validate)·인물 추출(extract) 콜러블 스텁 — 앞의 `count` 개 영상. */
export async function stubVideoInspector(page: Page, count: number): Promise<void> {
  const videos = E2E_VIDEOS.slice(0, count);
  await page.route("**/validateYouTubeLinks*", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ result: { verdicts: videos.map((v) => verdict(v.id)), apiCalls: 1 } }),
    }),
  );
  await page.route("**/extractContestantsFromVideos*", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        result: {
          extractions: videos.map((v) => ({
            videoId: v.id,
            name: v.name,
            affiliation: "",
            nationality: "KR",
            confident: true,
          })),
        },
      }),
    }),
  );
}

/**
 * 48칸이 채워진 STEP 2 에서 앞의 `count` 칸을 비우고 영상을 붙인다(칸 0..count-1).
 * 부르기 전에 `stubVideoInspector(page, count)`.
 */
export async function attachVideosToFirstSlots(page: Page, count: number): Promise<void> {
  for (let i = 0; i < count; i++) {
    await page.getByTestId(`contestant-clear-${i}`).click();
  }
  const tools = page.getByTestId("lab-manual-tools");
  if (!(await tools.isVisible())) await page.getByTestId("lab-manual-tools-toggle").click();
  await page.getByTestId("lab-open-embed-inspector").click();
  await page
    .getByTestId("embed-inspector-input")
    .fill(E2E_VIDEOS.slice(0, count).map((v) => `https://youtu.be/${v.id}`).join("\n"));
  await page.getByTestId("embed-inspector-validate").click();
  // 줄의 data-status 는 보지 않는다 — 주입이 끝나면 그 칸이 더는 빈 칸이 아니라서
  // 검수기 줄이 "pending"으로 되돌아간다. 확인할 것은 칸에 영상이 들어갔는지다.
  for (let i = 0; i < count; i++) {
    await expect(page.getByTestId(`contestant-tune-${i}`)).toBeAttached();
  }
  await page.getByRole("button", { name: "닫기" }).click();
  for (let i = 0; i < count; i++) {
    await expect(page.getByTestId(`contestant-tune-${i}`)).toBeVisible();
  }
}
