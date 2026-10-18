/**
 * PRE-REG-1 — 사전등록이 등록 함수(registerWaitlist)를 거쳐 저장되고, 처음 들어온 경로가 실린다.
 *
 * 미리보기는 운영 Firebase 를 쓴다(프로젝트가 하나뿐). 그래서 **시험 메일(@wc48.test)만** 쓴다 —
 * 함수가 진짜 `waitlist`·진짜 번호 대신 `waitlist_test`·시험 번호에 저장한다. 끝나면 이 실행이
 * 만든 문서를 지운다(운영 데이터에 시험 등록을 남기지 않는다). 등록 함수가 배포돼 있어야 초록이다.
 *
 * 동의: 흔적 쿠키로 동의 바만 숨긴다 — 분석 동의 기록은 없으므로 처음 경로는 브라우저에 남지 않고
 * 메모리(이 방문)로만 실린다(원장 D-53). 그래서 "다른 페이지를 거쳐" 는 새로고침 없는 이동으로 본다.
 * 속도 제한 안내만 함수 응답을 가로채 확인한다(1분 10번을 실제로 넘기지 않는다 · 원장 D-58).
 */
import { createHash } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";
import * as admin from "firebase-admin";

const TEST_DOMAIN = "wc48.test";
const RUN = `${Date.now()}`;
const email = (n: string) => `e2e-${RUN}-${n}@${TEST_DOMAIN}`;
const hash = (e: string) => createHash("sha256").update(e).digest("hex");
const made: string[] = [];

function db(): admin.firestore.Firestore {
  if (admin.apps.length === 0) {
    const raw = process.env.FIREBASE_ADMIN_SDK_KEY;
    if (!raw) throw new Error("FIREBASE_ADMIN_SDK_KEY required for PRE-REG-1 E2E (저장 확인 · 정리).");
    const decoded = raw.trim().startsWith("{") ? raw : Buffer.from(raw, "base64").toString("utf8");
    admin.initializeApp({ credential: admin.credential.cert(JSON.parse(decoded) as admin.ServiceAccount) });
  }
  return admin.firestore();
}

async function hideConsentBar(page: Page, baseURL: string | undefined) {
  const savedAt = Date.now() - 24 * 60 * 60 * 1000;
  await page.context().addCookies([
    { name: "wc48_consent", value: `1.0.${savedAt}`, url: baseURL ?? "http://localhost:3000" },
  ]);
}

async function submit(page: Page, value: string) {
  await page.getByLabel("이메일 주소").fill(value);
  await page.getByRole("button", { name: "웨이트리스트 참여" }).click();
}

async function testDoc(e: string) {
  return db().collection("waitlist_test").doc(hash(e)).get();
}

test.describe.configure({ mode: "serial" });

test.afterAll(async () => {
  if (made.length === 0) return;
  const d = db();
  await Promise.all(made.map((e) => d.collection("waitlist_test").doc(hash(e)).delete()));
});

test("주소의 utm 을 실어 등록 → 성공 · 시험 모음에 저장(진짜 모음엔 없음)", async ({ page, baseURL }) => {
  await hideConsentBar(page, baseURL);
  await page.goto("/launch?utm_source=x&utm_medium=y&lang=ko");
  await expect(page.getByTestId("launch-illustration")).toBeVisible();
  // 보관 기간 한 줄(원장 D-57) — 끝 낱말이 처리방침 1.1 로 간다.
  await expect(page.locator(".wl-retention")).toContainText("정식 개막 후 12개월 보관");
  await expect(page.locator(".wl-retention a")).toHaveAttribute("href", "/policies/privacy?lang=ko#1.1");

  const e = email("a");
  made.push(e);
  await submit(page, e);
  await expect(page.locator("section.waitlist")).toHaveAttribute("data-state", "success", { timeout: 20_000 });
  await expect(page.getByText("명단에 등록되었습니다!")).toBeVisible();

  const snap = await testDoc(e);
  expect(snap.exists).toBe(true);
  expect(snap.get("utm")).toEqual({ source: "x", medium: "y" });
  expect(snap.get("lang")).toBe("ko");
  expect(typeof snap.get("founding_rank")).toBe("number");
  expect((await db().collection("waitlist").doc(hash(e)).get()).exists).toBe(false);
});

test("같은 메일 다시 → 이미 등록", async ({ page, baseURL }) => {
  await hideConsentBar(page, baseURL);
  await page.goto("/launch?lang=ko");
  await submit(page, email("a"));
  await expect(page.locator("section.waitlist")).toHaveAttribute("data-state", "duplicate", { timeout: 20_000 });
  await expect(page.getByText("이미 등록된 이메일입니다.")).toBeVisible();
});

test("잘못된 메일 → 오류", async ({ page, baseURL }) => {
  await hideConsentBar(page, baseURL);
  await page.goto("/launch?lang=ko");
  await submit(page, "not-an-email");
  await expect(page.locator("section.waitlist")).toHaveAttribute("data-state", "invalid");
  await expect(page.getByText("올바른 이메일 주소를 입력하세요.")).toBeVisible();
});

test("다른 페이지를 거쳐(새로고침 없이) 등록해도 처음 경로가 실린다", async ({ page, baseURL }) => {
  await hideConsentBar(page, baseURL);
  await page.goto("/launch?utm_source=ig&utm_campaign=first_touch&lang=ko");
  // 사이트 안 이동(새로고침 없음) — 정책 문서로 갔다가 브라우저 뒤로 가기.
  await page.evaluate(() => {
    (window as unknown as { next: { router: { push: (h: string) => void } } }).next.router.push("/policies/privacy?lang=ko");
  });
  await expect(page).toHaveURL(/\/policies\/privacy/);
  await page.goBack();
  await expect(page).toHaveURL(/\/launch/);

  const e = email("b");
  made.push(e);
  await submit(page, e);
  await expect(page.locator("section.waitlist")).toHaveAttribute("data-state", "success", { timeout: 20_000 });
  expect((await testDoc(e)).get("utm")).toEqual({ source: "ig", campaign: "first_touch" });
});

test("속도 제한 → 안내 문구(함수 응답 가로채기)", async ({ page, baseURL }) => {
  await hideConsentBar(page, baseURL);
  await page.route("**/registerWaitlist", (route) =>
    route.fulfill({
      status: 429,
      contentType: "application/json",
      body: JSON.stringify({ error: { status: "RESOURCE_EXHAUSTED", message: "rate-limited" } }),
    }),
  );
  await page.goto("/launch?lang=ko");
  await submit(page, email("rl"));
  await expect(page.locator("section.waitlist")).toHaveAttribute("data-state", "rateLimited");
  await expect(page.getByText("같은 연결에서 등록 요청이 너무 많았어요. 1분 뒤 다시 시도해 주세요.")).toBeVisible();
});
