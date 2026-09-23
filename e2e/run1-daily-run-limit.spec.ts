/**
 * 일일 판 한도 E2E — 이 Tournament에서 오늘 5판을 다 쓴 로그인 Voter (RUN-1 AC 1).
 *
 * ⚠️ 이 스펙은 2026-09-09에 **규칙이 바뀌어** 다시 쓰였다. 이전 시나리오는 HF-1의
 * "하루 새 Tournament 5개"(`daily_participation`)를 검사했는데, 그 정의는 v2.0에서
 * **폐기**됐고 LANGUAGE.md §7 금지어다. 세는 단위는 이제 **판(Run)** 이고 한도는
 * **대회당 하루 5판**이다.
 *
 * 검사 방식도 바뀔 수밖에 없었다. 옛 규칙에서는 "6번째 대회에서 첫 선택" 이 차단 지점이라
 * 매치 화면에서 클릭해 모달을 띄웠다. v2.0/v2.1에서 5판을 다 쓴 팬이 보는 것은 매치가
 * 아니라 **완주 화면**이다 — 차단은 [다시 참여] 버튼의 비활성과 그 아래 안내로 나타난다
 * (완주 화면을 차단 화면으로 갈아치우지 않는 것이 설계다: 팬이 방금 만든 Crown Card를
 * 계속 볼 수 있어야 한다).
 *
 * 그래서 `tournament_runs/{uid}_{tid}` 를 5/5로, 5회차 `roundProgress` 를 완주 상태로
 * 시드한 뒤 완주 화면의 승인 문구(§8)와 버튼 비활성을 확인한다.
 *
 * REQUIRES FIREBASE_ADMIN_SDK_KEY + TEST_UID + PREVIEW_URL.
 * console-error-0; test.skip when the preview/secrets are absent.
 */
import { expect, test } from "@playwright/test";
import * as admin from "firebase-admin";

const TID = "run1-daily-limit-e2e-tournament";
/** 일일 판 한도 (lib/run/decideRun.ts DAILY_RUN_LIMIT 과 같은 값). */
const DAILY_RUN_LIMIT = 5;

let consoleErrors: string[] = [];

