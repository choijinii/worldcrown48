/**
 * LAB-EV-1 유튜브 임베드 검수기 E2E (§7 · §14-C).
 *
 * 흐름: /admin/lab 직접 진입 → STEP 1 통과 → [🎬 유튜브 검수기] → 규모 탭 →
 * 링크 붙여넣기 → [검수 및 자동 채우기] → 결과 리스트(초록/노랑/빨강) →
 * 통과분 슬롯 자동 주입 → 슬롯 미세조정 열기.
 *
 * validateYouTubeLinks / recommendKillingPart / extractContestantsFromVideos는
 * page.route로 STUB한다 —
 * B-1이 Claude 토큰을 안 쓰는 것과 같은 이유로, CI가 유튜브 API 쿼터를 태우거나
 * 남의 영상 상태 변화에 흔들려서는 안 된다(§8 쿼터 방어의 연장).
 * Firestore 쓰기는 일어나지 않는다 — 발행 전 단계까지만 본다.
 *
 * 인증: global-setup이 운영자 계정 storageState를 만든다. 프리뷰의
 * NEXT_PUBLIC_ADMIN_UID가 그 uid여야 AdminAuthGuard를 통과한다.
 */
import { expect, test, type Page } from "@playwright/test";
import { deleteE2EDrafts, openFreshLabEditor, seedE2EDraft } from "./labDrafts";
import { stubManageTournament } from "./labManage";

const PASS_ID = "9bZkp7q19f0";
const WARN_ID = "dQw4w9WgXcQ";
const BLOCKED_ID = "aaaaaaaaaaa";

let consoleErrors: string[] = [];

function verdict(videoId: string, status: "pass" | "warn" | "blocked") {
  return {
    videoId,
    exists: status !== "blocked",
    embeddable: status !== "blocked",
    regionBlockedIn: status === "warn" ? ["KR"] : [],
    regionAllowedOnly: [],
    ageRestricted: false,
    isLive: false,
    durationSec: 232,
    title: `E2E ${videoId}`,
    channelTitle: "E2E channel",
    thumbnailUrl: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
    status,
    reasons: status === "blocked" ? ["not-embeddable"] : status === "warn" ? ["region-blocked"] : [],
  };
}

