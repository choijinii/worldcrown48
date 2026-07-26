/**
 * news Firestore rules — integration tier (ND-1 §11.4, AC 5).
 *
 * Proves the승인제 뉴스 팩토리 boundary:
 *   - published article → public read (unauth OK) — /news, /news/[slug], NewsRail
 *   - draft / archived → NOT public read (AC 5: draft public에서 read 불가)
 *   - admin custom claim → reads ANY status (초안 대기함)
 *   - write requires admin claim (a Voter can't create/publish); news_generation
 *     counter is fully denied to clients (callable/admin-SDK only)
 *
 * Emulator-backed: run via `npm run test:rules`.
 */
import { readFileSync } from "node:fs";
import { afterAll, beforeAll, describe, it } from "vitest";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";

let testEnv: RulesTestEnvironment;

const publishedDoc = {
  slug: "20260722-pub001",
  status: "published",
  template: "open",
  origin: "manual_ai",
  title: { ko: "발행 기사", en: "", es: "" },
};
const draftDoc = { ...publishedDoc, slug: "20260722-drf001", status: "draft" };
const archivedDoc = { ...publishedDoc, slug: "20260722-arc001", status: "archived" };

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: "wc48-rules-news",
    firestore: {
      rules: readFileSync("firestore.rules", "utf8"),
      host: "127.0.0.1",
      port: 8080,
    },
  });
  // Seed with rules disabled (mirrors the admin-SDK / callable writes).
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, "news/20260722-pub001"), publishedDoc);
    await setDoc(doc(db, "news/20260722-drf001"), draftDoc);
    await setDoc(doc(db, "news/20260722-arc001"), archivedDoc);
    await setDoc(doc(db, "news_generation/op_2026-07-22"), { count: 3 });
  });
});

afterAll(async () => {
  await testEnv?.cleanup();
});

describe("news read — published만 public (AC 5)", () => {
  it("allows an UNAUTHENTICATED read of a published article", async () => {
    const db = testEnv.unauthenticatedContext().firestore();
    await assertSucceeds(getDoc(doc(db, "news/20260722-pub001")));
  });

  it("DENIES public read of a draft", async () => {
    const db = testEnv.unauthenticatedContext().firestore();
    await assertFails(getDoc(doc(db, "news/20260722-drf001")));
  });

  it("DENIES public read of an archived (내려간) article", async () => {
    const db = testEnv.unauthenticatedContext().firestore();
    await assertFails(getDoc(doc(db, "news/20260722-arc001")));
  });

  it("DENIES a signed-in Voter (no admin claim) reading a draft", async () => {
    const db = testEnv.authenticatedContext("voter-uid").firestore();
    await assertFails(getDoc(doc(db, "news/20260722-drf001")));
  });

  it("allows an admin-claim operator to read a draft", async () => {
    const db = testEnv.authenticatedContext("op-uid", { admin: true }).firestore();
    await assertSucceeds(getDoc(doc(db, "news/20260722-drf001")));
  });
});

describe("news write — admin claim만", () => {
  it("DENIES a Voter creating an article", async () => {
    const db = testEnv.authenticatedContext("voter-uid").firestore();
    await assertFails(
      setDoc(doc(db, "news/forged"), { ...publishedDoc, slug: "forged" }),
    );
  });

  it("DENIES a Voter publishing (draft→published) an existing article", async () => {
    const db = testEnv.authenticatedContext("voter-uid").firestore();
    await assertFails(
      updateDoc(doc(db, "news/20260722-drf001"), { status: "published" }),
    );
  });

  it("allows an admin-claim operator to publish", async () => {
    const db = testEnv.authenticatedContext("op-uid", { admin: true }).firestore();
    await assertSucceeds(
      updateDoc(doc(db, "news/20260722-drf001"), { status: "published" }),
    );
  });
});

describe("news_generation — 클라이언트 완전 차단", () => {
  it("DENIES an admin-claim operator reading the rate counter (callable-only)", async () => {
    const db = testEnv.authenticatedContext("op-uid", { admin: true }).firestore();
    await assertFails(getDoc(doc(db, "news_generation/op_2026-07-22")));
  });
  it("DENIES any client write to the rate counter", async () => {
    const db = testEnv.authenticatedContext("op-uid", { admin: true }).firestore();
    await assertFails(setDoc(doc(db, "news_generation/op_x"), { count: 0 }));
  });
});