/** KST day (YYYY-MM-DD) — must match the server's kstDate() doc-id scheme. */
function kstToday(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function loadServiceAccount(): admin.ServiceAccount | null {
  const raw = process.env.FIREBASE_ADMIN_SDK_KEY;
  if (!raw) return null;
  const decoded = raw.trim().startsWith("{")
    ? raw
    : Buffer.from(raw, "base64").toString("utf8");
  return JSON.parse(decoded) as admin.ServiceAccount;
}
function db(): admin.firestore.Firestore {
  if (admin.apps.length === 0) {
    const sa = loadServiceAccount();
    if (!sa) throw new Error("FIREBASE_ADMIN_SDK_KEY required for the daily-run-limit E2E.");
    admin.initializeApp({ credential: admin.credential.cert(sa) });
  }
  return admin.firestore();
}

async function seed(uid: string): Promise<void> {
  const d = db();
  const batch = d.batch();
  batch.set(d.doc(`tournaments/${TID}`), {
    title: "Daily Run Limit Strikers",
    category: "FOOTBALL",
    status: "active",
    hostUid: "seed-operator",
    currentRound: 1,
    totalContestants: 48,
    settings: { aiNews: false, multiLang: false, showRanking: true },
    featured: false,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  for (let i = 1; i <= 48; i++) {
    batch.set(d.doc(`contestants/${TID}_c${i}`), {
      tournamentId: TID,
      hostUid: "seed-operator",
      order: i,
      name: `P${i}`,
      nationality: "KR",
      position: "FW",
      imageSearchKeyword: `p${i}`,
    });
  }
  // 이 Tournament에서 오늘 5판을 이미 썼다 → 한도 소진.
  batch.set(d.doc(`tournament_runs/${uid}_${TID}`), {
    runIndex: DAILY_RUN_LIMIT,
    runsToday: DAILY_RUN_LIMIT,
    lastRunDate: kstToday(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  // 5회차가 완주 상태여야 완주 화면이 뜬다. 회차 2 이상은 문서 id에 `_r{n}` 이 붙는다
  // (§3.0 B안 — 1회차만 접미사가 없다).
  batch.set(d.doc(`roundProgress/${uid}_${TID}_r${DAILY_RUN_LIMIT}`), {
    userId: uid,
    tournamentId: TID,
    runIndex: DAILY_RUN_LIMIT,
    complete: true,
    championId: `${TID}_c1`,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  await batch.commit();
}

async function cleanup(uid: string): Promise<void> {
  const d = db();
  // 판 상태 전체를 앞뒤로 지운다 (테스트 격리 — ADR-0004).
  for (const coll of ["votes", "contestants", "roundProgress"]) {
    const snap = await d.collection(coll).where("tournamentId", "==", TID).get();
    const batch = d.batch();
    snap.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
  }
  await d.doc(`tournament_runs/${uid}_${TID}`).delete().catch(() => {});
  for (let r = 1; r <= DAILY_RUN_LIMIT; r++) {
    const suffix = r === 1 ? "" : `_r${r}`;
    await d.doc(`roundProgress/${uid}_${TID}${suffix}`).delete().catch(() => {});
    await d.doc(`bracket_seeds/${uid}_${TID}${suffix}`).delete().catch(() => {});
    await d.doc(`crown_cards/${uid}_${TID}${suffix}`).delete().catch(() => {});
  }
  await d.doc(`tournaments/${TID}`).delete();
}

test.describe("RUN-1 일일 판 한도 — 5판 소진 후 [다시 참여] 차단", () => {
  const uid = process.env.TEST_UID;
  test.skip(
    !process.env.PREVIEW_URL || !uid,
    "PREVIEW_URL / TEST_UID not set — 일일 판 한도 E2E는 시크릿 설정 전까지 보류",
  );

  test.beforeAll(async () => {
    await cleanup(uid!).catch(() => {});
    await seed(uid!);
  });
  test.afterAll(async () => cleanup(uid!));

  test.beforeEach(async ({ page }) => {
    // ARENA-1 PR 2b — 첫 입장 안내 팝업이 칸 클릭을 가로채지 않게 "이미 본 기기"로 시작한다.
    await page.addInitScript(() => {
      try {
        localStorage.setItem("wc48:arena:intro:v1", "1");
      } catch {
        /* 저장소가 막힌 환경 — 그 경우 팝업은 애초에 뜨지 않는다 */
      }
    });
    consoleErrors = [];
    page.on("console", (m) => {
      if (m.type() !== "error") return;
      const t = m.text();
      if (t.includes("Could not reach Cloud Firestore backend")) return;
      consoleErrors.push(t);
    });
  });
  test.afterEach(async () => {
    expect(consoleErrors, "Console errors must be 0").toHaveLength(0);
  });

  test("5판을 소진한 Voter의 완주 화면 — [다시 참여] 비활성 + 승인 문구 (AC 1)", async ({
    page,
  }) => {
    // ko 로 고정해 §8 승인 문구를 글자 그대로 확인한다.
    // (앱 i18n 기본은 EN이고 headless Chromium은 en-US를 보고한다 — ADR-0002 trap a.)
    await page.goto(`/arena/${TID}?lang=ko`);

    // 5판을 다 썼어도 완주 화면은 남는다 — 차단 화면으로 갈아치우지 않는다.
    // 팬이 방금 만든 Crown Card를 계속 볼 수 있어야 하기 때문이다.
    await expect(page.getByTestId("crown-modal")).toBeVisible();

    // [다시 참여 (5/5)] 가 비활성이다.
    const playAgain = page.getByRole("button", { name: /다시 참여/ });
    await expect(playAgain).toBeVisible();
    await expect(playAgain).toBeDisabled();

    // §8 승인 문구 — 막고 나서 길을 열어준다(다른 Tournament로).
    await expect(
      page.getByText("이 Tournament는 오늘 5번 참여를 모두 하셨어요 (5/5)"),
    ).toBeVisible();
    await expect(
      page.getByText(
        "한국 시간 자정에 참여 횟수가 다시 채워져요. 다른 Tournament는 지금 바로 참여하실 수 있어요.",
      ),
    ).toBeVisible();

    // 폐기된 HF-1 문구가 남아 있지 않다 (LANGUAGE.md §7 금지 정의).
    await expect(
      page.getByText(/오늘 참가할 수 있는 Tournament를 모두 사용했어요/),
    ).toHaveCount(0);
  });
});
