/**
 * ARENA-2 PR 3 E2E — 대회 삭제 · 조기 마감 · 숨김이 팬 화면에 닿는 모양 (원장 D-86).
 *
 * 관리자 함수 manageTournament 는 병합 뒤에 배포되므로, 미리보기 시험은 그 함수가 부르는 **같은 저장 코드**
 * (functions/src/core/tournamentAdminStore)를 admin SDK 로 직접 돌리고 팬 화면을 본다. Lab 버튼 → 함수
 * 배선은 b1-admin-lab 이 본다(함수 응답만 가로채고 저장은 같은 코드).
 *
 *   ① 숨김 — 매치 무대 · 차트 = "찾을 수 없어요" · 아레나 홈 진행 중 목록에서 빠짐 → 다시 보이기 = 돌아옴
 *   ② 조기 마감 — 진행 중 목록에서 빠짐 · 새로 들어온 팬 = 기존 "마감됐어요" 안내 · 상태는 active 그대로
 *   ③ 참여 0명 삭제 — 대회 · 엔트리가 사라지고 무대 = "찾을 수 없어요"
 *   ④ 선택 1건(게스트)이 있으면 삭제가 막히고 아무것도 지우지 않는다
 *
 * 진행 중인 팬이 조기 마감 뒤에도 끝까지 가는 것(원칙 ④)은 서버·화면이 같이 쓰는 decideRun ①이 정하고
 * 유닛(decideRun)과 에뮬레이터 시험(상태 active 그대로 · 팬이 대회를 읽음)이 본다.
 * `?lang=ko` 로 언어를 고정한다.
 */
import { readFileSync } from "node:fs";
import { expect, test, type BrowserContextOptions, type ConsoleMessage, type Page } from "@playwright/test";
import * as admin from "firebase-admin";
import { e2eMark } from "./e2eMark";
import {
  TournamentAdminError,
  closeTournamentEarly,
  removeTournament,
  setTournamentVisibility,
} from "../functions/src/core/tournamentAdminStore";

const RUN = `r${Date.now().toString(36)}`;
const DESKTOP = { width: 1440, height: 900 };
const DAY = 86_400_000;
const NOT_FOUND = "Tournament를 찾을 수 없어요.";
const DEADLINE_PASSED = "이 Tournament는 마감됐어요.";

const IGNORED_CONSOLE = [
  /Failed to load resource/i,
  /GSI_LOGGER/i,
  /\bFedCM\b/i,
  /accounts list is empty/i,
  /identitytoolkit/i,
  /status of (401|403|429)/i,
  /Could not reach Cloud Firestore backend/i,
  /Failed to fetch RSC payload/i,
  // 숨긴 대회는 규칙이 읽기를 거절한다 — 화면은 그 거절을 "찾을 수 없어요"로 보인다(그게 이 시험이 보는 것).
  /Missing or insufficient permissions/i,
];

type StorageState = NonNullable<Exclude<BrowserContextOptions["storageState"], string>>;

/**
 * 로그인하지 않은 팬 — 미리보기 통과 쿠키(Vercel)는 남기고 Firebase 로그인(origins)만 비운다
 * (gutter20 · nav1 스펙과 같은 방식).
 */
function signedOutState(): StorageState {
  try {
    const saved = JSON.parse(readFileSync("tests/.auth/user.json", "utf8")) as Partial<StorageState>;
    return { cookies: saved.cookies ?? [], origins: [] };
  } catch {
    return { cookies: [], origins: [] };
  }
}

let consoleErrors: string[] = [];
const seeded = { tournaments: [] as string[], contestants: [] as string[], votes: [] as string[] };

function ensureAdmin(): typeof admin | null {
  if (admin.apps.length > 0) return admin;
  const raw = process.env.FIREBASE_ADMIN_SDK_KEY;
  if (!raw) return null;
  const json = raw.trim().startsWith("{") ? raw : Buffer.from(raw, "base64").toString("utf8");
  admin.initializeApp({ credential: admin.credential.cert(JSON.parse(json) as admin.ServiceAccount) });
  return admin;
}

const db = () => ensureAdmin()!.firestore();
const values = {
  timestamp: (ms: number) => admin.firestore.Timestamp.fromMillis(ms),
  deleteField: () => admin.firestore.FieldValue.delete(),
};
const noFiles = { deletePrefix: async () => undefined };
const actor = process.env.TEST_UID ?? "e2e";

