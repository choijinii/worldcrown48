/**
 * ARENA-2 PR 3 (원장 D-86) — 대회 삭제 · 조기 마감 · 숨김의 저장 핵심 + 규칙 · 에뮬레이터 통합.
 *
 * manageTournament 콜러블이 부르는 tournamentAdminStore 를 진짜 Firestore(에뮬레이터)에 대고 돌린다.
 * 지키는 것:
 *   · 참여 0명 삭제 = 대회 · 엔트리 · 씨앗 · 판 기록 · 진행 · 크라운 카드(문서·그림) · 차트 캐시(기록 포함) ·
 *     운영자 알림 · 뉴스 초안까지 지운다 — 다른 대회 것은 남는다 · 발행 기사 · 내린 기사는 남는다
 *   · 선택 1건(게스트 포함) · 발행 기사 1건이면 아무것도 지우지 않고 막는다 — 표시도 남기지 않는다
 *   · 조기 마감 = 마감만 지금으로(상태 active 그대로) · 이미 지났으면 거절
 *   · 숨김 = 상태 hidden + featured 끔 · 다시 보이기 = active
 *   · 규칙: 브라우저 삭제 막힘 · 숨긴 대회와 그 차트는 주인 말고 못 읽음
 *
 * Emulator-backed: run via `npm run test:rules` (wraps firebase emulators:exec).
 */
import { readFileSync } from "node:fs";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { deleteDoc, doc as clientDoc, getDoc } from "firebase/firestore";
import { deleteApp, initializeApp, type App } from "firebase-admin/app";
import { FieldValue, Timestamp, getFirestore, type Firestore } from "firebase-admin/firestore";
import {
  TournamentAdminError,
  closeTournamentEarly,
  removeTournament,
  setTournamentVisibility,
  tournamentFanStates,
} from "../../functions/src/core/tournamentAdminStore";
import { TOURNAMENT_ADMIN_ERROR_CODES as CODES } from "../../functions/src/core/tournamentAdmin";

const PROJECT_ID = "wc48-rules-tournament-admin";
process.env.FIRESTORE_EMULATOR_HOST ??= "127.0.0.1:8080";

const OPERATOR = "operatorUid";
const FAN = "fanUid";
const T = "t_one"; // '_' 가 든 슬러그 — 문서 id 고르기가 흔들리지 않는지
const OTHER = "t_one_more";
const DAY = 86_400_000;

let testEnv: RulesTestEnvironment;
let adminApp: App;
let db: Firestore;
let deletedPrefixes: string[] = [];
const values = { timestamp: (ms: number) => Timestamp.fromMillis(ms), deleteField: () => FieldValue.delete() };
const storage = {
  deletePrefix: async (prefix: string) => {
    deletedPrefixes.push(prefix);
  },
};

async function seedTournament(id: string, extra: Record<string, unknown> = {}) {
  await db.doc(`tournaments/${id}`).set({
    title: id,
    hostUid: OPERATOR,
    status: "active",
    featured: false,
    tournamentDeadline: Timestamp.fromMillis(Date.now() + 7 * DAY),
    ...extra,
  });
}

/** 한 대회에 딸린 기록을 모두 심는다(선택 기록은 따로). */
async function seedRecords(tid: string) {
  await db.collection("contestants").add({ tournamentId: tid, hostUid: OPERATOR, name: "A", order: 1 });
  await db.collection("contestants").add({ tournamentId: tid, hostUid: OPERATOR, name: "B", order: 2 });
  await db.doc(`bracket_seeds/${FAN}_${tid}`).set({ seed: 1 });
  await db.doc(`bracket_seeds/${FAN}_${tid}_r2`).set({ seed: 2 });
  await db.doc(`tournament_runs/${FAN}_${tid}`).set({ runIndex: 2 });
  await db.doc(`roundProgress/${FAN}_${tid}`).set({ userId: FAN, tournamentId: tid, complete: true });
  await db.doc(`crown_cards/${FAN}_${tid}`).set({ voterUid: FAN, tournamentId: tid });
  await db.doc(`ranking_cache/${tid}`).set({ runsTotal: 0 });
  await db.doc(`ranking_cache/${tid}/history/0`).set({ runsTotal: 0 });
  await db.collection("admin_alerts").add({ tournamentId: tid, resolved: false });
  await db.doc(`news/${tid}-draft`).set({ tournamentId: tid, status: "draft" });
}

