/**
 * B-1 The Lab critical-path E2E (handoff §11.2 / §11.4).
 *
 * Flow under test (B-2 5-step): operator gate → STEP 1 (제목·카테고리·키워드·
 * Deadline, 다음 게이트) → STEP 2 채우기 → publish → Arena 링크 → featured → 삭제.
 *
 * Auth: global-setup hydrates storageState for the OPERATOR account — the
 * preview's NEXT_PUBLIC_ADMIN_UID MUST equal that user's uid or AdminAuthGuard
 * redirects to "/" (see CI secrets in .github/workflows/b1-e2e.yml).
 *
 * The aiFillContestants callable is STUBBED via page.route so the suite never
 * spends a real Claude token and never flakes on model latency (trap #10 ethos
 * extends to CI). Firestore writes are REAL against the preview project; the
 * afterEach cleanup + firebase-admin teardown keep it idempotent.
 *
 * afterEach enforces "Console errors must be 0" (§11.6).
 *
 * NOTE: authored to the D-1 E2E pattern; verified in CI (needs preview +
 * secrets), not on the local box.
 */
import { expect, test, type Page } from "@playwright/test";
import * as admin from "firebase-admin";

let consoleErrors: string[] = [];
const createdTournamentIds: string[] = [];

function loadServiceAccount(): admin.ServiceAccount | null {
  const raw = process.env.FIREBASE_ADMIN_SDK_KEY;
  if (!raw) return null;
  const decoded = raw.trim().startsWith("{")
    ? raw
    : Buffer.from(raw, "base64").toString("utf8");
  return JSON.parse(decoded) as admin.ServiceAccount;
}

function ensureAdmin(): typeof admin | null {
  if (admin.apps.length > 0) return admin;
  const sa = loadServiceAccount();
  if (!sa) return null;
  admin.initializeApp({ credential: admin.credential.cert(sa) });
  return admin;
}

/**
 * 48 fake suggestions — **일부러 옛 계약(`position`)으로 답한다.**
 *
 * PR-2에서 응답 스키마가 affiliation으로 바뀌었는데, 프론트는 머지 즉시 Vercel로
 * 나가고 functions는 사람이 따로 배포한다. 그 **배포 순서 창** 동안 배포된 옛
 * 함수는 여전히 position으로 답한다. 그때 클라이언트가 affiliation을 undefined로
 * 만들면 Firestore가 거부해 발행이 통째로 실패한다 — 실제로 이 테스트가 그걸
 * 잡았다. 스텁을 옛 계약에 고정해 그 창을 계속 지킨다.
 */
function fakeContestants() {
  return Array.from({ length: 48 }, (_, i) => ({
    name: `E2E Player ${i + 1}`,
    nationality: "KR",
    position: "FW",
    imageSearchKeyword: `e2e player ${i + 1}`,
  }));
}

/** Stub the Firebase callables so no real Claude call happens (B-2 5-step flow). */
async function stubAiFill(page: Page) {
  await page.route("**/aiFillContestants*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      // onCall v2 wire format: the SDK reads the top-level `result`.
      body: JSON.stringify({ result: { contestants: fakeContestants() } }),
    });
  });
  // Publish translates title/description once — stub so no Claude call / console
  // noise. (translateMeta would otherwise fall back to the original silently.)
  await page.route("**/translateTournamentMeta*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        result: {
          titleI18n: { ko: "E2E Tournament", en: "E2E Tournament", es: "E2E Tournament" },
          descriptionI18n: { ko: "", en: "", es: "" },
        },
      }),
    });
  });
}

test.use({ viewport: { width: 1600, height: 1000 } }); // ≥1440 (DesktopOnly)

test.beforeEach(async ({ page }) => {
  consoleErrors = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });
});

test.afterEach(async () => {
  expect(consoleErrors, "Console errors must be 0").toHaveLength(0);
});

test.afterAll(async () => {
  const a = ensureAdmin();
  if (!a) return;
  const db = a.firestore();
  for (const id of createdTournamentIds) {
    const cs = await db
      .collection("contestants")
      .where("tournamentId", "==", id)
      .get();
    const batch = db.batch();
    cs.forEach((d) => batch.delete(d.ref));
    batch.delete(db.collection("tournaments").doc(id));
    await batch.commit();
  }
});

