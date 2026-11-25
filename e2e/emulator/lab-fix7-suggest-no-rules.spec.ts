/**
 * LAB-FIX-7 — [AI에게 제안 받기]가 "엔트리 조건" 칸을 채우지 않는다 (에뮬레이터 · `?lang=ko` · 관리자 로그인 · 폭 1440).
 *
 * 지시서 §10 세 길:
 *   ① 제목 · 설명만 적고 [AI에게 제안 받기] → 엔트리 조건 칸이 비어 있다
 *   ② 엔트리 조건을 미리 적고 [AI에게 제안 받기] → 그 글이 한 글자도 바뀌지 않는다
 *   ③ 엔트리 조건을 손으로 적은 대회는 지금처럼 명단을 채운 뒤 조건 검사가 돈다
 * 제안 콜러블은 일부러 rules 를 담아 돌려준다 — 옛 서버(배포 전)가 조건을 보내도 화면이 쓰지 않는지 본다.
 */
import { expect, test, type Page } from "@playwright/test";
import { collectConsoleErrors, db, dismissConsent, expectNoConsoleErrors, resetEmulators, seedCategories, signInAsAdmin, stubAiCallables } from "./helpers";

const TITLE = "올해의 노래 시험";
const OLD_SERVER_RULES = "2026년에 발매한 곡만";
const HAND_RULES = "  어린이 팀은 뺀다.\n한 곡은 한 번만 넣는다. ";
const names = Array.from({ length: 48 }, (_, i) => `Song${String(i + 1).padStart(2, "0")}`);

test.beforeEach(async () => {
  await resetEmulators();
  await seedCategories();
});

async function stubLab(page: Page) {
  const calls = { suggest: 0, rules: [] as Record<string, unknown>[] };
  await stubAiCallables(page);
  await page.route(/\/aiSuggestBrief$/, async (route) => {
    calls.suggest += 1;
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ result: { entryUnit: "other", entry: "노래 제목", extra: "artist", rules: OLD_SERVER_RULES } }),
    });
  });
  await page.route(/\/aiFillContestants$/, (route) =>
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ result: { contestants: names.map((name) => ({ name, nationality: "KR", affiliation: "", imageSearchKeyword: "" })) } }),
    }),
  );
  await page.route(/\/autoSourceImages$/, async (route) => {
    const slots = (JSON.parse(route.request().postData() ?? "{}") as { data: { slots: { slot: number }[] } }).data.slots;
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ result: { ok: true, results: slots.map((s) => ({ slot: s.slot, ok: false, reason: "not-found" })) } }),
    });
  });
  await page.route(/\/checkEntryRules$/, async (route) => {
    calls.rules.push((JSON.parse(route.request().postData() ?? "{}") as { data: Record<string, unknown> }).data);
    await route.fulfill({ contentType: "application/json", body: JSON.stringify({ result: { flags: [] } }) });
  });
  return calls;
}

async function openLabStep1(page: Page) {
  await page.goto("/admin/lab?lang=ko");
  await signInAsAdmin(page);
  await dismissConsent(page);
  await page.getByLabel("Tournament 제목").fill(TITLE);
  await page.getByLabel("카테고리").selectOption("KPOP");
  await page.getByTestId("lab-description").fill("2026년에 발매한 K-pop 곡 가운데 가장 좋았던 노래");
}

const draftDoc = async () => {
  const snap = await db().collection("tournamentDrafts").where("title", "==", TITLE).get();
  return snap.empty ? undefined : snap.docs[0].data();
};

test("① 제목 · 설명만 적고 제안 받기 → 엔트리 조건 칸은 비어 있다", async ({ page }) => {
  const errors = collectConsoleErrors(page);
  const calls = await stubLab(page);
  await openLabStep1(page);
  await expect(page.getByTestId("lab-brief-rules")).toHaveValue("");

  await page.getByTestId("lab-brief-suggest").click();
  await expect(page.getByTestId("lab-brief-entry")).toHaveValue("노래 제목");
  await expect(page.getByTestId("lab-brief-extra")).toHaveValue("artist");
  await expect(page.getByTestId("lab-entry-unit-other")).toHaveAttribute("aria-checked", "true");
  await expect(page.getByTestId("lab-brief-rules")).toHaveValue("");
  expect(calls.suggest).toBe(1);
  await page.getByTestId("lab-ai-brief").screenshot({ path: "test-results-emulator/lab-fix7-1-suggest-empty-rules.png" });
  await page.screenshot({ path: "test-results-emulator/lab-fix7-1-suggest-empty-rules-full.png", fullPage: true });

  // 자동 저장된 초안에도 조건이 없다
  await expect.poll(async () => (await draftDoc())?.aiBrief, { timeout: 20_000 }).toEqual({ entry: "노래 제목", extra: "artist", rules: "" });
  await expectNoConsoleErrors(errors);
});

test("② 엔트리 조건을 미리 적고 제안 받기 → 한 글자도 바뀌지 않는다", async ({ page }) => {
  const errors = collectConsoleErrors(page);
  const calls = await stubLab(page);
  await openLabStep1(page);
  await page.getByTestId("lab-brief-rules").fill(HAND_RULES);
  await expect(page.getByTestId("lab-brief-rules")).toHaveValue(HAND_RULES);

  await page.getByTestId("lab-brief-suggest").click();
  await expect(page.getByTestId("lab-brief-entry")).toHaveValue("노래 제목");
  await expect(page.getByTestId("lab-brief-rules")).toHaveValue(HAND_RULES);
  expect(calls.suggest).toBe(1);
  await page.getByTestId("lab-ai-brief").screenshot({ path: "test-results-emulator/lab-fix7-2-suggest-keeps-rules.png" });
  await expectNoConsoleErrors(errors);
});

test("③ 손으로 적은 엔트리 조건 → 명단을 채운 뒤 조건 검사가 돈다", async ({ page }) => {
  test.setTimeout(240_000);
  const errors = collectConsoleErrors(page);
  const calls = await stubLab(page);
  await openLabStep1(page);
  await page.getByTestId("lab-brief-suggest").click();
  await expect(page.getByTestId("lab-brief-entry")).toHaveValue("노래 제목");
  await page.getByTestId("lab-brief-rules").fill(HAND_RULES);
  await page.getByLabel("키워드 추가").fill("노래");
  await page.getByLabel("키워드 추가").press("Enter");
  await page.getByTestId("lab-next-button").click();
  await expect(page.getByTestId("contestant-grid")).toBeVisible();

  await page.getByTestId("lab-generate-images").click();
  await expect(page.getByTestId("lab-rules-status")).toHaveText("조건을 확인할 칸 0개를 표시했습니다.", { timeout: 120_000 });
  expect(calls.rules).toHaveLength(1);
  expect(calls.rules[0]).toMatchObject({ entryUnit: "other", aiBrief: { entry: "노래 제목" } });
  expect(String((calls.rules[0].aiBrief as { rules: string }).rules).trim()).toBe(HAND_RULES.trim());
  expect((calls.rules[0].entries as unknown[]).length).toBe(48);
  await page.screenshot({ path: "test-results-emulator/lab-fix7-3-hand-rules-checked.png" });
  await expectNoConsoleErrors(errors);
});