/** 검수·추출 콜러블 3종을 stub — 실제 쿼터를 태우지 않는다. */
async function stubInspector(page: Page) {
  // LAB-UX-1 ③ — 제목에서 인물을 읽는 콜러블. 스텁하지 않으면 CI가 (a) 매 실행마다
  // 진짜 Haiku 콜과 일일 캡을 태우고 (b) **아직 배포되지 않은 함수**를 불러
  // 브라우저가 CORS 오류를 콘솔에 찍는다 — afterEach의 "콘솔 오류 0"에 걸린다.
  // 확신한 것과 못 한 것을 하나씩 돌려 두 갈래(제안 / 수동 필요)를 모두 태운다.
  await page.route("**/extractContestantsFromVideos*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        result: {
          extractions: [
            {
              videoId: PASS_ID,
              name: "카리나",
              affiliation: "aespa",
              nationality: "KR",
              confident: true,
            },
            {
              videoId: WARN_ID,
              name: "",
              affiliation: "",
              nationality: "",
              confident: false,
            },
          ],
        },
      }),
    });
  });

  await page.route("**/validateYouTubeLinks*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      // onCall v2 wire format: SDK는 최상위 `result`를 읽는다.
      body: JSON.stringify({
        result: {
          verdicts: [
            verdict(PASS_ID, "pass"),
            verdict(WARN_ID, "warn"),
            verdict(BLOCKED_ID, "blocked"),
          ],
          apiCalls: 1,
        },
      }),
    });
  });

  await page.route("**/recommendKillingPart*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        result: {
          videoId: PASS_ID,
          durationSec: 232,
          source: "comments",
          commentsAvailable: true,
          candidates: [
            { startSec: 90, source: "comments", mentions: 12, confidence: 1 },
            { startSec: 60, source: "heuristic", mentions: 0, confidence: 0.2 },
          ],
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

// EDITOR-FIX-1 — 이 spec 이 친 내용은 자동 저장으로 초안이 된다(발행은 안 한다).
test.afterAll(async () => {
  await deleteE2EDrafts(["LAB-EV-1 E2E", FIX2_TITLE]);
});

/** STEP 1을 최소 입력으로 통과해 STEP 2(48칸 그리드)로 간다. */
async function goToStep2(page: Page) {
  await openFreshLabEditor(page); // §7 ?lang=ko · 초안 목록이 뜨면 [새로 시작]
  await page.getByLabel("Tournament 제목").fill("LAB-EV-1 E2E");
  await page.getByLabel("카테고리").selectOption("FOOTBALL");
  await page.getByLabel("키워드 추가").fill("embed-e2e");
  await page.getByLabel("키워드 추가").press("Enter");
  const next = page.getByTestId("lab-next-button");
  await expect(next).toBeEnabled();
  await next.click();
  await expect(page.getByTestId("contestant-grid")).toBeVisible();
  // LAB-UX-1: 검수기는 "직접 손보기 도구" 안으로 접혀 들어갔다(결정 1 · B안).
  // 기본이 접힘이라 열어야 버튼이 보인다.
  await page.getByTestId("lab-manual-tools-toggle").click();
  await expect(page.getByTestId("lab-manual-tools")).toBeVisible();
}

test.describe("LAB-EV-1 — 유튜브 임베드 검수기", () => {
  test.skip(
    !process.env.PREVIEW_URL,
    "PREVIEW_URL not set — 프리뷰 없이는 /admin/lab에 갈 수 없다",
  );

  test("검수기 모달: 규모 탭 · 행 단위 오류 · 정원 초과", async ({ page }) => {
    await stubInspector(page);
    await goToStep2(page);

    await page.getByTestId("lab-open-embed-inspector").click();
    const modal = page.getByTestId("embed-inspector");
    await expect(modal).toBeVisible();

    // 규모 탭은 BRACKET_SIZES 단일 소스 — 48·24·12가 모두 있어야 한다 (ADR-EV-6).
    for (const n of [48, 24, 12]) {
      await expect(page.getByTestId(`embed-size-${n}`)).toBeVisible();
    }

    // 깨진 줄은 그 줄만 떨어진다 — 전체 거부가 아니다 (§8).
    await page.getByTestId("embed-inspector-input").fill(
      [
        `https://youtu.be/${PASS_ID}`,
        "이건 링크가 아니다",
        `https://www.youtube.com/watch?v=${WARN_ID}`,
        `https://youtu.be/${PASS_ID}`, // 중복
      ].join("\n"),
    );
    await expect(page.getByTestId("embed-row-2")).toHaveAttribute("data-status", "blocked");
    await expect(page.getByTestId("embed-row-2")).toContainText("링크가 아닙니다");
    await expect(page.getByTestId("embed-row-4")).toContainText("1번 링크와 중복");

    // 규모 12로 줄이면 정원 계산이 N을 따라간다.
    await page.getByTestId("embed-size-12").click();
    await expect(modal).toContainText("/12줄");
  });

  test("검수 → 3색 판정 → 통과·경고분만 슬롯 주입 → 미세조정", async ({ page }) => {
    await stubInspector(page);
    await goToStep2(page);

    await page.getByTestId("lab-open-embed-inspector").click();
    await page.getByTestId("embed-inspector-input").fill(
      [
        `https://youtu.be/${PASS_ID}`,
        `https://www.youtube.com/watch?v=${WARN_ID}`,
        `https://www.youtube.com/watch?v=${BLOCKED_ID}`,
      ].join("\n"),
    );

    // 클릭 한 번이 검증 + 주입을 동시에 한다 (AC#1 — 클릭 3회 이내).
    await page.getByTestId("embed-inspector-validate").click();

    await expect(page.getByTestId("embed-row-1")).toHaveAttribute("data-status", "pass");
    await expect(page.getByTestId("embed-row-2")).toHaveAttribute("data-status", "warn");
    await expect(page.getByTestId("embed-row-2")).toContainText("지역 차단: KR");
    await expect(page.getByTestId("embed-row-3")).toHaveAttribute("data-status", "blocked");
    await expect(page.getByTestId("embed-row-3")).toContainText("외부 재생 불가");

    await page.getByRole("button", { name: "닫기" }).click();
    await expect(page.getByTestId("embed-inspector")).toHaveCount(0);

    // 통과·경고 2개만 슬롯 1·2에 들어간다. 차단은 슬롯을 차지하지 않는다.
    await expect(page.getByTestId("contestant-tune-0")).toBeVisible();
    await expect(page.getByTestId("contestant-tune-1")).toBeVisible();

    // YT-FIX-1 (개발자 정책 III.C.1) — 재생을 시작하는 썸네일은 120×70 이상. 1440 폭에서 잰다.
    await page.setViewportSize({ width: 1440, height: 900 });
    const card = await page.getByTestId("contestant-pick-0").boundingBox();
    expect(card?.width ?? 0).toBeGreaterThanOrEqual(120);
    expect(card?.height ?? 0).toBeGreaterThanOrEqual(70);
    await expect(page.getByTestId("contestant-tune-2")).toHaveCount(0);

    // ③ — 확신한 칸은 이름까지 채워지고 "제안", 확신 못 한 칸은 이름이 빈 채
    // "수동 필요"로 남는다. 지어낸 이름이 들어가지 않는다는 계약이다.
    await expect(page.getByLabel("Contestant 1 이름")).toHaveValue("카리나");
    await expect(page.getByLabel("Contestant 1 소속")).toHaveValue("aespa");
    await expect(page.getByTestId("contestant-sourcing-0")).toHaveAttribute(
      "data-sourcing-status",
      "suggested",
    );
    await expect(page.getByLabel("Contestant 2 이름")).toHaveValue("");
    await expect(page.getByTestId("contestant-sourcing-1")).toHaveAttribute(
      "data-sourcing-status",
      "manual",
    );

    // W5 — 슬롯 미세조정: 추천 칩·[원본 열기]·슬라이더.
    await page.getByTestId("contestant-tune-0").click();
    const tuner = page.getByTestId("slot-video-tuner");
    await expect(tuner).toBeVisible();
    // YT-FIX-1 (D-76 · 정책 III.C.1) — 자르지 않은 플레이어 480×270 이상.
    const player = await page.getByTestId("slot-tuner-player").boundingBox();
    expect(player?.width ?? 0).toBeGreaterThanOrEqual(480);
    expect(player?.height ?? 0).toBeGreaterThanOrEqual(270);
    await expect(page.getByTestId("slot-tuner-open-original")).toHaveAttribute(
      "href",
      new RegExp(`youtube\\.com/watch\\?v=${PASS_ID}`),
    );

    // 추천 칩을 누르면 루프 구간이 그 지점으로 옮겨간다 (1:30 → 90~105초 · 루프 15초, 원장 D-12).
    await page.getByTestId("slot-tuner-candidate-90").click();
    await expect(tuner).toContainText("90초 ~ 105초");

    await page.getByRole("button", { name: "완료" }).click();
    await expect(page.getByTestId("slot-video-tuner")).toHaveCount(0);
  });
});

/**
 * LAB-FIX-2 — 편집기 '직접 손보기' 고장 수리(지시서 §5 재현 2·3·4·5·6).
 *
 * 팀 단위 초안(칸 1~46 이름·영상 · 47·48 비어 있음)을 관리자 SDK로 심고 [이어서 만들기]로 연다.
 * 검수·추출 콜러블은 스텁 — 추출 스텁은 받은 요청을 기억해 엔트리 단위가 넘어오는지 본다.
 */
const FIX2_TITLE = "LAB-FIX-2 E2E";
const STRAY_ID = "9bZkp7q19f0"; // 47번 칸에 들어갈 링크
const BABY_ID = "kJQP7kiw5Fk"; // 48번 칸 — BABYMONSTER M/V 자리
const SEED_VIDEO = "dQw4w9WgXcQ";
const RELEASED_TOAST = "이름이 바뀌어 이전 인물의 영상·검색어를 뗐어요.";

async function seedTeamDraft(): Promise<void> {
  await deleteE2EDrafts([FIX2_TITLE]);
  const contestants = Array.from({ length: 48 }, (_, i) => {
    if (i >= 46) return { name: "", nationality: "", affiliation: "", imageSearchKeyword: "" };
    const name = i === 0 ? "방탄소년단" : `E2E 팀 ${i + 1}`;
    // 1번 칸은 불일치 판정 재료(소속 · 채널)가 새 이름(세븐틴)과 겹치지 않게 실제 같은 값으로 둔다 —
    // 소속이 채널 글자 안에 있으면 판정이 "일치"로 본다.
    return {
      name,
      nationality: "KR",
      affiliation: i === 0 ? "BIGHIT MUSIC" : "E2E",
      imageSearchKeyword: i === 0 ? "BTS stage" : "",
      videoId: SEED_VIDEO,
      videoTitle: `${name} 무대`,
      videoChannel: i === 0 ? "HYBE LABELS" : "E2E 채널",
    };
  });
  const ok = await seedE2EDraft({
    schemaVersion: 1,
    step: 2,
    title: FIX2_TITLE,
    category: "",
    description: "",
    keywords: [],
    campaignSlug: "",
    deadlineMs: 0,
    contestants,
    thumbnailPair: { a: null, b: null, aPos: null, bPos: null, next: "a" },
    entryUnit: "group",
  });
  expect(ok, "관리자 키·TEST_UID 가 있어야 초안을 심는다").toBe(true);
}

async function openSeededTeamDraft(page: Page): Promise<void> {
  await stubManageTournament(page);
  await page.goto("/admin/lab?lang=ko");
  const row = page.getByTestId("draft-row").filter({ hasText: FIX2_TITLE });
  await expect(row).toHaveCount(1);
  await row.getByTestId("draft-open").click();
  await expect(page.getByTestId("contestant-grid")).toBeVisible();
}

/** 검수 스텁: 받은 id 를 전부 통과 · 추출 스텁: 받은 요청을 `seen` 에 남긴다. */
async function stubFix2Inspector(page: Page, seen: { extract: Record<string, unknown>[] }) {
  await page.route("**/validateYouTubeLinks*", async (route) => {
    const ids = ((route.request().postDataJSON()?.data?.videoIds ?? []) as string[]);
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ result: { verdicts: ids.map((id) => verdict(id, "pass")), apiCalls: 1 } }),
    });
  });
  await page.route("**/extractContestantsFromVideos*", async (route) => {
    const data = (route.request().postDataJSON()?.data ?? {}) as Record<string, unknown>;
    seen.extract.push(data);
    const table: Record<string, object> = {
      // 이름을 못 읽었지만 소속·국가는 읽은 결과 — 이름 칸에 운영자가 쓴 값이 있다.
      [STRAY_ID]: { name: "", affiliation: "JYP Entertainment", nationality: "KR", confident: false },
      [BABY_ID]: { name: "베이비몬스터", affiliation: "YG Entertainment", nationality: "KR", confident: true },
    };
    const items = (data.items ?? []) as { videoId: string }[];
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        result: {
          extractions: items.map((it) => ({
            videoId: it.videoId,
            ...(table[it.videoId] ?? { name: "", affiliation: "", nationality: "", confident: false }),
          })),
        },
      }),
    });
  });
}