test.describe("B-1 The Lab — operator critical path", () => {
  // Park the whole suite until a real B-1 preview is configured. b1-e2e.yml
  // maps the B1_PREVIEW_URL secret → PREVIEW_URL; with neither set, the spec
  // would otherwise hit playwright.config's localhost fallback and 404. Skipped
  // (not failed) keeps CI green; the B1_ secrets land post-merge on main.
  test.skip(
    !process.env.PREVIEW_URL,
    "B1_PREVIEW_URL not set — B-1 E2E parked until post-merge secret setup",
  );

  test("operator reaches the console (gate allows admin)", async ({ page }) => {
    await page.goto("/admin/lab?lang=ko"); // §7: E2E ?lang=ko 강제 (한국어 셀렉터 정합)
    await expect(
      page.getByRole("heading", { name: "Tournament 만들기" }),
    ).toBeVisible();
  });

  test("STEP 1 (제목·카테고리·키워드·Deadline) → STEP 2 fill → publish → Arena 링크 → delete", async ({
    page,
  }) => {
    await stubAiFill(page);
    await page.goto("/admin/lab?lang=ko"); // §7: E2E ?lang=ko 강제 (한국어 셀렉터 정합)

    // STEP 1 — the 다음 button is the gate. It stays disabled until ①②④⑤ are met,
    // WITHOUT any AI call (핵심 AC#1: a hand-typed keyword is enough).
    const next = page.getByTestId("lab-next-button");
    await expect(next).toBeDisabled();

    await page.getByLabel("Tournament 제목").fill("E2E Tournament");
    await page.getByLabel("카테고리").selectOption("FOOTBALL");
    // Keyword typed by hand (no aiSuggestKeywords call) → satisfies ④.
    await page.getByLabel("키워드 추가").fill("e2e-keyword");
    await page.getByLabel("키워드 추가").press("Enter");
    await expect(page.getByTestId("keyword-chip")).toHaveText(/e2e-keyword/);
    // ⑤ Deadline defaults to the +7d preset, so the gate now opens.
    await expect(next).toBeEnabled();
    await next.click();

    // STEP 2 — [📝 명단만 만들기]로 48칸을 스텁에서 채운다 → Publish 활성.
    // LAB-UX-1에서 부품 버튼(fill-all-button)이 사라지고 결과물 2버튼이 됐다.
    // 이미지 경로를 쓰는 건 유튜브 search 콜을 한 번도 안 쓰기 때문이다 —
    // E2E가 프리뷰의 하루 100콜 버킷을 갉아먹으면 안 된다.
    await page.getByTestId("lab-generate-roster").click();
    await expect(page.getByTestId("contestant-grid")).toBeVisible();
    await expect(page.getByTestId("lab-step2-counter")).toContainText("48/48");
    const publish = page.getByRole("button", { name: /토너먼트 생성 \(48\/48\)/ });
    await expect(publish).toBeEnabled();
    await publish.click();

    // The new Tournament shows in the list.
    const row = page
      .locator('[data-testid^="tournament-row-"]')
      .filter({ hasText: "E2E Tournament" });
    await expect(row).toBeVisible();

    // Record the id for cleanup.
    const testId = await row.getAttribute("data-testid");
    const newId = testId?.replace("tournament-row-", "");
    if (newId) createdTournamentIds.push(newId);

    // AC#5 — "Arena에서 보기" links straight to /arena/{id}.
    if (newId) {
      await expect(row.getByTestId(`arena-link-${newId}`)).toHaveAttribute(
        "href",
        `/arena/${newId}`,
      );
    }

    // featured toggle → star fills.
    await row.getByRole("button", { name: /Feature/ }).click();
    await expect(row.getByRole("button", { name: /★ Featured/ })).toBeVisible();

    // delete → confirm → row gone.
    await row.getByRole("button", { name: "E2E Tournament 삭제" }).click();
    await row.getByRole("button", { name: "삭제 확인" }).click();
    await expect(row).toHaveCount(0);
  });
});
