/**
 * config/newsPolicy — NEWS-1 4층 TIOZ 편집 방침(대표 승인 자리 2026-11-27).
 *
 * getNewsPolicy · saveNewsPolicy 콜러블(admin SDK)만 읽고 쓴다 — 30줄 · 200자 · 이유 검사를 건너뛰지 못하게
 * 브라우저에서는 관리자도 직접 읽거나 쓰지 못한다.
 *
 * Emulator-backed: run via `npm run test:rules` (wraps firebase emulators:exec).
 */
import { readFileSync } from "node:fs";
import { afterAll, beforeAll, beforeEach, describe, it } from "vitest";
import { assertFails, initializeTestEnvironment, type RulesTestEnvironment } from "@firebase/rules-unit-testing";
import { deleteDoc, doc, getDoc, setDoc } from "firebase/firestore";

let testEnv: RulesTestEnvironment;
const PATH = "config/newsPolicy";

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: "wc48-rules-news-policy",
    firestore: { rules: readFileSync("firestore.rules", "utf8"), host: "127.0.0.1", port: 8080 },
  });
});
afterAll(async () => testEnv?.cleanup());
beforeEach(async () => {
  await testEnv.clearFirestore();
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), PATH), { lines: [{ text: "줄", reason: "이유", addedAt: "2026-11-27" }] });
  });
});

describe("config/newsPolicy — 콜러블로만", () => {
  const ctxs = () => ({
    admin: testEnv.authenticatedContext("op", { admin: true }).firestore(),
    fan: testEnv.authenticatedContext("fan").firestore(),
    guest: testEnv.unauthenticatedContext().firestore(),
  });
  it("관리자 · 팬 · 손님 모두 읽기 0", async () => {
    for (const db of Object.values(ctxs())) await assertFails(getDoc(doc(db, PATH)));
  });
  it("관리자 · 팬 · 손님 모두 쓰기 · 지우기 0", async () => {
    for (const db of Object.values(ctxs())) {
      await assertFails(setDoc(doc(db, PATH), { lines: [] }));
      await assertFails(deleteDoc(doc(db, PATH)));
    }
  });
});
