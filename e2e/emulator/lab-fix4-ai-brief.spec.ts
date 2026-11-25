/**
 * LAB-FIX-4 — "AI에게 알려 줄 내용" 묶음 · 칸 비우기 · 생성 전 붙여넣기 (에뮬레이터 · `?lang=ko` · 관리자 로그인).
 *
 * 지시서 §11 E2E ①~⑤를 걷는다:
 *   ① 새 초안에서 생성 버튼 없이 [링크 직접 붙여넣기] → 붙인 뒤 영상 대회로 정해짐(묶음 · 대회 제목이 추출 요청에 실림)
 *   ② 칸 ✕ → 이름과 영상이 함께 사라짐 · 새로고침 뒤에도 빔
 *   ③ [모두 비우기] → 확인 창 [취소]는 그대로 · [비우기]는 전부 빔 · 새로고침 뒤에도 빔(묶음 · 종류는 그대로)
 *   ④ "덧붙이는 정보"에 "가수" → 칸의 자리 표시 글자가 "가수"
 *   ⑤ [AI에게 제안 받기]가 엔트리 · 덧붙이는 정보와 엔트리 단위를 채움(엔트리 조건은 채우지 않는다 — LAB-FIX-7)
 * 유튜브 검사 · 제목 읽기 · 제안 콜러블은 가짜 응답(바깥 사이트 · AI 를 부르지 않는다). 영상 제목 · 채널은 §7 정답 자료
 * (functions/src/__tests__/fixtures/lab-fix4-crews.json — oEmbed 로 받은 실제 문자열)를 쓴다.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test, type Page } from "@playwright/test";
import {
  collectConsoleErrors,
  db,
  dismissConsent,
  resetEmulators,
  seedCategories,
  signInAsAdmin,
  stubAiCallables,
  stubYouTubeImages,
} from "./helpers";

interface CrewRow {
  videoId: string;
  title: string;
  channelTitle: string;
  expectedName: string;
  expectedCountry: string;
}
const crews = JSON.parse(
  readFileSync(join(__dirname, "..", "..", "functions", "src", "__tests__", "fixtures", "lab-fix4-crews.json"), "utf8"),
) as { brief: { entry: string; extra: string; rules: string }; tournamentTitle: string; items: CrewRow[] };

const TITLE = "올해의 댄스 크루 시험";

test.beforeEach(async () => {
  await resetEmulators();
  await seedCategories();
});

/** 검수 · 제목 읽기 가짜 — 받은 요청을 모은다. 추출은 §7 정답 그대로 돌려준다. */
async function stubPasteCallables(page: Page) {
  const extractRequests: Record<string, unknown>[] = [];
  const byId = new Map(crews.items.map((c) => [c.videoId, c]));
  await page.route(/\/validateYouTubeLinks$/, async (route) => {
    const ids = (JSON.parse(route.request().postData() ?? "{}") as { data: { videoIds: string[] } }).data.videoIds;
    const verdicts = ids.map((videoId) => ({
      videoId, exists: true, embeddable: true, regionBlockedIn: [], regionAllowedOnly: [], ageRestricted: false,
      isLive: false, durationSec: 200, title: byId.get(videoId)?.title ?? "", channelTitle: byId.get(videoId)?.channelTitle ?? "",
      thumbnailUrl: "", status: "pass", reasons: [],
    }));
    await route.fulfill({ contentType: "application/json", body: JSON.stringify({ result: { verdicts, apiCalls: 1 } }) });
  });
  await page.route(/\/extractContestantsFromVideos$/, async (route) => {
    const data = (JSON.parse(route.request().postData() ?? "{}") as { data: Record<string, unknown> & { items: { videoId: string }[] } }).data;
    extractRequests.push(data);
    const extractions = data.items.map((v) => {
      const c = byId.get(v.videoId)!;
      return { videoId: v.videoId, name: c.expectedName, affiliation: "", nationality: c.expectedCountry, confident: true };
    });
    await route.fulfill({ contentType: "application/json", body: JSON.stringify({ result: { extractions } }) });
  });
  return extractRequests;
}

