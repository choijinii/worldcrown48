/**
 * 기사 조회 기록 저장 핵심 — 에뮬레이터 통합 (PITCH-2 PR B · D-78 후보).
 *
 * recordArticleView 콜러블이 부르는 recordArticleViewCore 를 진짜 Firestore(에뮬레이터)에
 * 대고 돌린다. 지키는 것:
 *   · 발행된 기사의 첫 조회 → views.total +1 · views.d<오늘 KST> +1
 *   · 같은 표지(같은 연결 · 같은 기사 · 같은 시간) 다시 → 세지 않는다
 *   · 초안 · 내린 기사 · 없는 기사 → 세지 않는다(문서를 만들지도 않는다)
 *   · 오늘·어제가 아닌 옛 날짜 칸은 지운다 · 표지는 2시간 뒤 지울 시각(expireAt)을 단다
 *   · 브라우저는 news 의 조회 칸을 못 쓰고, news_view_marks 를 읽지도 쓰지도 못한다
 *
 * Emulator-backed: run via `npm run test:rules` (wraps firebase emulators:exec).
 */
import { readFileSync } from "node:fs";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  assertFails,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { deleteApp, initializeApp, type App } from "firebase-admin/app";
import { FieldValue, Timestamp, getFirestore, type Firestore } from "firebase-admin/firestore";
import {
  VIEW_MARKS_COLLECTION,
  recordArticleViewCore,
  viewMarkId,
} from "../../functions/src/core/articleViewCore";

const PROJECT_ID = "wc48-rules-article-view";
process.env.FIRESTORE_EMULATOR_HOST ??= "127.0.0.1:8080";

let testEnv: RulesTestEnvironment;
let adminApp: App;
let db: Firestore;

// 2026-11-18 21:30 KST = 12:30 UTC
const NOW = Date.UTC(2026, 10, 18, 12, 30, 0);
const deps = {
  increment: (n: number) => FieldValue.increment(n),
  deleteField: () => FieldValue.delete(),
  timestamp: (ms: number) => Timestamp.fromMillis(ms),
};
const record = (slug: string, ip = "1.2.3.4", nowMs = NOW) =>
  recordArticleViewCore(db, { slug, markId: viewMarkId("salt", ip, slug, nowMs), nowMs }, deps);

async function seedArticle(slug: string, status: string, views?: Record<string, number>) {
  await db.collection("news").doc(slug).set({
    slug,
    status,
    template: "column",
    origin: "manual_ai",
    title: { ko: "기사", en: "", es: "" },
    ...(views ? { views } : {}),
  });
}
const viewsOf = async (slug: string) => (await db.collection("news").doc(slug).get()).get("views");

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: { rules: readFileSync("firestore.rules", "utf8"), host: "127.0.0.1", port: 8080 },
  });
  adminApp = initializeApp({ projectId: PROJECT_ID }, "article-view-test");
  db = getFirestore(adminApp);
});
afterAll(async () => {
  await testEnv?.cleanup();
  if (adminApp) await deleteApp(adminApp);
});
beforeEach(async () => {
  await testEnv.clearFirestore();
});

describe("발행 기사의 첫 조회를 센다", () => {
  it("views.total · views.d<오늘 KST> 가 1씩 오른다", async () => {
    await seedArticle("20261118-pub001", "published");
    expect(await record("20261118-pub001")).toEqual({ counted: true });
    expect(await viewsOf("20261118-pub001")).toEqual({ total: 1, d20261118: 1 });
  });

  it("다른 연결은 따로 센다", async () => {
    await seedArticle("20261118-pub001", "published");
    await record("20261118-pub001", "1.1.1.1");
    await record("20261118-pub001", "2.2.2.2");
    expect(await viewsOf("20261118-pub001")).toEqual({ total: 2, d20261118: 2 });
  });

  it("옛 날짜 칸은 지우고 어제 칸은 남긴다", async () => {
    await seedArticle("20261118-pub001", "published", { total: 10, d20261115: 3, d20261116: 4, d20261117: 2 });
    await record("20261118-pub001");
    expect(await viewsOf("20261118-pub001")).toEqual({ total: 11, d20261117: 2, d20261118: 1 });
  });

  it("표지에는 2시간 뒤 지울 시각(expireAt)만 있다 — IP 를 남기지 않는다", async () => {
    await seedArticle("20261118-pub001", "published");
    await record("20261118-pub001");
    const marks = await db.collection(VIEW_MARKS_COLLECTION).get();
    expect(marks.size).toBe(1);
    const data = marks.docs[0].data();
    expect(Object.keys(data)).toEqual(["expireAt"]);
    expect((data.expireAt as Timestamp).toMillis()).toBe(NOW + 2 * 3_600_000);
  });
});

describe("1시간 1번", () => {
  it("같은 연결 · 같은 기사 · 같은 시간 → 두 번째는 세지 않는다", async () => {
    await seedArticle("20261118-pub001", "published");
    await record("20261118-pub001");
    expect(await record("20261118-pub001", "1.2.3.4", NOW + 60_000)).toEqual({
      counted: false,
      reason: "duplicate",
    });
    expect(await viewsOf("20261118-pub001")).toEqual({ total: 1, d20261118: 1 });
  });

  it("동시에 두 번 와도 한 번만 센다", async () => {
    await seedArticle("20261118-pub001", "published");
    const rs = await Promise.all([record("20261118-pub001"), record("20261118-pub001")]);
    expect(rs.filter((r) => r.counted)).toHaveLength(1);
    expect((await viewsOf("20261118-pub001")).total).toBe(1);
  });
});

describe("발행되지 않은 기사는 세지 않는다", () => {
  it.each(["draft", "archived"])("%s → not-found · 조회 칸 없음 · 표지 없음", async (status) => {
    await seedArticle("20261118-x00001", status);
    expect(await record("20261118-x00001")).toEqual({ counted: false, reason: "not-found" });
    expect(await viewsOf("20261118-x00001")).toBeUndefined();
    expect((await db.collection(VIEW_MARKS_COLLECTION).get()).size).toBe(0);
  });

  it("없는 기사 → not-found · 문서를 만들지 않는다", async () => {
    expect(await record("20261118-nope01")).toEqual({ counted: false, reason: "not-found" });
    expect((await db.collection("news").doc("20261118-nope01").get()).exists).toBe(false);
  });
});

describe("브라우저 규칙", () => {
  it("로그인한 팬도 news 의 조회 칸을 쓸 수 없다", async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "news/20261118-pub001"), { slug: "20261118-pub001", status: "published" });
    });
    const fan = testEnv.authenticatedContext("fan-1").firestore();
    await assertFails(updateDoc(doc(fan, "news/20261118-pub001"), { "views.total": 999 }));
    const guest = testEnv.unauthenticatedContext().firestore();
    await assertFails(updateDoc(doc(guest, "news/20261118-pub001"), { "views.total": 999 }));
  });

  it("news_view_marks 는 읽기·쓰기 전부 거부(관리자 포함)", async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), `${VIEW_MARKS_COLLECTION}/m1`), { expireAt: 1 });
    });
    const admin = testEnv.authenticatedContext("op", { admin: true }).firestore();
    const guest = testEnv.unauthenticatedContext().firestore();
    await assertFails(getDoc(doc(admin, `${VIEW_MARKS_COLLECTION}/m1`)));
    await assertFails(getDoc(doc(guest, `${VIEW_MARKS_COLLECTION}/m1`)));
    await assertFails(setDoc(doc(guest, `${VIEW_MARKS_COLLECTION}/m2`), { expireAt: 1 }));
  });
});
