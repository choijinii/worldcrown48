/**
 * NAME-I18N-1 PR 2 — 엔트리 이름이 화면 언어를 따르고, 크라운 카드 안 이름은 영어다
 * (원장 D-61 · D-62 · 지시서 §6 E2E).
 *
 *   - 매치 무대: ?lang=en·es → 로마자 이름 · ?lang=ko → 한글 이름
 *   - 차트: 같은 규칙 (차트 캐시 행의 nameI18n)
 *   - 크라운 카드: ?lang=ko 에서도 카드 안 이름은 영어 · 카드 바깥 "Your Crown is …" 는 한글
 *
 * 엔트리 이름은 한글 `가수N` · 영어 `Singer N`. 대진은 Voter 마다 섞이므로(HF-2) 어떤 번호가
 * 나올지는 모른다 — 모양(한글/로마자)으로 확인한다. c2 워크플로에서 돈다(같은 시크릿 · 크라운 흐름).
 * CI 에서만 돈다(PREVIEW_URL + FIREBASE_ADMIN_SDK_KEY 필요). Console 오류 0.
 */
import { expect, test, type Page } from "@playwright/test";
import * as admin from "firebase-admin";
import { e2eMark } from "./e2eMark";

const TID = "name-i18n-e2e-tournament";
const UID = process.env.C2_TEST_UID ?? process.env.C1_TEST_UID ?? "";
const SEED_PAST_DATE = "2020-01-01"; // never counts toward daily-5 ([[feedback-seed-date-anti-pattern]])
const KO = /가수\d+/;
const EN = /Singer \d+/;

let consoleErrors: string[] = [];

function loadServiceAccount(): admin.ServiceAccount | null {
  const raw = process.env.FIREBASE_ADMIN_SDK_KEY;
  if (!raw) return null;
  const decoded = raw.trim().startsWith("{") ? raw : Buffer.from(raw, "base64").toString("utf8");
  return JSON.parse(decoded) as admin.ServiceAccount;
}
function db(): admin.firestore.Firestore {
  if (admin.apps.length === 0) {
    const sa = loadServiceAccount();
    if (!sa) throw new Error("FIREBASE_ADMIN_SDK_KEY required for NAME-I18N-1 E2E.");
    admin.initializeApp({ credential: admin.credential.cert(sa) });
  }
  return admin.firestore();
}
function matchId(round: number, i: number): string {
  return `${TID}:r${round}:m${i}`;
}
const cid = (i: number) => `${TID}_c${i}`;

async function seed(): Promise<void> {
  const d = db();
  const batch = d.batch();
  batch.set(d.doc(`tournaments/${TID}`), {
    title: "E2E Name Languages",
    category: "KPOP",
    status: "active",
    hostUid: "seed-operator",
    currentRound: 1,
    totalContestants: 48,
    // 마감 전이어야 무대가 열린다. 차트는 마감과 상관없이 열린다(D-30).
    tournamentDeadline: admin.firestore.Timestamp.fromMillis(Date.now() + 30 * 86_400_000),
    settings: { aiNews: false, multiLang: false, showRanking: true },
    featured: false,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    ...e2eMark(), // OPS-FIX-1 · D-66 — 실서비스 목록에서 빠지는 시험 표시
  });
  for (let i = 1; i <= 48; i++) {
    batch.set(d.doc(`contestants/${cid(i)}`), {
      tournamentId: TID,
      hostUid: "seed-operator",
      order: i,
      name: `가수${i}`,
      nameI18n: { ko: `가수${i}`, en: `Singer ${i}`, es: `Singer ${i}` },
      nationality: "KR",
      position: "",
      imageSearchKeyword: `singer ${i}`,
    });
  }
  // 차트 캐시 — 크론의 산출물 모양(rankingAggregator · nameI18n 복사본).
  batch.set(d.doc(`ranking_cache/${TID}`), {
    tournamentId: TID,
    rankings: [1, 2, 3].map((n) => ({
      rank: n,
      contestantId: cid(n),
      name: `가수${n}`,
      nameI18n: { ko: `가수${n}`, en: `Singer ${n}`, es: `Singer ${n}` },
      videoId: null,
      voteCount: 7,
      rate: 33,
      crownScore: 600 - n * 100,
    })),
    totalVotes: 21,
    runsTotal: 12,
    generationSequence: 1,
    generatedAt: admin.firestore.FieldValue.serverTimestamp(),
    previousGeneratedAt: null,
  });
  await batch.commit();
}