async function openLab(page: Page) {
  await page.goto("/admin/lab?lang=ko");
  await signInAsAdmin(page);
  await dismissConsent(page);
}

async function fillStep1(page: Page, brief: { entry?: string; extra?: string; rules?: string }, unit: "group" | "other" = "group") {
  await page.getByLabel("Tournament 제목").fill(TITLE);
  await page.getByLabel("카테고리").selectOption("KPOP");
  await page.getByTestId(`lab-entry-unit-${unit}`).click();
  if (brief.entry) await page.getByTestId("lab-brief-entry").fill(brief.entry);
  // LAB-FIX-6 3-4 — 덧붙이는 정보는 목록(키)에서 고른다.
  if (brief.extra) await page.getByTestId("lab-brief-extra").selectOption(brief.extra);
  if (brief.rules) await page.getByTestId("lab-brief-rules").fill(brief.rules);
  await page.getByLabel("키워드 추가").fill("댄스");
  await page.getByLabel("키워드 추가").press("Enter");
  // LAB-FIX-6 3-2 — 설명은 필수.
  await page.getByTestId("lab-description").fill("K-pop 곡에 맞춰 춤춘 댄스 크루");
}

async function reopenDraft(page: Page) {
  await page.reload();
  await signInAsAdmin(page);
  await page.getByTestId("draft-row").filter({ hasText: TITLE }).getByTestId("draft-open").click();
  await expect(page.getByTestId("contestant-grid")).toBeVisible();
}

const draftDoc = async () => {
  const snap = await db().collection("tournamentDrafts").where("title", "==", TITLE).get();
  return snap.empty ? undefined : snap.docs[0].data();
};
const nameInput = (page: Page, i: number) => page.getByTestId(`contestant-node-${i}`).locator("input").first();