/** 진행 중 대회 하나 + 엔트리 48명. */
async function seedTournament(label: string): Promise<{ id: string; title: string }> {
  const fs = db();
  const now = Date.now();
  const ref = fs.collection("tournaments").doc();
  const title = `관리 ${label} ${RUN}`;
  const batch = fs.batch();
  batch.set(ref, {
    title,
    titleI18n: { ko: title, en: `Admin ${label} ${RUN}`, es: `Admin ${label} ${RUN}` },
    description: { ko: "", en: "", es: "" },
    category: "KPOP",
    status: "active",
    ...e2eMark(), // OPS-FIX-1 · D-66
    featured: false,
    hostUid: actor,
    totalContestants: 48,
    currentRound: 1,
    createdAt: admin.firestore.Timestamp.fromMillis(now),
    tournamentDeadline: admin.firestore.Timestamp.fromMillis(now + 7 * DAY),
  });
  for (let i = 1; i <= 48; i++) {
    const c = fs.collection("contestants").doc();
    seeded.contestants.push(c.id);
    batch.set(c, { tournamentId: ref.id, hostUid: actor, order: i, name: `엔트리${i}`, nameI18n: { ko: `엔트리${i}`, en: `Entry${i}`, es: `Entry${i}` } });
  }
  await batch.commit();
  seeded.tournaments.push(ref.id);
  return { id: ref.id, title };
}

async function unseed(): Promise<void> {
  if (!ensureAdmin()) return;
  const fs = db();
  const writer = fs.bulkWriter();
  for (const id of seeded.contestants) void writer.delete(fs.collection("contestants").doc(id));
  for (const id of seeded.tournaments) void writer.delete(fs.collection("tournaments").doc(id));
  for (const id of seeded.votes) void writer.delete(fs.collection("votes").doc(id));
  await writer.close();
}

async function prime(page: Page, baseURL: string | undefined) {
  const savedAt = Date.now() - DAY;
  await page.context().addCookies([{ name: "wc48_consent", value: `1.0.${savedAt}`, url: baseURL ?? "http://localhost:3000" }]);
  await page.addInitScript(() => {
    try {
      localStorage.setItem("wc48:arena:intro:v1", "1");
    } catch {
      /* 저장소가 막힌 창 — 안내창이 떠도 아래 글자는 보인다 */
    }
  });
}

/** 아레나 홈 진행 중 목록에 그 대회 줄이 있는가 — "더 보기"를 끝까지 펼쳐 본다. */
async function activeRowCount(page: Page, id: string): Promise<number> {
  await page.goto("/arena?lang=ko");
  await expect(page.getByTestId("arena-home")).toBeVisible();
  for (let i = 0; i < 20; i++) {
    const more = page.getByTestId("arena-active-more");
    if ((await more.count()) === 0) break;
    await more.click();
  }
  return page.locator(`[data-testid='arena-active-row'][data-tid='${id}']`).count();
}

test.beforeEach(({ page }) => {
  consoleErrors = [];
  page.on("console", (m: ConsoleMessage) => {
    if (m.type() !== "error") return;
    const text = m.text();
    if (IGNORED_CONSOLE.some((re) => re.test(text))) return;
    consoleErrors.push(text);
  });
  page.on("pageerror", (e) => consoleErrors.push(`pageerror: ${e.message}`));
});

test.afterEach(() => {
  expect(consoleErrors, `Console errors:\n${consoleErrors.join("\n")}`).toHaveLength(0);
});