/** Rounds 1-4 complete (left-picks) → Voter is at THE FINAL (c2-crown-card-flow 와 같은 시드). */
async function seedToFinal(): Promise<void> {
  const d = db();
  const batch = d.batch();
  for (const [round, count] of [[1, 24], [2, 12], [3, 6], [4, 3]] as const) {
    for (let i = 0; i < count; i++) {
      batch.set(d.doc(`votes/${TID}_${UID}_r${round}_m${i}`), {
        userId: UID,
        tournamentId: TID,
        round,
        matchId: matchId(round, i),
        contestantId: cid(round === 1 ? i * 2 + 1 : i + 1),
        date: SEED_PAST_DATE,
        runIndex: 1,
        isGuest: false,
      });
    }
  }
  await batch.commit();
}

async function resetVoterProgress(): Promise<void> {
  const d = db();
  const snap = await d.collection("votes").where("userId", "==", UID).where("tournamentId", "==", TID).get();
  const batch = d.batch();
  snap.forEach((doc) => batch.delete(doc.ref));
  await batch.commit();
  await d.doc(`roundProgress/${UID}_${TID}`).delete().catch(() => {});
}

async function cleanup(): Promise<void> {
  const d = db();
  for (const coll of ["votes", "contestants", "roundProgress", "crown_cards"]) {
    const snap = await d.collection(coll).where("tournamentId", "==", TID).get();
    const batch = d.batch();
    snap.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
  }
  await d.doc(`bracket_seeds/${UID}_${TID}`).delete().catch(() => {});
  await d.doc(`ranking_cache/${TID}`).delete().catch(() => {});
  await d.doc(`tournaments/${TID}`).delete();
}

async function openStage(page: Page, lang: string) {
  await page.goto(`/arena/${TID}?lang=${lang}`);
  const names = page.getByTestId("stage-name");
  await expect(names.first()).toBeVisible({ timeout: 30_000 });
  return names;
}

test.describe("NAME-I18N-1 — 엔트리 이름 3언어 · 크라운 카드 영어 이름", () => {
  test.skip(!process.env.PREVIEW_URL, "PREVIEW_URL not set — NAME-I18N-1 E2E runs in CI only");

  test.beforeAll(async () => {
    await cleanup().catch(() => {});
    await seed();
  });
  test.afterAll(async () => cleanup());

  test.beforeEach(async ({ page }) => {
    // 첫 입장 안내 팝업이 칸 클릭을 가로채지 않게 "이미 본 기기"로 시작한다(ARENA-1 PR 2b).
    await page.addInitScript(() => {
      try {
        localStorage.setItem("wc48:arena:intro:v1", "1");
      } catch {
        /* 저장소가 막힌 환경 — 팝업은 애초에 뜨지 않는다 */
      }
    });
    await resetVoterProgress();
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

  for (const lang of ["en", "es"]) {
    test(`매치 무대 · 차트 — ?lang=${lang} 은 로마자 이름`, async ({ page }) => {
      const names = await openStage(page, lang);
      await expect(names).toHaveCount(2);
      for (const n of await names.all()) {
        await expect(n).toHaveText(EN);
      }
      await page.goto(`/arena/${TID}/ranking?lang=${lang}`);
      const rows = page.getByTestId("rank-row");
      await expect(rows).toHaveCount(3, { timeout: 30_000 });
      await expect(rows.first()).toContainText("Singer 1");
      await expect(page.getByTestId("rank-list")).not.toContainText("가수");
    });
  }

  test("매치 무대 · 차트 — ?lang=ko 는 한글 이름", async ({ page }) => {
    const names = await openStage(page, "ko");
    for (const n of await names.all()) {
      await expect(n).toHaveText(KO);
    }
    await page.goto(`/arena/${TID}/ranking?lang=ko`);
    const rows = page.getByTestId("rank-row");
    await expect(rows).toHaveCount(3, { timeout: 30_000 });
    await expect(rows.first()).toContainText("가수1");
    await expect(page.getByTestId("rank-list")).not.toContainText("Singer");
  });

  test("결승 → 크라운 카드 — ?lang=ko 에서도 카드 안 이름은 영어, 바깥 문구는 한글", async ({ page }) => {
    await seedToFinal();
    await page.goto(`/arena/${TID}?lang=ko`);
    await expect(page.getByTestId("final-stage")).toBeVisible({ timeout: 30_000 });
    // 결승 3칸도 한글 이름 (무대와 같은 부품).
    for (const n of await page.getByTestId("stage-name").all()) {
      await expect(n).toHaveText(KO);
    }
    await page.getByTestId("vote-left").click();

    const modal = page.getByTestId("crown-modal");
    await expect(modal).toBeVisible({ timeout: 60_000 });
    await expect(page.getByTestId("crown-card-name")).toHaveText(EN);
    await expect(modal).toContainText(/Your Crown is 가수\d+/);
  });
});
