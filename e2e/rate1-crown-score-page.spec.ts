/**
 * RATE-1 (대표 결정 M · 2026-11-28) — 정책 문서 "Crown Score 산정 기준".
 *
 * Policy Hub 왼쪽 목록(넓은 화면) · 문서 전환(좁은 화면)에서 이 페이지로 가고, 3언어 본문에 설명창 글(산식 · 예시 530)과
 * 순위 점수표(10 · 5 · 2 · 0점 · 합계 26)가 보인다. 결정성: 모든 이동에 `?lang=` 고정.
 */
import { expect, test, type Page } from "@playwright/test";

const TITLE = { ko: "Crown Score 산정 기준", en: "How Crown Score works", es: "Cómo se calcula Crown Score" } as const;
const FORMULA = {
  ko: "계산: (순위점수율 × 0.4 + 우승율 × 0.3 + 선택율 × 0.3) × 1000",
  en: "Formula: (Placement score rate × 0.4 + Champion rate × 0.3 + Pick rate × 0.3) × 1,000",
  es: "Fórmula: (Tasa de puntuación por posición × 0,4 + Tasa de campeón × 0,3 + Tasa de elección × 0,3) × 1000",
} as const;

async function seedConsent(page: Page, baseURL: string | undefined) {
  const savedAt = Date.now() - 24 * 60 * 60 * 1000;
  await page.context().addCookies([
    { name: "wc48_consent", value: `1.0.${savedAt}`, url: baseURL ?? "http://localhost:3000" },
  ]);
}

for (const lang of ["ko", "en", "es"] as const) {
  test(`Policy Hub 목록 → Crown Score 산정 기준 (${lang} · 1440)`, async ({ page, baseURL }) => {
    await seedConsent(page, baseURL);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`/policies/privacy?lang=${lang}`);
    const link = page.locator(".policy-nav a[href='/policies/crown-score']");
    await expect(link).toContainText(TITLE[lang]);
    await link.click();
    await expect(page).toHaveURL(/\/policies\/crown-score/);
    const doc = page.locator(`.policy-doc .doc-${lang}`);
    // 마크다운 H1 은 그리지 않고 머리(PolicyHeader)가 프론트매터 제목을 h1 으로 그린다.
    await expect(page.locator("h1.ph-title", { hasText: TITLE[lang] }).first()).toBeVisible();
    await expect(doc).toContainText(FORMULA[lang]);
    await expect(doc).toContainText("530");
    // 순위 점수표 — 머리 1줄 + 4줄, 점수 10 · 5 · 2 · 0.
    const rows = doc.locator("table tbody tr");
    await expect(rows).toHaveCount(4);
    const points = await rows.evaluateAll((trs) => trs.map((tr) => tr.querySelectorAll("td")[2]?.textContent?.match(/\d+/)?.[0]));
    expect(points).toEqual(["10", "5", "2", "0"]);
    await expect(doc).toContainText("26");
    await page.screenshot({ path: `test-results/rate1-policy-${lang}-1440.png`, fullPage: true });
  });

  test(`문서 전환 → Crown Score 산정 기준 (${lang} · 390 · 가로 넘침 없음)`, async ({ page, baseURL }) => {
    await seedConsent(page, baseURL);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`/policies/privacy?lang=${lang}`);
    const tab = page.locator(".policy-doc-switch a[href='/policies/crown-score']");
    await expect(tab).toContainText(TITLE[lang]);
    await tab.scrollIntoViewIfNeeded();
    await tab.click();
    await expect(page).toHaveURL(/\/policies\/crown-score/);
    await expect(page.locator("h1.ph-title", { hasText: TITLE[lang] }).first()).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.screenshot({ path: `test-results/rate1-policy-${lang}-390.png`, fullPage: true });
  });
}
