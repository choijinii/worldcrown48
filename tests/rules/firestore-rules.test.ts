/**
 * Firestore Security Rules — B-1 tournaments + contestants (handoff §3, 부록 A).
 *
 * Runs against the Firestore emulator via @firebase/rules-unit-testing. Java
 * isn't available on every dev box, so this is wired to run in CI
 * (firebase emulators:exec). Locally:
 *   firebase emulators:exec --only firestore \
 *     "vitest run --config vitest.integration.config.ts"
 *
 * Posture under test (대표 decisions 2026-06-21):
 *   - tournaments read: featured==true OR owner (hostUid == auth.uid)
 *   - tournaments/contestants writes: owner-scoped (no custom claims in MVP1;
 *     operator-only is enforced client-side by AdminAuthGuard)
 *   - hostUid is denormalized onto contestants so create rules are batch-safe
 */
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "vitest";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { readFileSync } from "node:fs";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";

const OPERATOR = "operator-uid";
const VOTER = "voter-uid";

let testEnv: RulesTestEnvironment;

function tournament(hostUid: string, featured = false) {
  return {
    title: "Best Strikers",
    category: "FOOTBALL",
    status: "active",
    hostUid,
    currentRound: 1,
    totalContestants: 48,
    settings: { aiNews: false, multiLang: false, showRanking: true },
    featured,
  };
}

function contestant(hostUid: string, tournamentId = "t1") {
  return {
    tournamentId,
    hostUid,
    order: 1,
    name: "P1",
    nationality: "KR",
    position: "FW",
    imageUrl: "",
    imageSearchKeyword: "p1",
  };
}

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: "wc48-rules-test",
    firestore: {
      rules: readFileSync("firestore.rules", "utf8"),
      host: "127.0.0.1",
      port: 8080,
    },
  });
});

afterAll(async () => {
  await testEnv.cleanup();
});

beforeEach(async () => {
  await testEnv.clearFirestore();
});

describe("tournaments rules", () => {
  it("lets an operator create a Tournament they host", async () => {
    const db = testEnv.authenticatedContext(OPERATOR).firestore();
    await assertSucceeds(setDoc(doc(db, "tournaments/t1"), tournament(OPERATOR)));
  });

  it("rejects creating a Tournament hosted by someone else", async () => {
    const db = testEnv.authenticatedContext(VOTER).firestore();
    await assertFails(setDoc(doc(db, "tournaments/t1"), tournament(OPERATOR)));
  });

  it("rejects an unauthenticated create", async () => {
    const db = testEnv.unauthenticatedContext().firestore();
    await assertFails(setDoc(doc(db, "tournaments/t1"), tournament(OPERATOR)));
  });

  it("lets the owner read their own non-featured Tournament", async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "tournaments/t1"), tournament(OPERATOR));
    });
    const db = testEnv.authenticatedContext(OPERATOR).firestore();
    await assertSucceeds(getDoc(doc(db, "tournaments/t1")));
  });

  it("lets anyone read a featured Tournament", async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(
        doc(ctx.firestore(), "tournaments/feat"),
        tournament(OPERATOR, true),
      );
    });
    const db = testEnv.unauthenticatedContext().firestore();
    await assertSucceeds(getDoc(doc(db, "tournaments/feat")));
  });

  it("forbids a Voter reading an operator's non-featured Tournament", async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "tournaments/t1"), tournament(OPERATOR));
    });
    const db = testEnv.authenticatedContext(VOTER).firestore();
    await assertFails(getDoc(doc(db, "tournaments/t1")));
  });

  it("forbids a non-owner updating or deleting", async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "tournaments/t1"), tournament(OPERATOR));
    });
    const db = testEnv.authenticatedContext(VOTER).firestore();
    await assertFails(updateDoc(doc(db, "tournaments/t1"), { featured: true }));
    await assertFails(deleteDoc(doc(db, "tournaments/t1")));
  });
});

describe("contestants rules", () => {
  it("lets an operator create a Contestant they host (batch-safe hostUid)", async () => {
    const db = testEnv.authenticatedContext(OPERATOR).firestore();
    await assertSucceeds(
      setDoc(doc(db, "contestants/c1"), contestant(OPERATOR)),
    );
  });

  it("rejects creating a Contestant hosted by someone else", async () => {
    const db = testEnv.authenticatedContext(VOTER).firestore();
    await assertFails(setDoc(doc(db, "contestants/c1"), contestant(OPERATOR)));
  });

  it("forbids a Voter reading an operator's Contestant", async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "contestants/c1"), contestant(OPERATOR));
    });
    const db = testEnv.authenticatedContext(VOTER).firestore();
    await assertFails(getDoc(doc(db, "contestants/c1")));
  });
});
