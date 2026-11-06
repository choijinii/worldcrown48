/**
 * LEGAL-CS-1 (원장 D-83 · 2026-11-06) — 법적 문제 창구는 policy@ 하나 · 이용약관 §5.4 내리기 요청.
 *
 * 단위 시험(contacts.test.ts)은 마크다운 글자를 본다. 여기서는 정책 페이지가 그 글자를 실제로
 * 그리는지 본다: 세 언어 이용약관에 §5.4 소절(id `5.4` · `en-5.4` · `es-5.4`)이 보이고 그 안에
 * policy@ 가 있으며, 네 문서 어디에도 report@ 글자가 없다. 커뮤니티 §7·§10 도 policy@.
 * 결정성: 모든 이동에 `?lang=` 고정 [[feedback-i18n-test-determinism]].
 */
import { expect, test, type Page } from "@playwright/test";

const LANGS = ["ko", "en", "es"] as const;
const PREFIX = { ko: "", en: "en-", es: "es-" } as const;
const POLICY = "policy@worldcrown48.com";
const DOCS = ["terms", "community", "privacy", "cookies"] as const;

/**
 * 제목(id) 다음부터 다음 제목 전까지의 형제 요소에 든 mailto 주소들. 정책 페이지는 h2 를
 * `<section class="policy-section" id>` 로만 감싸고 본문은 그 뒤 형제로 흐르며, h3 는 id 를 직접 단다.
 */
async function mailtosUnder(page: Page, lang: string, id: string): Promise<string[]> {
  return page.locator(`.policy-doc .doc-${lang} [id="${id}"]`).evaluate((head) => {
    const out: string[] = [];
    for (let el = head.nextElementSibling; el; el = el.nextElementSibling) {
      if (el.matches("section.policy-section, h2, h3")) break;
      el.querySelectorAll("a[href^='mailto:']").forEach((a) => out.push(a.getAttribute("href") ?? ""));
    }
    return out;
  });
}

async function seedConsent(page: Page, baseURL: string | undefined) {
  // 이미 동의한 팬 — 흔적 쿠키 "1.0.<저장 시각>" (CURRENT_POLICY_VERSION 1.0). 동의 바가 가리지 않게.
  const savedAt = Date.now() - 24 * 60 * 60 * 1000;
  await page.context().addCookies([
    { name: "wc48_consent", value: `1.0.${savedAt}`, url: baseURL ?? "http://localhost:3000" },
  ]);
}

for (const lang of LANGS) {
  test(`이용약관 §5.4 내리기 요청 + policy@ (${lang})`, async ({ page, baseURL }) => {
    await seedConsent(page, baseURL);
    await page.goto(`/policies/terms?lang=${lang}`);
    const doc = page.locator(`.policy-doc .doc-${lang}`);
    const head = doc.locator(`[id="${PREFIX[lang]}5.4"]`);
    await expect(head).toBeVisible();
    await expect(head).toContainText("5.4");
    expect(await mailtosUnder(page, lang, `${PREFIX[lang]}5.4`)).toContain(`mailto:${POLICY}`);
    await expect(doc).toContainText("[내리기 요청]");
  });

  test(`커뮤니티 §7·§10 = policy@ (${lang})`, async ({ page, baseURL }) => {
    await seedConsent(page, baseURL);
    await page.goto(`/policies/community?lang=${lang}`);
    for (const num of ["7", "10"]) {
      await expect(page.locator(`.policy-doc .doc-${lang} [id="${PREFIX[lang]}${num}"]`)).toBeVisible();
      const mails = await mailtosUnder(page, lang, `${PREFIX[lang]}${num}`);
      expect(mails, `§${num}`).toContain(`mailto:${POLICY}`);
      expect(mails.join(" "), `§${num}`).not.toContain("report@");
    }
  });

  test(`정책 문서 4종에 report@ 글자가 없다 (${lang})`, async ({ page, baseURL }) => {
    await seedConsent(page, baseURL);
    for (const docName of DOCS) {
      await page.goto(`/policies/${docName}?lang=${lang}`);
      const doc = page.locator(`.policy-doc .doc-${lang}`);
      await expect(doc).toContainText(POLICY);
      expect(await doc.innerText(), `${docName}`).not.toContain("report@");
    }
  });
}

test("바닥 띠 '콘텐츠 신고' 링크 = mailto:policy@ (3언어 · 글자 그대로)", async ({ page, baseURL }) => {
  await seedConsent(page, baseURL);
  const LABEL = { ko: "콘텐츠 신고", en: "Report content", es: "Denunciar contenido" } as const;
  for (const lang of LANGS) {
    await page.goto(`/policies/terms?lang=${lang}`);
    const link = page.getByTestId("footer-band").getByRole("link", { name: LABEL[lang] });
    await expect(link).toHaveAttribute("href", `mailto:${POLICY}`);
  }
});
