/**
 * 사전등록 등록 함수의 저장 핵심 — 에뮬레이터 통합 (PRE-REG-1).
 *
 * registerWaitlist 콜러블이 부르는 registerWaitlistCore 를 진짜 Firestore(에뮬레이터)에
 * 대고 돌린다. 지키는 것:
 *   · 선착순 번호(founding_rank) = 1부터, 빈틈·중복 없이, 등록 순서대로 — 동시 20건도
 *   · 같은 메일 다시 = "이미 등록", 번호를 쓰지 않는다
 *   · 결과에는 상태만 — 번호를 돌려주지 않는다(화면·이벤트로 새지 않게)
 *   · 시험 메일은 진짜 번호를 쓰지 않는다 — 별도 모음·별도 번호
 *   · 옛 문서 번호 매기기(봉인) 전에는 번호 없이 저장 → 봉인 뒤부터 이어서 번호
 *   · 브라우저는 시험 모음·번호 기록을 읽지도 쓰지도 못한다
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
import { doc, getDoc, setDoc, type Firestore as ClientFirestore } from "firebase/firestore";
import { deleteApp, initializeApp, type App } from "firebase-admin/app";
import { FieldValue, getFirestore, type Firestore } from "firebase-admin/firestore";
import {
  FOUNDING_META_ID,
  TEST_EMAIL_DOMAIN,
  TEST_META_ID,
  WAITLIST_COLLECTION,
  WAITLIST_META_COLLECTION,
  WAITLIST_TEST_COLLECTION,
  WaitlistInputError,
  registerWaitlistCore,
  waitlistDocId,
} from "../../functions/src/core/waitlistCore";

const PROJECT_ID = "wc48-rules-waitlist-register";
process.env.FIRESTORE_EMULATOR_HOST ??= "127.0.0.1:8080";

let testEnv: RulesTestEnvironment;
let adminApp: App;
let db: Firestore;

const deps = { serverTime: () => FieldValue.serverTimestamp() };
const register = (input: Record<string, unknown>) => registerWaitlistCore(db, input, deps);

/** 옛 문서 번호 매기기가 끝난 상태(봉인) — 그 뒤 새 등록은 바로 번호를 받는다. */
async function seal(lastRank = 0) {
  await db.collection(WAITLIST_META_COLLECTION).doc(FOUNDING_META_ID).set({ lastRank });
}

async function rankOf(email: string, col = WAITLIST_COLLECTION) {
  const snap = await db.collection(col).doc(waitlistDocId(email)).get();
  return snap.get("founding_rank") as number | undefined;
}

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: { rules: readFileSync("firestore.rules", "utf8"), host: "127.0.0.1", port: 8080 },
  });
  adminApp = initializeApp({ projectId: PROJECT_ID }, "waitlist-register-test");
  db = getFirestore(adminApp);
});
afterAll(async () => {
  await testEnv?.cleanup();
  if (adminApp) await deleteApp(adminApp);
});
beforeEach(async () => {
  await testEnv.clearFirestore();
});

describe("새 메일 → 번호 1·2·3 (봉인 뒤)", () => {
  it("등록 순서대로 1부터 번호를 매기고 결과에는 상태만 돌려준다", async () => {
    await seal();
    const results = [];
    for (const e of ["a@example.com", "b@example.com", "c@example.com"]) results.push(await register({ email: e }));
    expect(results).toEqual([{ status: "registered" }, { status: "registered" }, { status: "registered" }]);
    for (const r of results) expect(Object.keys(r)).toEqual(["status"]);
    expect([await rankOf("a@example.com"), await rankOf("b@example.com"), await rankOf("c@example.com")]).toEqual([
      1, 2, 3,
    ]);
    const meta = await db.collection(WAITLIST_META_COLLECTION).doc(FOUNDING_META_ID).get();
    expect(meta.get("lastRank")).toBe(3);
  });

  it("저장 칸 = email · createdAt(서버 시각) · founding_rank · utm · lang", async () => {
    await seal();
    await register({
      email: "  Fan@Example.com ",
      utm: { source: "x", medium: "share", campaign: "best_stage_48", junk: "no" },
      lang: "es",
    });
    const snap = await db.collection(WAITLIST_COLLECTION).doc(waitlistDocId("fan@example.com")).get();
    const d = snap.data()!;
    expect(Object.keys(d).sort()).toEqual(["createdAt", "email", "founding_rank", "lang", "utm"]);
    expect(d.email).toBe("fan@example.com");
    expect(d.createdAt.toMillis()).toBeGreaterThan(Date.now() - 60_000);
    expect(d.utm).toEqual({ source: "x", medium: "share", campaign: "best_stage_48" });
    expect(d.lang).toBe("es");
    expect(d.founding_rank).toBe(1);
  });

  it("경로·언어가 없으면 그 칸을 만들지 않는다", async () => {
    await seal();
    await register({ email: "plain@example.com", utm: { source: " " }, lang: "fr" });
    const d = (await db.collection(WAITLIST_COLLECTION).doc(waitlistDocId("plain@example.com")).get()).data()!;
    expect(Object.keys(d).sort()).toEqual(["createdAt", "email", "founding_rank"]);
  });
});

