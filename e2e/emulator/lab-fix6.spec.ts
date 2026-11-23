/**
 * LAB-FIX-6 — 편집기 첫 단계 정리 · "덧붙이는 정보" 목록 (에뮬레이터 · 관리자 로그인 · AI 호출 없음).
 *
 *   ① 설명이 비면 [다음 →]이 꺼지고 이유 글이 보인다 · 적으면 켜진다
 *   ② 엔트리 단위(개인 · 팀 · 그 외)에 따라 "덧붙이는 정보" 기본값이 바뀐다 · 목록 7개
 *   ③ "가수"를 고르면 STEP 2 엔트리 칸 둘째 줄 자리 글자가 "가수"
 *   ④ "엔트리 조건" 이름 · 크림슨 "선택" · 설명 한 줄이 KO · EN · ES 로 보인다(1440 캡처 — 대표 눈검사)
 *   ⑤ 새로고침 뒤에도 고른 값이 남는다
 */
import { expect, test, type Page } from "@playwright/test";
import { collectConsoleErrors, db, dismissConsent, expectNoConsoleErrors, resetEmulators, seedCategories, signInAsAdmin } from "./helpers";

const TITLE = "LAB-FIX-6 시험 대회";
/** 대표 눈검사용 캡처(PR 에 붙인다) — outputDir 는 실행마다 지워지므로 outputs 아래에 둔다. */
const SHOTS = "outputs/lab-fix6-evidence";
const CRIMSON = "rgb(215, 6, 58)"; // --color-crimson #D7063A

test.use({ viewport: { width: 1440, height: 1100 } });

test.beforeEach(async () => {
  await resetEmulators();
  await seedCategories();
});

async function openLab(page: Page, lang: "ko" | "en" | "es" = "ko") {
  await page.goto(`/admin/lab?lang=${lang}`);
  await signInAsAdmin(page);
  await dismissConsent(page);
  await expect(page.getByTestId("lab-ai-brief")).toBeVisible();
}

async function fillRequired(page: Page) {
  await page.getByLabel("Tournament 제목").fill(TITLE);
  await page.getByLabel("카테고리").selectOption("KPOP");
  await page.getByLabel("키워드 추가").fill("노래");
  await page.getByLabel("키워드 추가").press("Enter");
}

const extra = (page: Page) => page.getByTestId("lab-brief-extra");

test("① 설명 빈칸이면 [다음 →] 꺼짐 · 이유 글 · ② 단위별 기본값 · ③ 가수 → STEP 2 자리 글자 · ⑤ 새로고침 뒤에도", async ({ page }) => {
  test.setTimeout(180_000);
  const errors = collectConsoleErrors(page);
  await openLab(page);
  await fillRequired(page);

  // ① 설명 — 필수 표시 · 비면 꺼짐 + 이유 글
  const next = page.getByTestId("lab-next-button");
  await expect(page.getByTestId("lab-field-tag-required")).toHaveText("· 필수");
  await expect(next).toBeDisabled();
  await expect(page.getByTestId("lab-description-missing")).toBeVisible();
  await page.getByTestId("lab-description").locator("..").screenshot({ path: `${SHOTS}/description-missing-ko.png` });
  await page.getByTestId("lab-description").fill("   ");
  await expect(next).toBeDisabled();
  await page.getByTestId("lab-description").fill("2026년에 사랑받은 노래");
  await expect(page.getByTestId("lab-description-missing")).toHaveCount(0);
  await expect(next).toBeEnabled();

  // ② 단위별 기본값 · 목록 7개(한국어)
  await expect(page.getByTestId("lab-entry-unit-individual")).toHaveAttribute("aria-checked", "true");
  await expect(extra(page)).toHaveValue("team");
  await page.getByTestId("lab-entry-unit-group").click();
  await expect(extra(page)).toHaveValue("blank");
  await page.getByTestId("lab-entry-unit-individual").click();
  await expect(extra(page)).toHaveValue("team");
  await page.getByTestId("lab-entry-unit-other").click();
  await expect(extra(page)).toHaveValue("blank");
  await expect(extra(page).locator("option")).toHaveText(["소속 (팀)", "가수", "배우", "작품 제목", "회사", "채널", "비워 두기"]);
  await page.getByTestId("lab-ai-brief").screenshot({ path: `${SHOTS}/brief-other-ko.png` });

  // ③ 가수 → STEP 2 둘째 줄 자리 글자
  await extra(page).selectOption("artist");
  await page.getByTestId("lab-brief-entry").fill("노래 제목");
  await next.click();
  await expect(page.getByTestId("contestant-grid")).toBeVisible();
  await expect(page.getByTestId("contestant-node-0").locator('input[placeholder="가수"]')).toHaveCount(1);
  await page.getByTestId("contestant-node-0").screenshot({ path: `${SHOTS}/step2-slot-artist-ko.png` });
  await expect.poll(async () => {
    const snap = await db().collection("tournamentDrafts").where("title", "==", TITLE).get();
    return snap.empty ? undefined : snap.docs[0].data().aiBrief;
  }, { timeout: 20_000 }).toEqual({ entry: "노래 제목", extra: "artist", rules: "" });

  // ⑤ 새로고침 — 초안을 다시 열면 고른 값 그대로
  await page.reload();
  await signInAsAdmin(page);
  await page.getByTestId("draft-row").filter({ hasText: TITLE }).getByTestId("draft-open").click();
  await expect(page.getByTestId("contestant-node-0").locator('input[placeholder="가수"]')).toHaveCount(1);
  await page.getByTestId("lab-back-to-step1").click();
  await expect(extra(page)).toHaveValue("artist");
  await expect(page.getByTestId("lab-entry-unit-other")).toHaveAttribute("aria-checked", "true");

  // 기본값(비워 두기)으로 돌리면 빈 글로 저장 · 자리 글자는 "소속"
  await extra(page).selectOption("blank");
  await next.click();
  await expect(page.getByTestId("contestant-node-0").locator('input[placeholder="소속"]')).toHaveCount(1);
  await expect.poll(async () => {
    const snap = await db().collection("tournamentDrafts").where("title", "==", TITLE).get();
    return snap.docs[0]?.data().aiBrief;
  }, { timeout: 20_000 }).toEqual({ entry: "노래 제목", extra: "", rules: "" });
  await expectNoConsoleErrors(errors);
});

