/**
 * IMAGE-1 PR 3 (원장 D-77 · D-83 · D-93) — 엔트리 내리기의 저장 핵심 + 카드 다시 굽기 + 규칙 · 에뮬레이터 통합.
 *
 * takeDownEntry 콜러블이 부르는 entryTakedownStore 를 진짜 Firestore(에뮬레이터)에 대고 돌린다.
 * 지키는 것:
 *   · 이미지 대회: 그림 두 장 삭제 · 엔트리 media = 종류 + 내린 시각 · 기록(날짜 · 사유 · uid · 출처) · 대회 신호
 *   · 영상 대회: 영상 정보 제거 · 지울 파일 없음
 *   · 다른 엔트리 · 다른 대회 무변화 · 차트 캐시 그 행만 아바타 재료 제거
 *   · 두 번 불러도 같은 결과(기록 1건) · 파일 삭제가 중간에 실패해도 기록·문서는 남고, 다시 부르면 마저 지운다
 *   · 그 엔트리가 Champion 인 카드 n장 = 돌려주는 n = 다시 구운 장수 · 다른 Champion 카드는 그대로
 *   · 규칙: 브라우저(주인)가 엔트리 media · 내리기 기록을 바꿀 수 없다 · 기록은 관리자만 읽는다
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
import { doc as clientDoc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { deleteApp, initializeApp, type App } from "firebase-admin/app";
import { FieldValue, Timestamp, getFirestore, type Firestore } from "firebase-admin/firestore";
import {
  EntryTakedownError,
  rebakeTakedownPage,
  takeDownEntry,
  type RebakeDeps,
  type TakedownDeps,
} from "../../functions/src/core/entryTakedownStore";
import { ENTRY_TAKEDOWN_ERROR_CODES as CODES } from "../../functions/src/core/entryTakedown";

const PROJECT_ID = "wc48-rules-entry-takedown";
process.env.FIRESTORE_EMULATOR_HOST ??= "127.0.0.1:8080";

const OPERATOR = "operatorUid";
const ADMIN = "adminUid";
const IMG_T = "imgT";
const VID_T = "vidT";
const OTHER_T = "otherT";

let testEnv: RulesTestEnvironment;
let adminApp: App;
let db: Firestore;
let deleted: string[] = [];
let failDeletes = false;
let saved: { path: string; bytes: number }[] = [];

const NOW = 1_763_300_000_000;
const deps = (): TakedownDeps => ({
  nowMs: NOW,
  timestamp: (ms) => Timestamp.fromMillis(ms),
  deleteField: () => FieldValue.delete(),
  deleteFile: async (path) => {
    if (failDeletes) throw new Error("storage down");
    deleted.push(path);
  },
});
const rebakeDeps = (): RebakeDeps => ({
  nowMs: () => NOW + 1000,
  timestamp: (ms) => Timestamp.fromMillis(ms),
  render: () => Buffer.from("png"),
  saveCard: async (path, png) => {
    saved.push({ path, bytes: png.length });
  },
});

const imageMedia = (tid: string, i: number) => ({
  type: "image",
  image: {
    url: `https://x/${tid}/${i}.jpg`,
    thumbUrl: `https://x/${tid}/${i}_600.jpg`,
    storagePath: `entry-images/tournaments/${tid}/${i}.jpg`,
    origin: "search",
    sourceUrl: "https://cdn.people.com/a.jpg",
    sourcePage: "https://people.com/article",
    width: 1600,
    height: 900,
    addedAt: 1,
  },
});

async function seed() {
  await db.doc(`tournaments/${IMG_T}`).set({ title: "그림", hostUid: OPERATOR, status: "active", mediaKind: "image" });
  await db.doc(`tournaments/${VID_T}`).set({ title: "영상", hostUid: OPERATOR, status: "active" });
  await db.doc(`tournaments/${OTHER_T}`).set({ title: "다른", hostUid: OPERATOR, status: "active", mediaKind: "image" });
  for (const i of [0, 1]) {
    await db.doc(`contestants/${IMG_T}c${i}`).set({ tournamentId: IMG_T, hostUid: OPERATOR, name: `그림${i}`, order: i + 1, media: imageMedia(IMG_T, i) });
    await db.doc(`contestants/${OTHER_T}c${i}`).set({ tournamentId: OTHER_T, hostUid: OPERATOR, name: `다른${i}`, order: i + 1, media: imageMedia(OTHER_T, i) });
    await db.doc(`contestants/${VID_T}c${i}`).set({
      tournamentId: VID_T,
      hostUid: OPERATOR,
      name: `영상${i}`,
      order: i + 1,
      media: { type: "embed", embed: { videoId: i === 0 ? "dQw4w9WgXcQ" : "9bZkp7q19f0", sourceUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ" } },
    });
  }
  await db.doc(`ranking_cache/${IMG_T}`).set({
    tournamentId: IMG_T,
    rankings: [
      { contestantId: `${IMG_T}c0`, name: "그림0", videoId: null, imageUrl: "https://x/imgT/0_600.jpg", crownScore: 800 },
      { contestantId: `${IMG_T}c1`, name: "그림1", videoId: null, imageUrl: "https://x/imgT/1_600.jpg", crownScore: 600 },
    ],
  });
  // 카드: c0 가 Champion 인 카드 3장(두 사람 · 2회차 포함) · c1 Champion 1장
  const card = (id: string, voter: string, champ: string, runIndex = 1) =>
    db.doc(`crown_cards/${id}`).set({
      voterUid: voter,
      tournamentId: IMG_T,
      runIndex,
      championContestantId: champ,
      tournamentTitle: "그림",
      tournamentCategory: "KPOP",
      imageUrl: `https://firebasestorage.googleapis.com/v0/b/b/o/${encodeURIComponent(`crown-cards/${IMG_T}/${id}.png`)}?alt=media`,
      format: "link",
    });
  await card(`fanA_${IMG_T}`, "fanA", `${IMG_T}c0`);
  await card(`fanA_${IMG_T}_r2`, "fanA", `${IMG_T}c0`, 2);
  await card(`fanB_${IMG_T}`, "fanB", `${IMG_T}c0`);
  await card(`fanC_${IMG_T}`, "fanC", `${IMG_T}c1`);
}

const input = (tid: string, cid: string, reason = "소속사 요청 · policy@ 11/27 접수") => ({ tournamentId: tid, contestantId: cid, reason, byUid: ADMIN });

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: { rules: readFileSync("firestore.rules", "utf8"), host: "127.0.0.1", port: 8080 },
  });
  adminApp = initializeApp({ projectId: PROJECT_ID }, "entry-takedown-test");
  db = getFirestore(adminApp);
});
afterAll(async () => {
  await testEnv?.cleanup();
  if (adminApp) await deleteApp(adminApp);
});
beforeEach(async () => {
  await testEnv.clearFirestore();
  deleted = [];
  saved = [];
  failDeletes = false;
  await seed();
});

describe("이미지 대회 엔트리 내리기", () => {
  it("두 장 삭제 · media = 종류 + 내린 시각 · 기록 · 대회 신호 · 카드 수", async () => {
    const res = await takeDownEntry(db, deps(), input(IMG_T, `${IMG_T}c0`));
    expect(res).toEqual({ cards: 3, already: false });
    expect(deleted.sort()).toEqual([`entry-images/tournaments/${IMG_T}/0.jpg`, `entry-images/tournaments/${IMG_T}/0_600.jpg`]);
    const c = (await db.doc(`contestants/${IMG_T}c0`).get()).data()!;
    expect(c.media).toEqual({ type: "image", takedown: { at: NOW } });
    const r = (await db.doc(`entry_takedowns/${IMG_T}c0`).get()).data()!;
    expect(r).toMatchObject({
      tournamentId: IMG_T,
      contestantId: `${IMG_T}c0`,
      name: "그림0",
      mediaKind: "image",
      reason: "소속사 요청 · policy@ 11/27 접수",
      byUid: ADMIN,
      sourceUrl: "https://cdn.people.com/a.jpg",
      sourcePage: "https://people.com/article",
      storagePath: `entry-images/tournaments/${IMG_T}/0.jpg`,
      rebake: { total: 3, done: 0, cursor: null, finishedAt: null },
    });
    expect((r.at as Timestamp).toMillis()).toBe(NOW);
    expect((await db.doc(`tournaments/${IMG_T}`).get()).get("mediaTakedownAt")).toBe(NOW);
  });

  it("다른 엔트리 · 다른 대회는 그대로 · 차트 캐시는 그 행만 아바타 재료 제거", async () => {
    await takeDownEntry(db, deps(), input(IMG_T, `${IMG_T}c0`));
    expect((await db.doc(`contestants/${IMG_T}c1`).get()).get("media")).toEqual(imageMedia(IMG_T, 1));
    expect((await db.doc(`contestants/${OTHER_T}c0`).get()).get("media")).toEqual(imageMedia(OTHER_T, 0));
    expect((await db.doc(`tournaments/${OTHER_T}`).get()).get("mediaTakedownAt")).toBeUndefined();
    const rows = (await db.doc(`ranking_cache/${IMG_T}`).get()).get("rankings") as Record<string, unknown>[];
    expect(rows[0]).toEqual({ contestantId: `${IMG_T}c0`, name: "그림0", videoId: null, crownScore: 800 });
    expect(rows[1].imageUrl).toBe("https://x/imgT/1_600.jpg");
  });

  it("두 번 불러도 같은 결과 — 기록 1건 · 내린 시각 그대로 · already", async () => {
    await takeDownEntry(db, deps(), input(IMG_T, `${IMG_T}c0`));
    const again = await takeDownEntry(db, { ...deps(), nowMs: NOW + 5000 }, input(IMG_T, `${IMG_T}c0`, ""));
    expect(again).toEqual({ cards: 3, already: true });
    expect((await db.doc(`contestants/${IMG_T}c0`).get()).get("media")).toEqual({ type: "image", takedown: { at: NOW } });
    expect((await db.collection("entry_takedowns").get()).size).toBe(1);
  });

  it("파일 삭제가 중간에 실패 → 기록·문서는 이미 이니셜, 다시 부르면 마저 지운다(반쪽 상태 없음)", async () => {
    failDeletes = true;
    await expect(takeDownEntry(db, deps(), input(IMG_T, `${IMG_T}c0`))).rejects.toThrow("storage down");
    expect((await db.doc(`entry_takedowns/${IMG_T}c0`).get()).exists).toBe(true);
    expect((await db.doc(`contestants/${IMG_T}c0`).get()).get("media.takedown")).toEqual({ at: NOW });
    failDeletes = false;
    await takeDownEntry(db, deps(), input(IMG_T, `${IMG_T}c0`));
    expect(deleted.sort()).toEqual([`entry-images/tournaments/${IMG_T}/0.jpg`, `entry-images/tournaments/${IMG_T}/0_600.jpg`]);
  });

  it("사유가 비면 아무것도 쓰지 않고 거절", async () => {
    await expect(takeDownEntry(db, deps(), input(IMG_T, `${IMG_T}c0`, "  "))).rejects.toMatchObject({ code: CODES.REASON_REQUIRED });
    expect((await db.doc(`entry_takedowns/${IMG_T}c0`).get()).exists).toBe(false);
    expect(deleted).toEqual([]);
  });

  it("다른 대회의 엔트리 · 없는 엔트리 → 거절", async () => {
    await expect(takeDownEntry(db, deps(), input(IMG_T, `${OTHER_T}c0`))).rejects.toBeInstanceOf(EntryTakedownError);
    await expect(takeDownEntry(db, deps(), input(IMG_T, "nope"))).rejects.toMatchObject({ code: CODES.NOT_FOUND });
  });
});

describe("영상 대회 엔트리 내리기(mediaKind 없음)", () => {
  it("영상 정보 제거 · 지울 파일 없음 · 기록에 videoId", async () => {
    const res = await takeDownEntry(db, deps(), input(VID_T, `${VID_T}c0`));
    expect(res).toEqual({ cards: 0, already: false });
    expect(deleted).toEqual([]);
    expect((await db.doc(`contestants/${VID_T}c0`).get()).get("media")).toEqual({ type: "embed", takedown: { at: NOW } });
    expect((await db.doc(`entry_takedowns/${VID_T}c0`).get()).data()).toMatchObject({ mediaKind: "video", videoId: "dQw4w9WgXcQ" });
    expect((await db.doc(`contestants/${VID_T}c1`).get()).get("media.embed.videoId")).toBe("9bZkp7q19f0");
  });
});

describe("크라운 카드 다시 굽기", () => {
  it("그 엔트리가 Champion 인 카드만 · 장수 = n · 주소 끝 &v= · 끝 표시", async () => {
    const { cards } = await takeDownEntry(db, deps(), input(IMG_T, `${IMG_T}c0`));
    let page = await rebakeTakedownPage(db, rebakeDeps(), `${IMG_T}c0`, 2);
    expect(page).toEqual({ processed: 2, finished: false });
    page = await rebakeTakedownPage(db, rebakeDeps(), `${IMG_T}c0`, 2);
    expect(page).toEqual({ processed: 1, finished: true });
    expect(saved.map((s) => s.path).sort()).toEqual(
      [`crown-cards/${IMG_T}/fanA.png`, `crown-cards/${IMG_T}/fanA_r2.png`, `crown-cards/${IMG_T}/fanB.png`].sort(),
    );
    expect(saved.length).toBe(cards);
    const a = (await db.doc(`crown_cards/fanA_${IMG_T}`).get()).data()!;
    expect(a.imageUrl).toMatch(/\?alt=media&v=1763300001000$/);
    expect((a.photoTakenDownAt as Timestamp).toMillis()).toBe(NOW + 1000);
    expect((await db.doc(`crown_cards/fanC_${IMG_T}`).get()).get("photoTakenDownAt")).toBeUndefined();
    const r = (await db.doc(`entry_takedowns/${IMG_T}c0`).get()).get("rebake");
    expect(r.done).toBe(3);
    expect((r.finishedAt as Timestamp).toMillis()).toBe(NOW + 1000);
    // 끝난 뒤 다시 불러도 아무것도 하지 않는다
    expect(await rebakeTakedownPage(db, rebakeDeps(), `${IMG_T}c0`, 2)).toEqual({ processed: 0, finished: true });
    expect(saved.length).toBe(3);
  });

  it("다시 굽기를 두 번 부르면(주소 끝 &v= 가 한 번만 붙는다)", async () => {
    await takeDownEntry(db, deps(), input(IMG_T, `${IMG_T}c0`));
    await db.doc(`entry_takedowns/${IMG_T}c0`).update({ "rebake.cursor": null, "rebake.finishedAt": null });
    await rebakeTakedownPage(db, rebakeDeps(), `${IMG_T}c0`, 10);
    await db.doc(`entry_takedowns/${IMG_T}c0`).update({ "rebake.cursor": null, "rebake.finishedAt": null });
    await rebakeTakedownPage(db, rebakeDeps(), `${IMG_T}c0`, 10);
    const url = (await db.doc(`crown_cards/fanB_${IMG_T}`).get()).get("imageUrl") as string;
    expect(url.match(/&v=/g)?.length).toBe(1);
  });
});

describe("규칙 — 브라우저에서 엔트리 그림 · 기록을 직접 바꿀 수 없다", () => {
  it("주인도 엔트리 media 를 바꾸거나 지울 수 없다 · 이름 3언어는 바꿀 수 있다", async () => {
    const owner = testEnv.authenticatedContext(OPERATOR).firestore();
    const ref = clientDoc(owner, `contestants/${IMG_T}c0`);
    await assertFails(updateDoc(ref, { media: { type: "image" } }));
    await assertFails(updateDoc(ref, { "media.takedown": null }));
    await assertSucceeds(updateDoc(ref, { nameI18n: { ko: "그림0", en: "G0", es: "G0" } }));
  });

  it("내리기 기록: 관리자만 읽는다 · 아무도 쓰지 않는다", async () => {
    await takeDownEntry(db, deps(), input(IMG_T, `${IMG_T}c0`));
    const admin = testEnv.authenticatedContext(ADMIN, { admin: true }).firestore();
    const owner = testEnv.authenticatedContext(OPERATOR).firestore();
    const anon = testEnv.unauthenticatedContext().firestore();
    await assertSucceeds(getDoc(clientDoc(admin, `entry_takedowns/${IMG_T}c0`)));
    await assertFails(getDoc(clientDoc(owner, `entry_takedowns/${IMG_T}c0`)));
    await assertFails(getDoc(clientDoc(anon, `entry_takedowns/${IMG_T}c0`)));
    await assertFails(setDoc(clientDoc(admin, `entry_takedowns/${IMG_T}c1`), { reason: "x" }));
  });
});
