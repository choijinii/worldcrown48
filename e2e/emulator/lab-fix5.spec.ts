/**
 * LAB-FIX-5 — 이름 표기 · 조건 다시 검사 · 사전 점검 후속 (에뮬레이터 · 관리자 로그인 · AI 응답은 가짜).
 *
 * 지시서 §11 E2E:
 *   ① 고르는 조건이 있는 초안에서 [이미지 생성] → 가짜 검사 응답이 가리킨 칸에 "조건 확인 필요"와 사유가 보인다
 *      · 요약 글 "조건을 확인할 칸 1개를 표시했습니다."(5절 승인 문구)
 *   ② 새로고침 뒤에도 표시 · 이미지 못 찾은 칸(§3-8)이 남는다
 *   ③ 고르는 조건이 빈 초안에서는 검사 호출이 없다
 *   ④ ES 화면에서 예시 글이 칸 안에 다 보인다(§3-4)
 *   ⑤ 관리자 화면 문서에 번역 막기 표시가 있다(§3-6)
 */
import * as admin from "firebase-admin";
import { expect, test, type Page } from "@playwright/test";
import { collectConsoleErrors, db, dismissConsent, expectNoConsoleErrors, resetEmulators, seedCategories, seedDraft, signInAsAdmin, stubAiCallables } from "./helpers";

const FLAGGED = 1;
const names = Array.from({ length: 48 }, (_, i) => (i === 0 ? "Lisa Eldridge" : i === FLAGGED ? "James Charles" : `Creator${String(i + 1).padStart(2, "0")}`));
const RULES = "2026년에 활동한 여성만. 한 사람은 한 번만 넣는다.";

test.beforeEach(async () => {
  await resetEmulators();
  await seedCategories();
});

async function stubLab(page: Page) {
  const rulesRequests: Record<string, unknown>[] = [];
  await stubAiCallables(page);
  await page.route(/\/aiFillContestants$/, (route) =>
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ result: { contestants: names.map((name) => ({ name, nationality: "US", affiliation: "", imageSearchKeyword: "" })) } }),
    }),
  );
  // 이미지 찾기 — 모두 못 찾음(바깥 검색을 부르지 않는다). 못 찾은 칸 저장(§3-8)도 함께 본다.
  await page.route(/\/autoSourceImages$/, async (route) => {
    const slots = (JSON.parse(route.request().postData() ?? "{}") as { data: { slots: { slot: number }[] } }).data.slots;
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ result: { ok: true, results: slots.map((s) => ({ slot: s.slot, ok: false, reason: "not-found" })) } }),
    });
  });
  await page.route(/\/checkEntryRules$/, async (route) => {
    rulesRequests.push((JSON.parse(route.request().postData() ?? "{}") as { data: Record<string, unknown> }).data);
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ result: { flags: [{ slot: FLAGGED, reason: "남성으로 알려진 크리에이터" }] } }),
    });
  });
  return rulesRequests;
}

async function seedEmptyImageDraft(id: string, rules: string) {
  await seedDraft(id, "image");
  await db()
    .collection("tournamentDrafts")
    .doc(id)
    .update({
      contestants: [],
      mediaKind: admin.firestore.FieldValue.delete(),
      aiBrief: { entry: "여성 뷰티 크리에이터 (활동명)", extra: "", rules },
    });
}

async function openLabDraft(page: Page) {
  await page.goto("/admin/lab?lang=ko");
  await signInAsAdmin(page);
  await dismissConsent(page);
  await expect(page.getByTestId("draft-picker")).toBeVisible();
  await page.getByTestId("draft-open").first().click();
  await expect(page.getByTestId("contestant-grid")).toBeVisible();
}

const node = (page: Page, i: number) => page.getByTestId(`contestant-node-${i}`);

