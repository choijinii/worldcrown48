/**
 * categories Firestore rules — TX-0 Category Taxonomy (§9).
 *
 * The `categories` collection is PUBLIC reference data (loadCategories reads it
 * on page load, pre-auth on the Pitch), and writes require the `admin` custom
 * claim — the taxonomy is operated by the seed/migration scripts (admin SDK,
 * bypasses rules) or a future admin UI. A Voter must never mutate it.
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

function catDoc() {
  return {
    id: "KPOP",
    name: { ko: "K-POP", en: "K-POP", es: "K-POP" },
    status: "live",
    phase: 1,
    order: 1,
  };
}

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: "wc48-rules-categories",
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
  // Seed one category with rules disabled (mirrors the admin-SDK seed script).
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), "categories/KPOP"), catDoc());
  });
});

describe("categories — public read", () => {
  it("lets an UNAUTHENTICATED client read a category (pre-auth Pitch)", async () => {
    const db = testEnv.unauthenticatedContext().firestore();
    await assertSucceeds(getDoc(doc(db, "categories/KPOP")));
  });

  it("lets a signed-in Voter read a category (Lab dropdown)", async () => {
    const db = testEnv.authenticatedContext("voter-uid").firestore();
    await assertSucceeds(getDoc(doc(db, "categories/KPOP")));
  });
});

describe("categories — admin-only write", () => {
  it("DENIES an unauthenticated write", async () => {
    const db = testEnv.unauthenticatedContext().firestore();
    await assertFails(setDoc(doc(db, "categories/CREATOR"), catDoc()));
  });

  it("DENIES a signed-in Voter (no admin claim) creating a category", async () => {
    const db = testEnv.authenticatedContext("voter-uid").firestore();
    await assertFails(setDoc(doc(db, "categories/CREATOR"), catDoc()));
  });

  it("DENIES a Voter overwriting an existing category (no reshaping discovery)", async () => {
    const db = testEnv.authenticatedContext("voter-uid").firestore();
    await assertFails(
      setDoc(doc(db, "categories/KPOP"), { ...catDoc(), status: "hidden" }),
    );
  });

  it("ALLOWS a write from a caller holding the admin custom claim", async () => {
    const db = testEnv
      .authenticatedContext("op-uid", { admin: true })
      .firestore();
    await assertSucceeds(setDoc(doc(db, "categories/CREATOR"), catDoc()));
  });
});
