/**
 * config/pitch — 홈 히어로 홍보 장(`promoVideoUrl` · `promoPosterUrl` — 우리가 만든 영상 파일 · 추가 지시 ②).
 *
 * 홈은 로그인 전에 읽는다 → 읽기 누구나. 쓰기는 관리자만(admin 클레임). 다른 config 문서는 그대로 막힌다.
 *
 * Emulator-backed: run via `npm run test:rules` (wraps firebase emulators:exec).
 */
import { readFileSync } from "node:fs";
import { afterAll, beforeAll, beforeEach, describe, it } from "vitest";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc } from "firebase/firestore";

let testEnv: RulesTestEnvironment;

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: "wc48-rules-pitch-config",
    firestore: { rules: readFileSync("firestore.rules", "utf8"), host: "127.0.0.1", port: 8080 },
  });
});
afterAll(async () => testEnv?.cleanup());
beforeEach(async () => {
  await testEnv.clearFirestore();
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), "config/pitch"), { promoVideoUrl: "https://firebasestorage.googleapis.com/v0/b/b/o/pitch%2Fpromo%2Fa.mp4?alt=media" });
    await setDoc(doc(ctx.firestore(), "config/other"), { secret: 1 });
  });
});

describe("config/pitch", () => {
  it("로그인하지 않아도 읽는다(홈은 로그인 전)", async () => {
    await assertSucceeds(getDoc(doc(testEnv.unauthenticatedContext().firestore(), "config/pitch")));
  });
  it("관리자는 쓴다", async () => {
    const admin = testEnv.authenticatedContext("op", { admin: true }).firestore();
    await assertSucceeds(setDoc(doc(admin, "config/pitch"), { promoPosterUrl: "https://firebasestorage.googleapis.com/v0/b/b/o/pitch%2Fpromo%2Fa.jpg?alt=media" }));
  });
  it("손님 · 로그인한 팬은 못 쓴다", async () => {
    await assertFails(setDoc(doc(testEnv.unauthenticatedContext().firestore(), "config/pitch"), { promoVideoUrl: "x" }));
    await assertFails(setDoc(doc(testEnv.authenticatedContext("fan").firestore(), "config/pitch"), { promoVideoUrl: "x" }));
  });
  it("다른 config 문서는 그대로 막힌다", async () => {
    await assertFails(getDoc(doc(testEnv.unauthenticatedContext().firestore(), "config/other")));
  });
});
