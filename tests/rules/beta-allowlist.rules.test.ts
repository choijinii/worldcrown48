/**
 * config/betaAllowlist — 1차 베타 명단(BETA-PASS-1 · 지시서 §2-1).
 *
 * 메일 목록이라 손님 · 팬 · 관리자 모두 브라우저로는 읽지도 쓰지도 못한다(betaPass 콜러블이 관리 SDK 로만 읽는다).
 *
 * Emulator-backed: run via `npm run test:rules` (wraps firebase emulators:exec).
 */
import { readFileSync } from "node:fs";
import { afterAll, beforeAll, beforeEach, describe, it } from "vitest";
import {
  assertFails,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { deleteDoc, doc, getDoc, setDoc } from "firebase/firestore";

let testEnv: RulesTestEnvironment;
const PATH = "config/betaAllowlist";

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: "wc48-rules-beta-allowlist",
    firestore: { rules: readFileSync("firestore.rules", "utf8"), host: "127.0.0.1", port: 8080 },
  });
});
afterAll(async () => testEnv?.cleanup());
beforeEach(async () => {
  await testEnv.clearFirestore();
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), PATH), { emails: ["tester@example.com"] });
  });
});

describe("config/betaAllowlist", () => {
  const who = () => [
    ["손님", testEnv.unauthenticatedContext().firestore()],
    ["팬", testEnv.authenticatedContext("fan", { email: "tester@example.com", email_verified: true }).firestore()],
    ["관리자", testEnv.authenticatedContext("op", { admin: true }).firestore()],
  ] as const;

  it("아무도 읽지 못한다", async () => {
    for (const [, fs] of who()) await assertFails(getDoc(doc(fs, PATH)));
  });
  it("아무도 쓰거나 지우지 못한다", async () => {
    for (const [, fs] of who()) {
      await assertFails(setDoc(doc(fs, PATH), { emails: ["me@example.com"] }));
      await assertFails(deleteDoc(doc(fs, PATH)));
    }
  });
});