test("① · ② 조건이 있는 초안 [이미지 생성] → 가리킨 칸에 표시 · 사유 → 새로고침 뒤에도 남음(이미지 못 찾은 칸도)", async ({ page }) => {
  test.setTimeout(240_000);
  await seedEmptyImageDraft("lf5Rules", RULES);
  const errors = collectConsoleErrors(page);
  const requests = await stubLab(page);
  await openLabDraft(page);

  await page.getByTestId("lab-generate-images").click();
  await expect(node(page, FLAGGED)).toHaveAttribute("data-rule-flag", "true", { timeout: 120_000 });
  await expect(node(page, FLAGGED)).toHaveAttribute("data-rule-reason", "남성으로 알려진 크리에이터");
  await expect(node(page, 0)).not.toHaveAttribute("data-rule-flag", /.*/);
  await expect(page.getByTestId(`contestant-rule-badge-${FLAGGED}`)).toHaveText("조건 확인 필요");
  await expect(page.getByTestId(`contestant-rule-reason-${FLAGGED}`)).toHaveText("남성으로 알려진 크리에이터");
  await expect(page.getByTestId("contestant-rule-badge-0")).toHaveCount(0);
  await expect(page.getByTestId("lab-rules-status")).toHaveText("조건을 확인할 칸 1개를 표시했습니다.");
  await node(page, FLAGGED).screenshot({ path: "test-results-emulator/lab-fix5-rule-badge.png" });
  expect(requests).toHaveLength(1);
  expect(requests[0]).toMatchObject({ lang: "ko", entryUnit: "individual", aiBrief: { rules: RULES } });
  expect((requests[0].entries as unknown[]).length).toBe(48);
  await expect(page.getByTestId(`slot-image-notfound-5`)).toBeVisible({ timeout: 120_000 });

  // 자동 저장이 초안에 표시를 남길 때까지 — 그 뒤 새로고침
  await expect
    .poll(async () => ((await db().collection("tournamentDrafts").doc("lf5Rules").get()).data()?.ruleFlags ?? []).length, { timeout: 30_000 })
    .toBe(1);
  await expect
    .poll(async () => ((await db().collection("tournamentDrafts").doc("lf5Rules").get()).data()?.imageNotFound ?? []).length, { timeout: 30_000 })
    .toBe(48);
  await page.reload();
  await expect(page.getByTestId("draft-picker")).toBeVisible({ timeout: 30_000 });
  await page.getByTestId("draft-open").first().click();
  await expect(node(page, FLAGGED)).toHaveAttribute("data-rule-flag", "true");
  await expect(node(page, FLAGGED)).toHaveAttribute("data-rule-reason", "남성으로 알려진 크리에이터");
  await expect(page.getByTestId(`contestant-rule-badge-${FLAGGED}`)).toHaveText("조건 확인 필요");
  await expect(page.getByTestId(`contestant-rule-reason-${FLAGGED}`)).toBeVisible();
  await expect(page.getByTestId(`slot-image-notfound-5`)).toBeVisible();

  // 운영자가 이름을 고치면 그 칸 표시는 사라진다
  await page.getByLabel(`Contestant ${FLAGGED + 1} 이름`, { exact: true }).fill("Jaclyn Hill");
  await expect(node(page, FLAGGED)).not.toHaveAttribute("data-rule-flag", /.*/);
  await expect(page.getByTestId(`contestant-rule-badge-${FLAGGED}`)).toHaveCount(0);
  await expectNoConsoleErrors(errors);
});

test("③ 고르는 조건이 빈 초안에서는 검사 호출이 없다", async ({ page }) => {
  test.setTimeout(240_000);
  await seedEmptyImageDraft("lf5NoRules", "");
  const requests = await stubLab(page);
  await openLabDraft(page);
  await page.getByTestId("lab-generate-images").click();
  await expect(page.getByTestId(`slot-image-notfound-5`)).toBeVisible({ timeout: 120_000 });
  await page.waitForTimeout(1500);
  expect(requests).toHaveLength(0);
  await expect(page.locator("[data-rule-flag]")).toHaveCount(0);
  await expect(page.getByTestId("lab-rules-status")).toHaveCount(0);
});

test("④ ES 1440 — '엔트리는 어떤 것인가?' 예시 글이 칸 안에 다 보인다 · ⑤ 관리자 화면 번역 막기 표시", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/admin/lab?lang=es");
  await signInAsAdmin(page);
  await dismissConsent(page);
  const entry = page.getByTestId("lab-brief-entry");
  await expect(entry).toBeVisible({ timeout: 30_000 });
  await expect(entry).toHaveAttribute("placeholder", "p. ej.: el crew que baila · título de la canción · personaje del drama");
  // 칸이 예시 글보다 작으면 가려진다 — 칸 안 글자 높이 ≤ 칸 높이 · 가로로 넘치지 않음
  const fit = await entry.evaluate((el: HTMLTextAreaElement) => ({ h: el.scrollHeight <= el.clientHeight + 1, w: el.scrollWidth <= el.clientWidth + 1 }));
  expect(fit).toEqual({ h: true, w: true });
  await page.getByTestId("lab-ai-brief").screenshot({ path: "test-results-emulator/lab-fix5-es-brief-1440.png" });

  // ⑤ 번역 막기 — 페이지 머리 google notranslate + 관리자 묶음 translate="no"
  await expect(page.locator('meta[name="google"]')).toHaveAttribute("content", "notranslate");
  await expect(page.getByTestId("admin-root")).toHaveAttribute("translate", "no");
  await expect(page.getByTestId("admin-root")).toHaveClass(/notranslate/);
});
