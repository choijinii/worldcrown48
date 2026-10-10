/**
 * POLICY-YT-1 — 정책 문서의 조항 링크 6개 × 3언어가 실제로 그 조항으로 이동한다.
 *
 * 고장(main cf8618a): 소제목(h3)에 id 가 없고 h2 id 는 제목 글자 slug 라 `#2.7`·`#8` 이 어디로도
 * 가지 않았다. 세 언어 문서가 한 DOM 에 있어 en·es 는 `en-2.7`·`es-2.7` id 를 쓰고, 화면이 해시를
 * 그 언어 id 로 바꿔 이동한다 — 이 이동은 브라우저에서만 확인된다(단위 시험은 id 까지만 본다).
 * 링크에는 문서 언어(`?lang=`)가 붙어 es 문서에서 누른 링크가 한국어 문서로 가지 않는다.
 *
 * 동의 바: 문서 버전을 1.2 로 올렸어도 이미 동의한 팬(흔적 쿠키 `1.0.<ms>`)에게 다시 뜨지 않는다(R3).
 * 결정성: 모든 이동에 `?lang=` 고정 [[feedback-i18n-test-determinism]].
 */
import { expect, test, type Page } from "@playwright/test";

const LANGS = ["ko", "en", "es"] as const;
const PREFIX = { ko: "", en: "en-", es: "es-" } as const;

/** 출발 문서 · 링크 해시 · 도착 문서 (지시서 §2-C). */
const LINKS = [
  { from: "privacy", to: "community", num: "2.2" },
  { from: "privacy", to: "terms", num: "5.3" },
  { from: "terms", to: "community", num: "2.7" },
  { from: "terms", to: "community", num: "8" },
  { from: "terms", to: "community", num: "2" },
  { from: "terms", to: "community", num: "6" },
] as const;

async function seedConsent(page: Page, baseURL: string | undefined) {
  // 이미 동의한 팬 — 흔적 쿠키 "1.0.<저장 시각>" (CURRENT_POLICY_VERSION 1.0).
  const savedAt = Date.now() - 24 * 60 * 60 * 1000;
  await page.context().addCookies([
    { name: "wc48_consent", value: `1.0.${savedAt}`, url: baseURL ?? "http://localhost:3000" },
  ]);
}

for (const lang of LANGS) {
  test.describe(`조항 링크 (${lang})`, () => {
    for (const { from, to, num } of LINKS) {
      test(`${from} → ${to} §${num}`, async ({ page, baseURL }) => {
        await seedConsent(page, baseURL);
        await page.goto(`/policies/${from}?lang=${lang}`);

        const href = `/policies/${to}?lang=${lang}#${num}`;
        const link = page.locator(`.policy-doc .doc-${lang} a[href="${href}"]`).first();
        await expect(link).toBeVisible();
        await link.click();

        await expect(page).toHaveURL(new RegExp(`/policies/${to}\\?lang=${lang}#${num.replace(".", "\\.")}$`));
        const target = page.locator(`.policy-doc .doc-${lang} [id="${PREFIX[lang]}${num}"]`);
        await expect(target).toBeVisible();
        // 조항 제목이 화면 위쪽(고정 머리 아래)에 와 있다 — 이동했다는 증거.
        await expect
          .poll(
            async () => {
              const y = (await target.boundingBox())?.y ?? -1;
              return y >= 0 && y < 300;
            },
            { timeout: 5000 },
          )
          .toBe(true);

        // 이미 동의한 팬에게 동의 바가 다시 뜨지 않는다 (문서 1.2 ≠ 동의 1.0).
        await expect(page.locator(".cookie-banner")).toBeHidden();
      });
    }
  });
}

test("정책 3언어 — YouTube API 문단이 개인정보처리방침·이용약관에 보인다", async ({ page, baseURL }) => {
  await seedConsent(page, baseURL);
  const HEAD = { ko: "YouTube API 서비스", en: "YouTube API Services", es: "Servicios de la API de YouTube" };
  for (const lang of LANGS) {
    await page.goto(`/policies/privacy?lang=${lang}`);
    await expect(page.locator(`.policy-doc .doc-${lang} h3`, { hasText: HEAD[lang] })).toBeVisible();
    await page.goto(`/policies/terms?lang=${lang}`);
    await expect(
      page.locator(`.policy-doc .doc-${lang} a[href="https://www.youtube.com/t/terms"]`),
    ).toBeVisible();
  }
});