test("①②③ 생성 전 붙여넣기 → 영상 대회 · ✕ 칸 통째로 · [모두 비우기]", async ({ page }) => {
  test.setTimeout(240_000);
  const errors = collectConsoleErrors(page);
  await stubAiCallables(page);
  await stubYouTubeImages(page);
  const extractRequests = await stubPasteCallables(page);
  await openLab(page);
  await fillStep1(page, crews.brief);
  await page.getByTestId("lab-next-button").click();
  await expect(page.getByTestId("contestant-grid")).toBeVisible();

  // ① 생성 버튼을 누르지 않고 [링크 직접 붙여넣기]
  await page.getByTestId("lab-manual-tools-toggle").click();
  await expect(page.getByTestId("lab-open-embed-inspector")).toBeVisible();
  await page.getByTestId("lab-open-embed-inspector").click();
  await expect(page.getByTestId("embed-inspector")).toContainText(
    "줄당 링크 1개. 빈칸에만 순서대로 들어가고, \"AI에게 알려 줄 내용\"에 맞춰 제목에서 엔트리를 읽어 함께 채웁니다.",
  );
  await page.getByTestId("embed-inspector-input").fill(crews.items.map((c) => `https://www.youtube.com/watch?v=${c.videoId}`).join("\n"));
  await page.getByTestId("embed-inspector-validate").click();
  await expect(page.getByTestId("lab-step2-counter")).toContainText("48/48", { timeout: 30_000 });
  await page.keyboard.press("Escape");
  await expect(page.getByTestId("embed-inspector")).toHaveCount(0);

  // 추출 요청에 묶음 · 대회 제목이 실렸다
  expect(extractRequests).toHaveLength(1);
  expect(extractRequests[0]).toMatchObject({
    entryUnit: "group",
    aiBrief: { entry: crews.brief.entry, extra: "", rules: crews.brief.rules },
    tournamentTitle: TITLE,
  });
  // 칸마다 §7 정답 이름 · 국가
  for (const i of [0, 1, 25, 47]) {
    await expect(nameInput(page, i)).toHaveValue(crews.items[i].expectedName);
  }
  // 영상 대회로 정해짐 — [이미지 생성] 꺼짐 · 초안에도 저장
  await expect(page.getByTestId("lab-generate-images")).toBeDisabled();
  await expect(page.getByTestId("lab-generate-images")).toHaveAttribute("title", "이 대회는 영상 대회입니다.");
  await expect.poll(async () => (await draftDoc())?.mediaKind, { timeout: 20_000 }).toBe("video");
  await page.screenshot({ path: test.info().outputPath("1-pasted-before-generate.png") });

  // ② 칸 ✕ → 이름과 영상이 함께 사라짐
  await expect(page.getByTestId("contestant-pick-0")).toHaveAttribute("style", /ytimg\.com/);
  await expect(page.getByTestId("contestant-clear-0")).toHaveAttribute("title", "이 칸 비우기 (영상 · 이미지 포함)");
  await page.getByTestId("contestant-clear-0").click();
  await expect(nameInput(page, 0)).toHaveValue("");
  await expect(page.getByTestId("contestant-pick-0")).not.toHaveAttribute("style", /ytimg\.com/);
  await expect(page.getByTestId("contestant-clear-0")).toHaveCount(0);
  await expect(nameInput(page, 1)).toHaveValue(crews.items[1].expectedName);
  await expect.poll(async () => ((await draftDoc())?.contestants as Record<string, unknown>[])[0]?.videoId ?? null, { timeout: 20_000 }).toBe(null);
  await page.screenshot({ path: test.info().outputPath("2-slot-cleared.png") });
  await reopenDraft(page);
  await expect(nameInput(page, 0)).toHaveValue("");
  await expect(page.getByTestId("contestant-pick-0")).not.toHaveAttribute("style", /ytimg\.com/);
  await expect(nameInput(page, 1)).toHaveValue(crews.items[1].expectedName);

  // ③ [모두 비우기] → [취소]는 그대로 → [비우기]는 전부 빔
  if (!(await page.getByTestId("lab-manual-tools").isVisible())) await page.getByTestId("lab-manual-tools-toggle").click();
  await page.getByTestId("lab-clear-all").click();
  await expect(page.getByTestId("lab-clear-all-dialog")).toContainText(
    "엔트리 칸을 모두 비웁니다. 이름 · 영상 · 이미지가 지워지고 되돌릴 수 없습니다.",
  );
  await page.screenshot({ path: test.info().outputPath("3a-clear-all-dialog.png") });
  await page.getByTestId("lab-clear-all-cancel").click();
  await expect(page.getByTestId("lab-clear-all-dialog")).toHaveCount(0);
  await expect(page.getByTestId("lab-step2-counter")).toContainText("47/48");
  await page.getByTestId("lab-clear-all").click();
  await page.getByTestId("lab-clear-all-confirm").click();
  await expect(page.getByTestId("lab-step2-counter")).toContainText("0/48");
  await expect(nameInput(page, 47)).toHaveValue("");
  await expect(page.getByTestId("lab-clear-all")).toBeDisabled();
  await expect.poll(async () => ((await draftDoc())?.contestants as unknown[] | undefined)?.length, { timeout: 20_000 }).toBe(0);
  await reopenDraft(page);
  await expect(page.getByTestId("lab-step2-counter")).toContainText("0/48");
  // 제목 · 묶음 · 종류는 그대로
  const after = await draftDoc();
  expect(after?.mediaKind).toBe("video");
  expect(after?.aiBrief).toEqual({ entry: crews.brief.entry, extra: "", rules: crews.brief.rules });
  expect(after?.title).toBe(TITLE);
  await page.screenshot({ path: test.info().outputPath("3b-all-cleared.png") });

  // 다시 48개 붙여넣기 → 같은 결과
  if (!(await page.getByTestId("lab-manual-tools").isVisible())) await page.getByTestId("lab-manual-tools-toggle").click();
  await page.getByTestId("lab-open-embed-inspector").click();
  await page.getByTestId("embed-inspector-input").fill(crews.items.map((c) => `https://youtu.be/${c.videoId}`).join("\n"));
  await page.getByTestId("embed-inspector-validate").click();
  await expect(page.getByTestId("lab-step2-counter")).toContainText("48/48", { timeout: 30_000 });
  await page.keyboard.press("Escape");
  await expect(nameInput(page, 0)).toHaveValue(crews.items[0].expectedName);
  expect(errors, errors.join("\n")).toHaveLength(0);
});

