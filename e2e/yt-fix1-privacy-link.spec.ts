/**
 * YT-FIX-1 PR A-1 — 개인정보처리방침 링크가 모든 화면 바닥에 늘 보인다 (구글 정책 III.A.2a).
 *
 *   · `/` · 매치 무대 `/arena/{진행 중 대회}` · 차트 `/arena/{id}/ranking` · The Lab `/admin/lab`
 *     에서 링크가 보이고, 누르면 `/policies/privacy` 로 가서 YouTube API 단락이 보인다.
 *   · 공용 바닥 띠의 네 항목은 글꼴·크기·색이 같다.
 *   · 매치 무대: 띠는 첫 화면 아래에 있고 플레이어(iframe) · 이름 칸 · 배너와 겹치지 않는다.
 *
 * 결정성: 모든 이동에 `?lang=` 고정 [[feedback-i18n-test-determinism]]. 진행 중 대회는
 * 실서비스 데이터에서 하나 고른다(쓰기 없음). 기본 storageState(로그인 계정)로 연다 —
 * 익명 계정을 새로 만들지 않고, The Lab 은 관리자 계정이어야 열린다.
 * REQUIRES PREVIEW_URL + FIREBASE_ADMIN_SDK_KEY (+ VERCEL_AUTOMATION_BYPASS_SECRET).
 */
import { expect, test, type Page } from "@playwright/test";
import * as admin from "firebase-admin";

const LINK_TEXT = { ko: "개인정보처리방침", en: "Privacy Policy", es: "Política de privacidad" } as const;
const YT_HEADING = {
  ko: "YouTube API 서비스",
  en: "YouTube API Services",
  es: "Servicios de la API de YouTube",
} as const;
const LANGS = ["ko", "en", "es"] as const;

function ensureAdmin(): typeof admin {
  if (admin.apps.length === 0) {
    const raw = process.env.FIREBASE_ADMIN_SDK_KEY;
    if (!raw) throw new Error("FIREBASE_ADMIN_SDK_KEY required for YT-FIX-1 privacy link E2E.");
    const json = raw.trim().startsWith("{") ? raw : Buffer.from(raw, "base64").toString("utf8");
    admin.initializeApp({ credential: admin.credential.cert(JSON.parse(json)) });
  }
  return admin;
}

/** 실서비스에서 진행 중인 공개 대회 하나(시험 대회 제외 · 읽기만). */
async function activeTournamentId(): Promise<string> {
  const snap = await ensureAdmin()
    .firestore()
    .collection("tournaments")
    .where("status", "==", "active")
    .limit(10)
    .get();
  const doc = snap.docs.find((d) => d.get("e2e") !== true);
  if (!doc) throw new Error("진행 중인 공개 대회가 없다 — 매치 무대 확인을 할 수 없다.");
  return doc.id;
}

async function seedConsent(page: Page, baseURL: string | undefined) {
  // 이미 동의한 팬 — 흔적 쿠키 "1.0.<저장 시각>". 동의 바가 바닥 줄을 가리지 않게.
  await page.context().addCookies([
    { name: "wc48_consent", value: `1.0.${Date.now() - 86_400_000}`, url: baseURL ?? "http://localhost:3000" },
  ]);
}

function watchErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  return errors;
}

const privacyLink = (page: Page) => page.getByTestId("footer-privacy-link");

async function expectLinkLeadsToPolicy(page: Page, lang: (typeof LANGS)[number]) {
  const link = privacyLink(page);
  await link.scrollIntoViewIfNeeded();
  await expect(link).toBeVisible();
  await expect(link).toHaveText(LINK_TEXT[lang]);
  await link.click();
  // 화면 언어가 따라간다 — 없으면 방침이 영어로 열린다.
  await expect(page).toHaveURL(new RegExp(`/policies/privacy\\?lang=${lang}`));
  await expect(page.getByRole("heading", { name: YT_HEADING[lang] }).first()).toBeVisible();
}

for (const lang of LANGS) {
  test(`공개 화면 바닥 — 링크가 보이고 방침으로 간다 (${lang})`, async ({ page, baseURL }) => {
    const errors = watchErrors(page);
    await seedConsent(page, baseURL);
    await page.goto(`/?lang=${lang}`);
    await expectLinkLeadsToPolicy(page, lang);
    expect(errors).toEqual([]);
  });
}

test.describe("매치 무대 · 차트", () => {
  let tid = "";
  test.beforeAll(async () => {
    tid = await activeTournamentId();
  });

  for (const lang of LANGS) {
    test(`매치 무대 — 공용 띠 · 첫 화면 아래 · 겹침 0 (${lang})`, async ({ page, baseURL }) => {
      const errors = watchErrors(page);
      await seedConsent(page, baseURL);
      await page.goto(`/arena/${tid}?lang=${lang}`);
      // 처음 들어오면 안내창이 화면 전체를 덮는다 — 닫고 본다(안내창이 떠 있는 동안은 링크를 못 누른다).
      const intro = page.getByTestId("arena-intro");
      if (await intro.waitFor({ timeout: 5000 }).then(() => true, () => false)) {
        await intro.getByRole("button").first().click();
        await expect(intro).toBeHidden();
      }
      const link = privacyLink(page);
      await link.scrollIntoViewIfNeeded();
      await expect(link).toBeVisible();

      // 공용 바닥 띠 — 네 항목이 모두 보이고 같은 글꼴·크기·색이다.
      const band = page.getByTestId("footer-band");
      const looks = await band.locator("> *").evaluateAll((els) =>
        els.map((e) => {
          const c = getComputedStyle(e);
          return `${c.fontFamily}|${c.fontSize}|${c.color}|${c.textDecorationLine}`;
        }),
      );
      expect(looks).toHaveLength(4);
      expect(new Set(looks).size).toBe(1);

      // 띠는 첫 화면 아래 — 플레이어 · 이름 띠 · 배너와 겹침 0.
      const geo = await page.evaluate(() => {
        const box = (e: Element) => {
          const r = e.getBoundingClientRect();
          return { t: r.top + scrollY, b: r.bottom + scrollY, l: r.left, r: r.right };
        };
        const others = Array.from(document.querySelectorAll("iframe, button[data-side], aside[data-banner-variant]"))
          .filter((e) => e.getBoundingClientRect().width > 0)
          .map(box);
        return { band: box(document.querySelector('[data-testid="footer-band"]')!), vh: innerHeight, others };
      });
      expect(geo.band.t).toBeGreaterThanOrEqual(geo.vh);
      for (const o of geo.others) expect(o.b <= geo.band.t).toBe(true);

      await expectLinkLeadsToPolicy(page, lang);
      expect(errors).toEqual([]);
    });
  }

  test("차트 — 공용 띠의 링크가 보이고 방침으로 간다 (ko)", async ({ page, baseURL }) => {
    const errors = watchErrors(page);
    await seedConsent(page, baseURL);
    await page.goto(`/arena/${tid}/ranking?lang=ko`);
    await expectLinkLeadsToPolicy(page, "ko");
    expect(errors).toEqual([]);
  });
});

test("The Lab(관리자) — 바닥 줄에 링크가 보이고 방침으로 간다 (ko)", async ({ page, baseURL }) => {
  const errors = watchErrors(page);
  await seedConsent(page, baseURL);
  await page.goto("/admin/lab?lang=ko");
  await expectLinkLeadsToPolicy(page, "ko");
  expect(errors).toEqual([]);
});
