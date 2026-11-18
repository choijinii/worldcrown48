/**
 * PITCH-2 PR B — 기사 조회 기록 → 급등 순서 (지시서 §11.2 PR B E2E ② · 추가 지시 ① 4절 "1경로" · 에뮬레이터).
 *
 *   발행 기사 2건(새 기사 A · 옛 기사 B) → 급등 순서 A, B(둘 다 0 → 최신 발행순)
 *   → B 지면을 연다 → 콜러블이 views.total 1 · views.d<오늘 KST> 1 을 쓴다
 *   → 급등 정렬(lib/news/articleViews · 홈 HOT 열이 PR A 에서 그대로 쓴다)에서 B 가 A 앞으로
 *   → 다시 열어도(로컬 메모) · 로컬 메모를 지우고 다시 열어도(서버 표지) 1 그대로 — 1시간 1번
 *   → 익명 계정 0개(기사를 열어도 계정을 만들지 않는다 · 원장 D-41) · 콘솔 오류 0
 *
 * 홈의 HOT 열 화면은 PR A 의 몫 — 이 시험은 그 열이 쓰는 정렬 함수와 저장된 조회 칸을 본다.
 */
import { Timestamp } from "firebase-admin/firestore";
import { expect, test } from "@playwright/test";
import { adminApp, collectConsoleErrors, db, expectNoConsoleErrors, resetEmulators } from "./helpers";
import { sortTrending, viewDayKey } from "../../lib/news/articleViews";
import { todayKST } from "../../lib/run/kstReset";

const A = "20261118-newaaa";
const B = "20261118-oldbbb";

async function seedArticle(slug: string, title: string, publishedAtMs: number) {
  await db()
    .collection("news")
    .doc(slug)
    .set({
      slug,
      status: "published",
      template: "column",
      origin: "manual_ai",
      title: { ko: title, en: "", es: "" },
      subhead: { ko: "부제", en: "", es: "" },
      body: { ko: [{ type: "lead", text: "본문 첫 문단" }], en: [], es: [] },
      evidence: { asOf: "", stats: [] },
      tournamentId: null,
      createdAt: Timestamp.fromMillis(publishedAtMs),
      publishedAt: Timestamp.fromMillis(publishedAtMs),
    });
}

async function articles() {
  const snap = await db().collection("news").get();
  return snap.docs.map((d) => ({
    slug: d.id,
    publishedAtMs: (d.get("publishedAt") as Timestamp).toMillis(),
    views: d.get("views") as Record<string, number> | undefined,
  }));
}
const totalOf = async (slug: string) =>
  ((await db().collection("news").doc(slug).get()).get("views.total") as number | undefined) ?? 0;

test.beforeEach(async () => {
  await resetEmulators();
  const now = Date.now();
  await seedArticle(A, "새 기사 A", now - 60_000);
  await seedArticle(B, "옛 기사 B", now - 86_400_000);
});

test("기사를 열면 조회가 1 오르고 급등 순서가 바뀐다 · 1시간 1번 · 익명 계정 0", async ({ page }) => {
  // 서버 표지는 정각~정각 한 시간 창이다. 창 끝 90초 안이면 다음 창으로 넘어간 뒤 시작한다
  // (이 시험은 길어야 40초 남짓 — 정각을 걸치면 세 번째 열기가 새 표지로 2를 센다).
  const toHour = 3_600_000 - (Date.now() % 3_600_000);
  if (toHour < 90_000) await page.waitForTimeout(toHour + 1_000);

  const errors = collectConsoleErrors(page);
  const today = todayKST(new Date());

  expect(sortTrending(await articles(), today).map((a) => a.slug)).toEqual([A, B]);

  // 동의 바는 누르지 않는다 — 동의 저장은 익명 계정을 만드는 자리(원장 D-41 ①)라, 누르면 아래 "익명 계정 0"이
  // 기사 열기와 상관없이 흔들린다. 바가 떠 있어도 기사 글자와 조회 기록에는 영향이 없다.
  await page.goto(`/news/${B}?lang=ko`);
  await expect(page.getByText("옛 기사 B").first()).toBeVisible();
  await expect.poll(() => totalOf(B), { timeout: 20_000 }).toBe(1);

  const views = (await db().collection("news").doc(B).get()).get("views");
  expect(views).toEqual({ total: 1, [viewDayKey(today)]: 1 });
  expect(sortTrending(await articles(), today).map((a) => a.slug)).toEqual([B, A]);

  // 다시 열기 — 로컬 메모로 부르지 않는다.
  await page.reload();
  await expect(page.getByText("옛 기사 B").first()).toBeVisible();
  await page.waitForTimeout(3_000);
  expect(await totalOf(B)).toBe(1);

  // 로컬 메모를 지우고 다시 열기 — 서버 표지(news_view_marks)가 막는다.
  await page.evaluate(() => window.localStorage.removeItem("wc48_article_views"));
  await page.reload();
  await expect(page.getByText("옛 기사 B").first()).toBeVisible();
  await page.waitForTimeout(3_000);
  expect(await totalOf(B)).toBe(1);
  expect(await totalOf(A)).toBe(0);

  // 기사를 열어도 익명 계정을 만들지 않는다(원장 D-41).
  const users = await adminApp().auth().listUsers();
  expect(users.users).toHaveLength(0);

  await expectNoConsoleErrors(errors);
});
