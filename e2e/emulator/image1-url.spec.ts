/**
 * IMAGE-1 PR 1 — §11.2 E2E ② (에뮬레이터).
 *
 * 칸 [이미지](옛 [URL]) → 로컬 가짜 그림 서버 주소 → 서버 함수 importEntryImage 가 받아 줄여 우리 Storage 에 둔다 →
 * 미리보기 + 출처 도메인 글자. 실패 주소(그림 아님 · 세로 400px 미만 · 없음) → 이유 문구(6절 ⓑ).
 */
import { expect, test } from "@playwright/test";
import {
  ADMIN_UID,
  DRAFT_TITLE,
  adminApp,
  collectConsoleErrors,
  db,
  resetEmulators,
  seedCategories,
  seedDraft,
  signInAsAdmin,
  startFakeImageServer,
} from "./helpers";

let server: Awaited<ReturnType<typeof startFakeImageServer>>;
test.beforeAll(async () => {
  server = await startFakeImageServer();
});
test.afterAll(async () => server?.close());
test.beforeEach(async () => {
  await resetEmulators();
  await seedCategories();
});

test("② [URL] 성공 → 미리보기 + 출처 글자 · 실패 → 이유 문구", async ({ page }) => {
  const draftId = await seedDraft("e2eDraft1", "image"); // D-90 — 그림 주소는 이미지 대회에서만
  const errors = collectConsoleErrors(page);
  await page.goto("/admin/lab?lang=ko");
  await signInAsAdmin(page);
  await page.getByTestId("draft-row").filter({ hasText: DRAFT_TITLE }).getByTestId("draft-open").click();
  await expect(page.getByTestId("contestant-grid")).toBeVisible();

  const slot = 3;
  async function tryUrl(url: string) {
    const input = page.getByTestId(`slot-image-url-input-${slot}`);
    if (!(await input.isVisible())) await page.getByTestId(`slot-image-url-${slot}`).click();
    await input.fill(url);
    await input.press("Enter");
  }

  // 그림이 아닌 주소
  await tryUrl(`${server.base}/page.html`);
  await expect(page.getByTestId(`slot-image-fail-${slot}`)).toHaveText("그림 파일이 아니에요", { timeout: 30_000 });
  // 세로 300px
  await tryUrl(`${server.base}/img/short-300.jpg`);
  await expect(page.getByTestId(`slot-image-fail-${slot}`)).toHaveText("세로 400px보다 작아요", { timeout: 30_000 });
  // 없는 주소
  await tryUrl(`${server.base}/img/nope.jpg`);
  await expect(page.getByTestId(`slot-image-fail-${slot}`)).toHaveText("주소에서 그림을 받지 못했어요", { timeout: 30_000 });

  // 성공
  await tryUrl(`${server.base}/img/05.jpg`);
  await expect(page.getByTestId(`slot-image-badge-${slot}`)).toHaveText("그림", { timeout: 30_000 });
  await expect(page.getByTestId(`slot-image-fail-${slot}`)).toHaveCount(0);
  await expect(page.getByTestId(`slot-meta-${slot}`)).toHaveText("127.0.0.1");
  await expect(page.getByTestId(`contestant-pick-${slot}`)).toHaveAttribute("style", /127\.0\.0\.1:9199/);

  // 저장소에 1600 · 600 두 장 — 우리 복사본
  const [files] = await adminApp().storage().bucket().getFiles({ prefix: `entry-images/drafts/${ADMIN_UID}/${draftId}/` });
  expect(files.map((f) => f.name).sort()).toEqual([
    `entry-images/drafts/${ADMIN_UID}/${draftId}/${slot}.jpg`,
    `entry-images/drafts/${ADMIN_UID}/${draftId}/${slot}_600.jpg`,
  ]);
  const [meta] = await files.find((f) => f.name.endsWith(`/${slot}.jpg`))!.getMetadata();
  expect(meta.contentType).toBe("image/jpeg");

  // 초안에 출처가 기록된다(origin url)
  await expect
    .poll(async () => {
      const cs = (await db().collection("tournamentDrafts").doc(draftId).get()).get("contestants") as {
        imageSource?: { origin?: string; sourcePage?: string };
      }[];
      return cs[slot]?.imageSource?.origin ?? null;
    }, { timeout: 30_000 })
    .toBe("url");

  // 켜진 [이미지] → 그림이 빠지고 저장소 파일도 지워진다(LAB-FIX-3 · [그림 지우기] 대신)
  await expect(page.getByTestId(`slot-image-url-${slot}`)).toHaveAttribute("aria-pressed", "true");
  await page.getByTestId(`slot-image-url-${slot}`).click();
  await expect(page.getByTestId(`slot-image-badge-${slot}`)).toHaveCount(0);
  await expect
    .poll(async () => (await adminApp().storage().bucket().getFiles({ prefix: `entry-images/drafts/${ADMIN_UID}/${draftId}/` }))[0].length)
    .toBe(0);

  expect(errors, errors.join("\n")).toHaveLength(0);
});

test("통합: 관리자가 아니면 importEntryImage · finalizeEntryImages 거부(permission-denied)", async () => {
  const authHost = process.env.FIREBASE_AUTH_EMULATOR_HOST!;
  const token = await adminApp().auth().createCustomToken("not-admin");
  const signIn = await fetch(
    `http://${authHost}/identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=demo-api-key`,
    { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, returnSecureToken: true }) },
  );
  const { idToken } = (await signIn.json()) as { idToken: string };
  for (const [fn, data] of [
    ["importEntryImage", { draftId: "d1", slot: 0, url: `${server.base}/img/01.jpg` }],
    ["finalizeEntryImages", { draftId: "d1", tournamentId: "t1", slots: [] }],
  ] as const) {
    const res = await fetch(`http://127.0.0.1:5001/demo-wc48/asia-northeast3/${fn}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
      body: JSON.stringify({ data }),
    });
    const body = (await res.json()) as { error?: { status?: string } };
    expect(body.error?.status, fn).toBe("PERMISSION_DENIED");
  }
});