async function runInspector(page: Page, links: string[]): Promise<void> {
  // 도구 줄은 접기 버튼 하나로 열고 닫는다 — 이미 열려 있으면 누르지 않는다(두 번째 검수).
  if (!(await page.getByTestId("lab-open-embed-inspector").isVisible())) {
    await page.getByTestId("lab-manual-tools-toggle").click();
  }
  await page.getByTestId("lab-open-embed-inspector").click();
  await expect(page.getByTestId("embed-inspector")).toBeVisible();
  await page.getByTestId("embed-inspector-input").fill(links.join("\n"));
}

test.describe("LAB-FIX-2 — 직접 손보기 수리", () => {
  test.skip(!process.env.PREVIEW_URL, "PREVIEW_URL not set — 프리뷰 없이는 /admin/lab에 갈 수 없다");

  test("빈칸 = 영상 없는 칸 · 추출 AI 에 엔트리 단위 · 이름 쓴 칸 보존 · 다시 넣어도 덮지 않음", async ({ page }) => {
    const seen = { extract: [] as Record<string, unknown>[] };
    await seedTeamDraft();
    await stubFix2Inspector(page, seen);
    await openSeededTeamDraft(page);

    // §5-2 — 47번 이름 칸에 먼저 이름을 쓴다(영상 없음).
    const name47 = page.getByLabel("Contestant 47 이름");
    await name47.fill("스트레이 키");
    await name47.blur();

    await runInspector(page, [`https://youtu.be/${STRAY_ID}`, `https://youtu.be/${BABY_ID}`]);
    // 빈칸 = 영상이 없는 47·48 두 칸(이름 유무와 상관없이).
    await expect(page.getByTestId("embed-inspector")).toContainText("빈칸 2개");
    await page.getByTestId("embed-inspector-validate").click();
    await expect(page.getByTestId("embed-row-2")).toHaveAttribute("data-status", "pass");
    await test.info().attach("fix2-inspector", { body: await page.screenshot(), contentType: "image/png" });
    await page.getByRole("button", { name: "닫기" }).click();

    // §5-3 — 추출 요청에 엔트리 단위(팀)가 실린다.
    expect(seen.extract.at(-1)?.entryUnit).toBe("group");

    // 47번: 영상 들어감 · 운영자가 쓴 이름 그대로 · 읽어 둔 소속은 채움 · 배지 없음
    await expect(page.getByTestId("contestant-tune-46")).toBeVisible();
    await expect(name47).toHaveValue("스트레이 키");
    await expect(page.getByLabel("Contestant 47 소속")).toHaveValue("JYP Entertainment");
    await expect(page.getByTestId("contestant-sourcing-46")).toHaveCount(0);
    // 48번: 이름 · 소속 · 국가 · 배지 "제안"
    await expect(page.getByTestId("contestant-tune-47")).toBeVisible();
    await expect(page.getByLabel("Contestant 48 이름")).toHaveValue("베이비몬스터");
    await expect(page.getByLabel("Contestant 48 소속")).toHaveValue("YG Entertainment");
    await expect(page.getByLabel("Contestant 48 국가")).toHaveValue("KR");
    await expect(page.getByTestId("contestant-sourcing-47")).toHaveAttribute("data-sourcing-status", "suggested");
    await page.getByTestId("contestant-node-46").scrollIntoViewIfNeeded();
    await test.info().attach("fix2-slots-47-48", { body: await page.screenshot(), contentType: "image/png" });

    // §5-6 — 같은 링크를 다시 넣어도 영상 있는 칸은 빈칸이 아니다 → 0개 · 덮지 않음.
    await runInspector(page, [`https://youtu.be/${STRAY_ID}`]);
    await expect(page.getByTestId("embed-inspector")).toContainText("빈칸 0개");
    await page.getByRole("button", { name: "닫기" }).click();
    await expect(page.getByLabel("Contestant 48 이름")).toHaveValue("베이비몬스터");
  });

  test("이름을 고쳐도 영상은 그대로 · 불일치 배지만 · 영상 빼기는 직접", async ({ page }) => {
    await seedTeamDraft();
    await openSeededTeamDraft(page);

    // §5-5 — 오타 → 바로잡기, 커서를 넣었다 빼기 여러 번.
    const name1 = page.getByLabel("Contestant 1 이름");
    await name1.fill("방탄소년닫");
    await name1.blur();
    await name1.fill("방탄소년단");
    for (let k = 0; k < 3; k++) {
      await name1.focus();
      await name1.blur();
    }
    await expect(page.getByTestId("contestant-tune-0")).toBeVisible();
    await expect(page.getByText(RELEASED_TOAST)).toHaveCount(0);

    // 다른 인물로 바꿔도 영상은 남고, 불일치 배지가 켜진다.
    await name1.fill("세븐틴");
    await name1.blur();
    await expect(page.getByTestId("contestant-tune-0")).toBeVisible();
    await expect(
      page.getByTestId("contestant-node-0").locator('[data-review-flag="name-video-mismatch"]'),
    ).toBeVisible();
    await expect(page.getByText(RELEASED_TOAST)).toHaveCount(0);

    // §5-4 — 영상만 있는 칸에 한 글자씩 이름 치기.
    const name2 = page.getByLabel("Contestant 2 이름");
    await name2.fill("");
    await name2.pressSequentially("베이비몬스터");
    await name2.blur();
    await expect(page.getByTestId("contestant-tune-1")).toBeVisible();
    await expect(page.getByText(RELEASED_TOAST)).toHaveCount(0);
    await page.getByTestId("contestant-node-0").scrollIntoViewIfNeeded();
    await test.info().attach("fix2-rename-keeps-video", { body: await page.screenshot(), contentType: "image/png" });

    // 영상 빼기는 운영자가 직접 누를 때만.
    await page.getByTestId("contestant-tune-0").click();
    await page.getByTestId("slot-tuner-remove").click();
    await expect(page.getByTestId("contestant-tune-0")).toHaveCount(0);
    await expect(name1).toHaveValue("세븐틴");
  });
});
