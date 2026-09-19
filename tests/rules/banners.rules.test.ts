/**
 * banners Firestore rules — ARENA-1 PR 1 (원장 D-21 배너 자리).
 *
 * 팬 화면(비로그인 포함)이 자리 이름으로 배너를 읽어 1건을 고르므로 읽기는 공개.
 * 쓰기는 `admin` 클레임만 — 관리 화면은 소킥 BANNER-1. 팬이 자리 내용을 바꾸면 모든
 * 팬의 화면이 바뀐다.
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
import { collection, doc, getDoc, getDocs, query, setDoc, where } from "firebase/firestore";

let testEnv: RulesTestEnvironment;

function bannerDoc() {
  return {
    slot: "arena-match-below",
    kind: "notice",
    title: { ko: "공지", en: "Notice", es: "Aviso" },
    active: true,
    priority: 1,
  };
}

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: "wc48-rules-banners",
    firestore: {
      rules: readFileSync("firestore.rules", "utf8"),
      host: "127.0.0.1",
      port: 8080,
    },
  });
});
afterAll(async () => testEnv?.cleanup());
beforeEach(async () => {
  await testEnv.clearFirestore();
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), "banners/b1"), bannerDoc());
  });
});

describe("banners — public read", () => {
  it("lets an UNAUTHENTICATED client read a banner", async () => {
    const db = testEnv.unauthenticatedContext().firestore();
    await assertSucceeds(getDoc(doc(db, "banners/b1")));
  });

  it("lets a client query by slot (BannerSlot 의 실제 읽기 모양)", async () => {
    const db = testEnv.unauthenticatedContext().firestore();
    await assertSucceeds(
      getDocs(query(collection(db, "banners"), where("slot", "==", "arena-match-below"))),
    );
  });
});

describe("banners — admin-only write", () => {
  it("DENIES an unauthenticated write", async () => {
    const db = testEnv.unauthenticatedContext().firestore();
    await assertFails(setDoc(doc(db, "banners/b2"), bannerDoc()));
  });

  it("DENIES a signed-in fan (no admin claim)", async () => {
    const db = testEnv.authenticatedContext("voter-uid").firestore();
    await assertFails(setDoc(doc(db, "banners/b1"), { ...bannerDoc(), active: false }));
  });

  it("ALLOWS a caller holding the admin custom claim", async () => {
    const db = testEnv.authenticatedContext("op-uid", { admin: true }).firestore();
    await assertSucceeds(setDoc(doc(db, "banners/b2"), bannerDoc()));
  });
});
