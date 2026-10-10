/**
 * POLICY-YT-1 — 정책 문서의 조항 링크 6개 × 3언어가 실제로 그 조항으로 이동한다.
 *
 * 고장(main cf8618a): 소제목(h3)에 id 가 없고 h2 id 는 제목 글자 slug 라 `#2.7`·`#8` 이 어디로도
 * 가지 않았다. 세 언어 문서가 한 DOM 에 있어 en·es 는 `en-2.7`·`es-2.7` id 를 쓰고, 화면이 해시를
 * 그 언어 id 로 바꿔 이동한다 — 이 이동은 브라우저에서만 확인된다(단위 시험은 id 까지만 본다).
 * 링크에는 문서 언어(`?lang=`)가 붙어 es 문서에서 누른 링크가 한국어 문서로 가지 않는다.
 *
 * 동의 바: 문서 버전을 1.2 로 올렸어도 이미 동의한 팬(흔적 쿠키 `1.0.<ms>`)에게 다시 뜨지 않는다(R3).
 * 모바일 섹션 이동 목록 · 섹션 조회 계측(대표 결정 2026-10-10): 둘 다 h2.id 를 읽어 main 에서 죽어 있었다.
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
        // "resolving" 동안은 동의 바가 아예 없어 숨김 판정이 너무 일찍 통과한다 → 판정이 끝난 상태를 기다린다.
        await expect(page.locator(".cookie-banner")).toHaveAttribute("data-state", "hidden");
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

/** 활성 언어 문서의 섹션 id — PolicyContent 가 `<section class="policy-section" id>` 에 단다. */
async function sectionIds(page: Page, lang: string): Promise<string[]> {
  return page
    .locator(`.policy-doc .doc-${lang} section.policy-section[id]`)
    .evaluateAll((els) => els.map((el) => el.id));
}

test("모바일 섹션 이동 목록 — 활성 언어의 섹션이 다 들어 있고, 고르면 그 섹션으로 간다", async ({ page, baseURL }) => {
  // 고장(main): 목록이 h2.id 를 읽는데 id 는 감싼 <section> 에 있어 "섹션으로 이동…" 하나뿐이었다.
  await page.setViewportSize({ width: 390, height: 844 });
  await seedConsent(page, baseURL);
  await page.goto("/policies/privacy?lang=es");
  const ids = await sectionIds(page, "es");
  expect(ids.length).toBeGreaterThan(3);

  const select = page.locator(".policy-anchor-bar select");
  await expect(select).toBeVisible();
  await expect
    .poll(() => select.locator("option").evaluateAll((os) => os.map((o) => (o as HTMLOptionElement).value).filter(Boolean)))
    .toEqual(ids);

  const last = ids[ids.length - 1];
  await select.selectOption(last);
  const target = page.locator(`[id="${last}"]`);
  await expect
    .poll(async () => {
      const y = (await target.boundingBox())?.y ?? -1;
      return y >= 0 && y < 300;
    }, { timeout: 5000 })
    .toBe(true);
});

test("섹션 조회 계측 — 스크롤 스파이가 활성 언어의 섹션(id 있는 요소)을 본다", async ({ page, baseURL }) => {
  // 고장(main): 스파이가 h2 를 관찰하고 entry.target.id 를 읽는데 h2 엔 id 가 없어
  // policy_section_view 가 한 번도 나가지 않았다. 관찰 대상을 기록해 id 를 확인한다.
  await page.addInitScript(() => {
    const seen: string[] = [];
    (window as unknown as { __spyTargets: string[] }).__spyTargets = seen;
    const Native = window.IntersectionObserver;
    window.IntersectionObserver = class extends Native {
      observe(target: Element) {
        seen.push(target.id);
        super.observe(target);
      }
    } as typeof IntersectionObserver;
  });
  await seedConsent(page, baseURL);
  await page.goto("/policies/terms?lang=en");
  const ids = await sectionIds(page, "en");
  expect(ids.length).toBeGreaterThan(3);
  await expect
    .poll(
      () =>
        page.evaluate(
          // 개발 모드 StrictMode 는 effect 를 두 번 돈다 — 같은 섹션의 이벤트는 firedSectionsRef 가 한 번만 보낸다.
          (want) => [...new Set((window as unknown as { __spyTargets: string[] }).__spyTargets)].filter((id) => want.includes(id)),
          ids,
        ),
      { timeout: 5000 },
    )
    .toEqual(ids);
});