test("④ 덧붙이는 정보 = 칸의 자리 표시 글자 · ⑤ [AI에게 제안 받기]", async ({ page }) => {
  test.setTimeout(120_000);
  const errors = collectConsoleErrors(page);
  await stubAiCallables(page);
  let suggestCalls = 0;
  await page.route(/\/aiSuggestBrief$/, async (route) => {
    suggestCalls += 1;
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ result: { entryUnit: "other", entry: "노래 제목", extra: "artist", rules: "2026년에 발매한 곡만" } }),
    });
  });
  await openLab(page);

  // 묶음 화면 — 제목 · 설명 한 줄(승인 문구 1 · 2)
  await expect(page.getByTestId("lab-ai-brief")).toContainText("AI에게 알려 줄 내용");
  await expect(page.getByTestId("lab-ai-brief")).toContainText("AI로 엔트리를 생성할 때 이 내용을 규칙으로 씁니다.");
  await expect(page.getByTestId("lab-entry-unit-other")).toHaveText("그 외 (작품 · 사물 · 배역)");
  // 제목 · 카테고리 전에는 제안을 받을 수 없다
  await expect(page.getByTestId("lab-brief-suggest")).toBeDisabled();
  await page.getByLabel("Tournament 제목").fill(TITLE);
  await page.getByLabel("카테고리").selectOption("KPOP");

  // ⑤ 제안 → 두 줄과 단위가 채워진다(확정은 운영자 — 고칠 수 있다). 엔트리 조건은 비어 있다(LAB-FIX-7 · 가짜 응답에 rules 가 있어도)
  await page.getByTestId("lab-brief-suggest").click();
  await expect(page.getByTestId("lab-brief-entry")).toHaveValue("노래 제목");
  await expect(page.getByTestId("lab-brief-extra")).toHaveValue("artist"); // LAB-FIX-6 — 목록 값(화면 글자 "가수")
  await expect(page.getByTestId("lab-brief-rules")).toHaveValue("");
  await expect(page.getByTestId("lab-entry-unit-other")).toHaveAttribute("aria-checked", "true");
  expect(suggestCalls).toBe(1);
  await page.screenshot({ path: test.info().outputPath("5-suggested.png"), fullPage: true });

  // 글자 수 한도(40)
  await page.getByTestId("lab-brief-entry").fill("가".repeat(60));
  await expect(page.getByTestId("lab-brief-entry")).toHaveValue("가".repeat(40));
  await page.getByTestId("lab-brief-entry").fill("노래 제목");

  // ④ STEP 2 — 둘째 칸 자리 표시 글자 = "가수"
  await page.getByLabel("키워드 추가").fill("노래");
  await page.getByLabel("키워드 추가").press("Enter");
  await page.getByTestId("lab-description").fill("올해의 노래");
  await page.getByTestId("lab-next-button").click();
  await expect(page.getByTestId("contestant-grid")).toBeVisible();
  await expect(page.getByTestId("contestant-node-0").locator('input[placeholder="가수"]')).toHaveCount(1);
  // 묶음 · 그 외 단위가 초안에 저장된다
  await expect.poll(async () => (await draftDoc())?.aiBrief, { timeout: 20_000 }).toEqual({ entry: "노래 제목", extra: "artist", rules: "" });
  expect((await draftDoc())?.entryUnit).toBe("other");
  await page.screenshot({ path: test.info().outputPath("4-extra-placeholder.png") });

  // 덧붙이는 정보를 비우면 다시 "소속"
  await page.getByRole("button", { name: /STEP 1|이전|뒤로/ }).first().click();
  await page.getByTestId("lab-brief-extra").selectOption("blank"); // LAB-FIX-6 — 그 외의 기본값 = 비워 두기
  await page.getByTestId("lab-next-button").click();
  await expect(page.getByTestId("contestant-node-0").locator('input[placeholder="소속"]')).toHaveCount(1);
  expect(errors, errors.join("\n")).toHaveLength(0);
});