const COPY = {
  ko: { label: "엔트리 조건", optional: "· 선택", hint: "AI가 명단을 채운 뒤 조건에 맞는지 한 번 더 확인합니다.", required: "· 필수", first: "소속 (팀)", last: "비워 두기" },
  en: {
    label: "Entry rules",
    optional: "· Optional",
    hint: "The AI checks the entries against these rules once more after filling.",
    required: "· Required",
    first: "Affiliation (team)",
    last: "Leave blank",
  },
  es: {
    label: "Criterios de entrada",
    optional: "· Opcional",
    hint: "La IA vuelve a comprobar las entradas con estos criterios después de completarlas.",
    required: "· Obligatorio",
    first: "Afiliación (equipo)",
    last: "Dejar vacío",
  },
} as const;

for (const lang of ["ko", "en", "es"] as const) {
  test(`④ 엔트리 조건 · 크림슨 선택 · 설명 한 줄 · 목록 — ${lang} (1440 캡처)`, async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await openLab(page, lang);
    const c = COPY[lang];
    const brief = page.getByTestId("lab-ai-brief");
    await expect(brief).toContainText(c.label);
    const rulesTag = brief.getByTestId("lab-field-tag-optional");
    await expect(rulesTag).toHaveText(c.optional);
    await expect(rulesTag).toHaveCSS("color", CRIMSON);
    // 같은 화면의 다른 "선택"(캠페인 이름표)도 같은 크림슨
    const tags = page.getByTestId("lab-field-tag-optional");
    await expect(tags).toHaveCount(2);
    await expect(tags.nth(0)).toHaveCSS("color", CRIMSON);
    await expect(page.getByTestId("lab-brief-rules-hint")).toHaveText(c.hint);
    await expect(page.getByTestId("lab-field-tag-required")).toHaveText(c.required);
    await expect(extra(page).locator("option").first()).toHaveText(c.first);
    await expect(extra(page).locator("option").last()).toHaveText(c.last);
    await expect(extra(page).locator("option")).toHaveCount(7);
    // 첫 단계 내용 폭(880) — 1440 에서 넓어졌다
    const width = await page.locator("main").first().evaluate((el) => el.getBoundingClientRect().width);
    expect(width).toBeGreaterThan(800);
    // 동의 바(화면 아래 고정)가 캡처 가운데를 덮지 않게 [필수만]으로 닫는다.
    const reject = page.getByRole("button", { name: /Reject non-essential/ });
    if (await reject.isVisible()) await reject.click();
    await expect(reject).toBeHidden();
    await page.screenshot({ path: `${SHOTS}/step1-after-${lang}-1440.png`, fullPage: true });
    await expectNoConsoleErrors(errors);
  });
}