async function count(path: string, tid?: string): Promise<number> {
  const col = db.collection(path);
  const snap = tid ? await col.where("tournamentId", "==", tid).get() : await col.get();
  return snap.size;
}

const now = () => Date.now();

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: { rules: readFileSync("firestore.rules", "utf8"), host: "127.0.0.1", port: 8080 },
  });
  adminApp = initializeApp({ projectId: PROJECT_ID }, "tournament-admin-test");
  db = getFirestore(adminApp);
});
afterAll(async () => {
  await testEnv?.cleanup();
  if (adminApp) await deleteApp(adminApp);
});
beforeEach(async () => {
  await testEnv.clearFirestore();
  deletedPrefixes = [];
});

describe("삭제 — 참여 0명 (①)", () => {
  it("대회와 딸린 기록을 모두 지우고, 다른 대회 것은 남긴다", async () => {
    await seedTournament(T);
    await seedTournament(OTHER);
    await seedRecords(T);
    await seedRecords(OTHER);

    await expect(removeTournament(db, T, { storage, values, nowMs: now() })).resolves.toEqual({ status: "deleted" });

    expect((await db.doc(`tournaments/${T}`).get()).exists).toBe(false);
    for (const col of ["contestants", "roundProgress", "crown_cards", "admin_alerts", "news"]) {
      expect(await count(col, T), col).toBe(0);
      expect(await count(col, OTHER), `${col} (다른 대회)`).toBeGreaterThan(0);
    }
    const seeds = (await db.collection("bracket_seeds").get()).docs.map((d) => d.id).sort();
    expect(seeds).toEqual([`${FAN}_${OTHER}`, `${FAN}_${OTHER}_r2`]);
    const runs = (await db.collection("tournament_runs").get()).docs.map((d) => d.id);
    expect(runs).toEqual([`${FAN}_${OTHER}`]);
    expect((await db.doc(`ranking_cache/${T}`).get()).exists).toBe(false);
    expect((await db.collection(`ranking_cache/${T}/history`).get()).size).toBe(0);
    expect((await db.doc(`ranking_cache/${OTHER}`).get()).exists).toBe(true);
    expect(deletedPrefixes).toEqual([`crown-cards/${T}/`]);
  });

  it("내린 기사(archived)는 남긴다 — 지우는 것은 초안뿐", async () => {
    await seedTournament(T);
    await db.doc("news/old").set({ tournamentId: T, status: "archived" });
    await removeTournament(db, T, { storage, values, nowMs: now() });
    expect((await db.doc("news/old").get()).exists).toBe(true);
  });

  it("없는 대회는 not_found", async () => {
    await expect(removeTournament(db, "nope", { storage, values, nowMs: now() })).rejects.toMatchObject({
      code: CODES.NOT_FOUND,
    });
  });
});

describe("삭제가 막힘 — 아무것도 지우지 않는다", () => {
  it("게스트 선택 1건만 있어도 has_fans · 표시도 남기지 않는다", async () => {
    await seedTournament(T);
    await seedRecords(T);
    await db.collection("votes").add({ tournamentId: T, userId: "guestUid", isGuest: true });

    const err = await removeTournament(db, T, { storage, values, nowMs: now() }).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(TournamentAdminError);
    expect((err as TournamentAdminError).code).toBe(CODES.HAS_FANS);

    const t = await db.doc(`tournaments/${T}`).get();
    expect(t.exists).toBe(true);
    expect(t.get("removingAt")).toBeUndefined();
    expect(await count("contestants", T)).toBe(2);
    expect(deletedPrefixes).toEqual([]);
  });

  it("발행 기사가 있으면 has_article", async () => {
    await seedTournament(T);
    await db.doc("news/live").set({ tournamentId: T, status: "published" });
    await expect(removeTournament(db, T, { storage, values, nowMs: now() })).rejects.toMatchObject({
      code: CODES.HAS_ARTICLE,
    });
    expect((await db.doc(`tournaments/${T}`).get()).get("removingAt")).toBeUndefined();
  });
});

describe("참여 여부 (Lab 목록의 [삭제] / [조기 마감] 고르기)", () => {
  it("대회마다 선택이 있는지만 돌려준다 — 숫자는 돌려주지 않는다", async () => {
    await seedTournament(T);
    await seedTournament(OTHER);
    await db.collection("votes").add({ tournamentId: OTHER, userId: FAN });
    await expect(tournamentFanStates(db, [T, OTHER])).resolves.toEqual({
      [T]: { hasFans: false },
      [OTHER]: { hasFans: true },
    });
  });
});

