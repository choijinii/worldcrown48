/**
 * waitlist 규칙 — 브라우저 쓰기 완전 차단 (PRE-REG-1 ②-b).
 *
 * 사전등록은 등록 함수(registerWaitlist · Admin SDK)만 쓴다. 옛 화면이 쓰던 create 를 닫아
 * 번호 없는 문서가 더는 생기지 않게 한다(옛 문서 번호 매기기 → 봉인의 전제).
 * 비로그인 · 익명 · 로그인 모두 생성 · 읽기 · 수정 · 삭제 거부.
 *
 * Emulator-backed: run via `npm run test:rules` (wraps firebase emulators:exec).
 */
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { afterAll, beforeAll, beforeEach, describe, it } from "vitest";
import {
  assertFails,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
  updateDoc,
  type Firestore,
} from "firebase/firestore";

let testEnv: RulesTestEnvironment;
const EMAIL = "fan@example.com";
const ID = createHash("sha256").update(EMAIL).digest("hex");

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: "wc48-rules-waitlist",
    firestore: { rules: readFileSync("firestore.rules", "utf8"), host: "127.0.0.1", port: 8080 },
  });
});
afterAll(async () => testEnv?.cleanup());
beforeEach(async () => {
  await testEnv.clearFirestore();
});

const contexts: Record<string, () => Firestore> = {
  비로그인: () => testEnv.unauthenticatedContext().firestore() as unknown as Firestore,
  익명: () =>
    testEnv.authenticatedContext("anon-1", { firebase: { sign_in_provider: "anonymous" } }).firestore() as unknown as Firestore,
  로그인: () =>
    testEnv.authenticatedContext("user-1", { firebase: { sign_in_provider: "google.com" } }).firestore() as unknown as Firestore,
};

describe.each(Object.entries(contexts))("waitlist — %s 브라우저", (_label, db) => {
  it("옛 화면 모양 그대로의 생성도 거부(email · createdAt · 64자리 해시 ID)", async () => {
    await assertFails(setDoc(doc(db(), "waitlist", ID), { email: EMAIL, createdAt: serverTimestamp() }));
  });

  it("번호·경로를 붙인 생성도 거부", async () => {
    await assertFails(
      setDoc(doc(db(), "waitlist", ID), { email: EMAIL, createdAt: serverTimestamp(), founding_rank: 1 }),
    );
  });

  it("읽기 · 목록 · 수정 · 삭제 거부", async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "waitlist", ID), { email: EMAIL, createdAt: serverTimestamp() });
    });
    await assertFails(getDoc(doc(db(), "waitlist", ID)));
    await assertFails(getDocs(collection(db(), "waitlist")));
    await assertFails(updateDoc(doc(db(), "waitlist", ID), { founding_rank: 1 }));
    await assertFails(deleteDoc(doc(db(), "waitlist", ID)));
  });
});