test.describe("ARENA-2 PR 3 — 삭제 · 조기 마감 · 숨김 (D-86)", () => {
  test.skip(!process.env.PREVIEW_URL, "PREVIEW_URL not set");
  test.skip(!process.env.FIREBASE_ADMIN_SDK_KEY, "FIREBASE_ADMIN_SDK_KEY not set");
  test.describe.configure({ mode: "serial" });
  test.use({ viewport: DESKTOP });

  test.afterAll(async () => {
    await unseed();
  });

  test("① 숨김 — 무대 · 차트 = 찾을 수 없어요 · 목록에서 빠짐 → 다시 보이기 = 돌아옴", async ({ browser, baseURL }) => {
    const t = await seedTournament("숨김");
    // 팬 = 로그인하지 않은 새 창(게스트)
    const ctx = await browser.newContext({ storageState: signedOutState() });
    const page = await ctx.newPage();
    page.on("console", (m) => {
      if (m.type() === "error" && !IGNORED_CONSOLE.some((re) => re.test(m.text()))) consoleErrors.push(m.text());
    });
    await prime(page, baseURL);
    expect(await activeRowCount(page, t.id)).toBe(1);

    await setTournamentVisibility(db(), t.id, "hide", { nowMs: Date.now(), actorUid: actor, values });
    const doc = (await db().doc(`tournaments/${t.id}`).get()).data();
    expect(doc?.status).toBe("hidden");
    expect(doc?.featured).toBe(false);

    expect(await activeRowCount(page, t.id)).toBe(0);
    await page.goto(`/arena/${t.id}?lang=ko`);
    await expect(page.getByText(NOT_FOUND)).toBeVisible({ timeout: 20_000 });
    await page.goto(`/arena/${t.id}/ranking?lang=ko`);
    await expect(page.getByTestId("ranking-not-found")).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId("ranking-not-found")).toContainText(NOT_FOUND);

    await setTournamentVisibility(db(), t.id, "unhide", { nowMs: Date.now(), actorUid: actor, values });
    expect((await db().doc(`tournaments/${t.id}`).get()).get("status")).toBe("active");
    expect(await activeRowCount(page, t.id)).toBe(1);
    await page.goto(`/arena/${t.id}/ranking?lang=ko`);
    await expect(page.getByTestId("ranking-not-found")).toHaveCount(0);
    await ctx.close();
  });

  test("② 조기 마감 — 목록에서 빠짐 · 새로 온 팬 = 마감됐어요 · 상태 active 그대로", async ({ browser, baseURL }) => {
    const t = await seedTournament("조기마감");
    await closeTournamentEarly(db(), t.id, { nowMs: Date.now(), actorUid: actor, values });
    const doc = (await db().doc(`tournaments/${t.id}`).get()).data();
    expect(doc?.status).toBe("active");
    expect(doc?.closedEarlyBy).toBe(actor);

    const ctx = await browser.newContext({ storageState: signedOutState() });
    const page = await ctx.newPage();
    page.on("console", (m) => {
      if (m.type() === "error" && !IGNORED_CONSOLE.some((re) => re.test(m.text()))) consoleErrors.push(m.text());
    });
    await prime(page, baseURL);
    expect(await activeRowCount(page, t.id)).toBe(0);
    await page.goto(`/arena/${t.id}?lang=ko`);
    await expect(page.getByText(DEADLINE_PASSED)).toBeVisible({ timeout: 20_000 });
    await ctx.close();
  });

  test("③ 참여 0명 삭제 — 대회 · 엔트리가 사라지고 무대 = 찾을 수 없어요", async ({ browser, baseURL }) => {
    const t = await seedTournament("삭제");
    await expect(removeTournament(db(), t.id, { nowMs: Date.now(), values, storage: noFiles })).resolves.toEqual({
      status: "deleted",
    });
    expect((await db().doc(`tournaments/${t.id}`).get()).exists).toBe(false);
    expect((await db().collection("contestants").where("tournamentId", "==", t.id).get()).size).toBe(0);

    const ctx = await browser.newContext({ storageState: signedOutState() });
    const page = await ctx.newPage();
    await prime(page, baseURL);
    await page.goto(`/arena/${t.id}?lang=ko`);
    await expect(page.getByText(NOT_FOUND)).toBeVisible({ timeout: 20_000 });
    await ctx.close();
  });

  test("④ 게스트 선택 1건 — 삭제가 막히고 아무것도 지우지 않는다", async () => {
    const t = await seedTournament("막힘");
    // 진짜 선택 기록과 같은 모양(voteRecord.buildVoteDoc) — 12시간마다 도는 차트 집계가 이 대회를 읽어도 흔들리지 않게.
    // 게스트 선택은 차트에서 빠진다(v2.1). 시험이 끝나면 지운다.
    const contestantId = seeded.contestants[seeded.contestants.length - 48];
    const vote = await db().collection("votes").add({
      userId: `e2e-guest-${RUN}`,
      tournamentId: t.id,
      round: 1,
      matchId: `${t.id}:r1:m1`,
      contestantId,
      date: new Date().toISOString().slice(0, 10),
      runIndex: 1,
      isGuest: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    seeded.votes.push(vote.id);

    const err = await removeTournament(db(), t.id, { nowMs: Date.now(), values, storage: noFiles }).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(TournamentAdminError);
    expect((err as TournamentAdminError).code).toBe("has_fans");
    const doc = await db().doc(`tournaments/${t.id}`).get();
    expect(doc.exists).toBe(true);
    expect(doc.get("removingAt")).toBeUndefined();
    expect((await db().collection("contestants").where("tournamentId", "==", t.id).get()).size).toBe(48);
  });
});