describe("조기 마감 (② · ④)", () => {
  it("마감만 지금으로 당기고 상태는 active 그대로 — 진행 중인 팬이 대회를 계속 읽는다", async () => {
    await seedTournament(T);
    const at = now();
    await expect(closeTournamentEarly(db, T, { nowMs: at, actorUid: OPERATOR, values })).resolves.toEqual({
      status: "closed",
      deadlineMs: at,
    });
    const t = await db.doc(`tournaments/${T}`).get();
    expect((t.get("tournamentDeadline") as Timestamp).toMillis()).toBe(at);
    expect(t.get("status")).toBe("active");
    expect((t.get("closedEarlyAt") as Timestamp).toMillis()).toBe(at);
    expect(t.get("closedEarlyBy")).toBe(OPERATOR);

    const fan = testEnv.authenticatedContext(FAN).firestore();
    await assertSucceeds(getDoc(clientDoc(fan, `tournaments/${T}`)));
  });

  it("이미 마감이 지났으면 already_closed", async () => {
    await seedTournament(T, { tournamentDeadline: Timestamp.fromMillis(now() - DAY) });
    await expect(closeTournamentEarly(db, T, { nowMs: now(), actorUid: OPERATOR, values })).rejects.toMatchObject({
      code: CODES.ALREADY_CLOSED,
    });
  });
});

describe("숨김 · 다시 보이기 (③)", () => {
  it("숨기면 상태 hidden · featured 끔 — 팬과 비로그인은 대회도 차트도 못 읽고, 주인은 읽는다", async () => {
    await seedTournament(T, { featured: true });
    await db.doc(`ranking_cache/${T}`).set({ runsTotal: 12 });
    await setTournamentVisibility(db, T, "hide", { nowMs: now(), actorUid: OPERATOR, values });

    const t = await db.doc(`tournaments/${T}`).get();
    expect(t.get("status")).toBe("hidden");
    expect(t.get("featured")).toBe(false);

    for (const ctx of [testEnv.authenticatedContext(FAN), testEnv.unauthenticatedContext()]) {
      const c = ctx.firestore();
      await assertFails(getDoc(clientDoc(c, `tournaments/${T}`)));
      await assertFails(getDoc(clientDoc(c, `ranking_cache/${T}`)));
    }
    const owner = testEnv.authenticatedContext(OPERATOR).firestore();
    await assertSucceeds(getDoc(clientDoc(owner, `tournaments/${T}`)));
  });

  it("다시 보이면 active — 대회와 차트를 다시 읽는다", async () => {
    await seedTournament(T, { status: "hidden" });
    await db.doc(`ranking_cache/${T}`).set({ runsTotal: 12 });
    await setTournamentVisibility(db, T, "unhide", { nowMs: now(), actorUid: OPERATOR, values });
    expect((await db.doc(`tournaments/${T}`).get()).get("status")).toBe("active");

    const c = testEnv.unauthenticatedContext().firestore();
    await assertSucceeds(getDoc(clientDoc(c, `tournaments/${T}`)));
    await assertSucceeds(getDoc(clientDoc(c, `ranking_cache/${T}`)));
  });

  it("공개 대회가 아니면 숨기지 못한다 · 숨긴 대회가 아니면 다시 보이지 못한다", async () => {
    await seedTournament(T, { status: "draft" });
    await expect(setTournamentVisibility(db, T, "hide", { nowMs: now(), actorUid: OPERATOR, values })).rejects.toMatchObject({
      code: CODES.NOT_ACTIVE,
    });
    await expect(setTournamentVisibility(db, T, "unhide", { nowMs: now(), actorUid: OPERATOR, values })).rejects.toMatchObject({
      code: CODES.NOT_HIDDEN,
    });
  });
});

describe("규칙 — 브라우저에서 대회를 바로 지울 수 없다", () => {
  it("주인도 브라우저에서는 지우지 못한다(서버 함수로만)", async () => {
    await seedTournament(T);
    const owner = testEnv.authenticatedContext(OPERATOR).firestore();
    await assertFails(deleteDoc(clientDoc(owner, `tournaments/${T}`)));
  });
});