describe("같은 메일 다시 → 이미 등록", () => {
  it("대소문자·공백이 달라도 같은 메일이고, 번호가 늘지 않으며 처음 기록을 덮지 않는다", async () => {
    await seal();
    await register({ email: "dup@example.com", utm: { source: "ig" } });
    const again = await register({ email: " DUP@example.com", utm: { source: "x" } });
    expect(again).toEqual({ status: "duplicate" });
    const meta = await db.collection(WAITLIST_META_COLLECTION).doc(FOUNDING_META_ID).get();
    expect(meta.get("lastRank")).toBe(1);
    const d = (await db.collection(WAITLIST_COLLECTION).doc(waitlistDocId("dup@example.com")).get()).data()!;
    expect(d.utm).toEqual({ source: "ig" });
  });

  it("옛 화면이 만든 문서(번호 없음)도 이미 등록으로 본다", async () => {
    await seal();
    const id = waitlistDocId("legacy@example.com");
    await db.collection(WAITLIST_COLLECTION).doc(id).set({ email: "legacy@example.com", createdAt: FieldValue.serverTimestamp() });
    expect(await register({ email: "legacy@example.com" })).toEqual({ status: "duplicate" });
    expect(await rankOf("legacy@example.com")).toBeUndefined();
  });
});

describe("동시 20건 → 1~20 빈틈·중복 없음", () => {
  it("한꺼번에 들어와도 번호가 1~20 을 한 번씩 쓴다", async () => {
    await seal();
    const emails = Array.from({ length: 20 }, (_, i) => `burst-${i}@example.com`);
    const results = await Promise.all(emails.map((email) => register({ email })));
    expect(results.every((r) => r.status === "registered")).toBe(true);
    const ranks = await Promise.all(emails.map((e) => rankOf(e)));
    expect([...ranks].sort((a, b) => a! - b!)).toEqual(Array.from({ length: 20 }, (_, i) => i + 1));
    const meta = await db.collection(WAITLIST_META_COLLECTION).doc(FOUNDING_META_ID).get();
    expect(meta.get("lastRank")).toBe(20);
  });

  it("같은 메일이 동시에 두 번 와도 한 건만 등록된다", async () => {
    await seal();
    const results = await Promise.all([register({ email: "twin@example.com" }), register({ email: "twin@example.com" })]);
    expect(results.map((r) => r.status).sort()).toEqual(["duplicate", "registered"]);
    const meta = await db.collection(WAITLIST_META_COLLECTION).doc(FOUNDING_META_ID).get();
    expect(meta.get("lastRank")).toBe(1);
  });
});

describe("옛 문서 번호 매기기(봉인) 전", () => {
  it("번호 없이 저장한다 — 옛 문서보다 앞 번호를 가로채지 않게", async () => {
    expect(await register({ email: "early@example.com" })).toEqual({ status: "registered" });
    expect(await rankOf("early@example.com")).toBeUndefined();
    const meta = await db.collection(WAITLIST_META_COLLECTION).doc(FOUNDING_META_ID).get();
    expect(meta.exists).toBe(false);
  });

  it("봉인 뒤에는 봉인한 마지막 번호 다음부터 이어 간다", async () => {
    await seal(7);
    await register({ email: "next@example.com" });
    expect(await rankOf("next@example.com")).toBe(8);
  });
});

describe("시험 메일 → 진짜 번호를 쓰지 않는다", () => {
  it("시험 모음에 시험 번호로 저장하고 진짜 모음·진짜 번호는 그대로다", async () => {
    await seal(5);
    for (const i of [1, 2, 3]) {
      expect(await register({ email: `e2e-${i}@${TEST_EMAIL_DOMAIN}`, utm: { source: "e2e" } })).toEqual({
        status: "registered",
      });
    }
    expect(await rankOf(`e2e-1@${TEST_EMAIL_DOMAIN}`)).toBeUndefined();
    expect(
      await Promise.all([1, 2, 3].map((i) => rankOf(`e2e-${i}@${TEST_EMAIL_DOMAIN}`, WAITLIST_TEST_COLLECTION))),
    ).toEqual([1, 2, 3]);
    const real = await db.collection(WAITLIST_META_COLLECTION).doc(FOUNDING_META_ID).get();
    expect(real.get("lastRank")).toBe(5);
    const test = await db.collection(WAITLIST_META_COLLECTION).doc(TEST_META_ID).get();
    expect(test.get("lastRank")).toBe(3);
    expect((await db.collection(WAITLIST_COLLECTION).get()).size).toBe(0);
  });

  it("시험 메일 중복도 이미 등록이다", async () => {
    await register({ email: `e2e-dup@${TEST_EMAIL_DOMAIN}` });
    expect(await register({ email: `e2e-dup@${TEST_EMAIL_DOMAIN}` })).toEqual({ status: "duplicate" });
  });
});

describe("잘못된 메일 → 오류(저장 안 함)", () => {
  it.each([{ email: "not-an-email" }, { email: "" }, {}, { email: 42 }])("%j", async (input) => {
    await seal();
    await expect(register(input)).rejects.toBeInstanceOf(WaitlistInputError);
    expect((await db.collection(WAITLIST_COLLECTION).get()).size).toBe(0);
  });
});

describe("규칙 — 브라우저는 시험 모음·번호 기록에 손댈 수 없다", () => {
  const browser = () => testEnv.unauthenticatedContext().firestore() as unknown as ClientFirestore;
  it("waitlist_meta 읽기·쓰기 거부", async () => {
    await assertFails(getDoc(doc(browser(), WAITLIST_META_COLLECTION, FOUNDING_META_ID)));
    await assertFails(setDoc(doc(browser(), WAITLIST_META_COLLECTION, FOUNDING_META_ID), { lastRank: 0 }));
  });
  it("waitlist_test 읽기·쓰기 거부", async () => {
    const id = waitlistDocId(`x@${TEST_EMAIL_DOMAIN}`);
    await assertFails(getDoc(doc(browser(), WAITLIST_TEST_COLLECTION, id)));
    await assertFails(setDoc(doc(browser(), WAITLIST_TEST_COLLECTION, id), { email: `x@${TEST_EMAIL_DOMAIN}` }));
  });
});
