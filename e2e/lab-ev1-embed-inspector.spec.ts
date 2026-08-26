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

/** STEP 1을 최소 입력으로 통과해 STEP 2(48칸 그리드)로 간다. */
async function goToStep2(page: Page) {
  await page.goto("/admin/lab?lang=ko"); // §7 — 한국어 셀렉터 정합
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
    await expect(page.getByTestId("slot-tuner-open-original")).toHaveAttribute(
      "href",
      new RegExp(`youtube\\.com/watch\\?v=${PASS_ID}`),
    );

    // 추천 칩을 누르면 루프 구간이 그 지점으로 옮겨간다 (1:30 → 90~100초).
    await page.getByTestId("slot-tuner-candidate-90").click();
    await expect(tuner).toContainText("90초 ~ 100초");

    await page.getByRole("button", { name: "완료" }).click();
    await expect(page.getByTestId("slot-video-tuner")).toHaveCount(0);
  });
});
