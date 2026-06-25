/**
 * Firestore Rules — C-3 The Arena (ranking_cache public read · admin_alerts admin-only).
 *
 * Runs against the emulator (CI: firebase emulators:exec; locally needs Java 21
 * — [[feedback-firebase-tools-java21]]). Posture (handoff §14):
 *   - ranking_cache + history: public read (the only Vote Rate % surface);
 *     client writes blocked (cron admin SDK only).
 *   - admin_alerts: read/write require the `admin` custom claim; a Voter must
 *     never see the anomaly model nor forge an alert.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { readFileSync } from "node:fs";
import { doc, getDoc, setDoc } from "firebase/firestore";

const VOTER = "voter-uid";
const ADMIN = "admin-uid";

let testEnv: RulesTestEnvironment;

function cache() {
  return {
    tournamentId: "t1",
    rankings: [
      { rank: 1, contestantId: "c1", name: "P1", imageUrl: null, voteCount: 9, rate: 60 },
    ],
    totalVotes: 15,
    anomalies: ["T-1"],
    anomalyDetail: "#1 P1 at 60% (≥60% threshold)",
    generationSequence: 0,
  };
}
function alert() {
  return {
    type: "T-1",
    tournamentId: "t1",
    detail: "#1 P1 at 60% (≥60% threshold)",
    resolved: false,
  };
}

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: "wc48-ranking-rules",
    firestore: {
      rules: readFileSync("firestore.rules", "utf8"),
      host: "127.0.0.1",
      port: 8080,
    },
  });
});
afterAll(async () => testEnv.cleanup());
beforeEach(async () => testEnv.clearFirestore());

describe("ranking_cache — public read, no client write", () => {
  it("lets anyone (even unauthenticated) read the cache", async () => {
    await testEnv.withSecurityRulesDisabled(async (c) => {
      await setDoc(doc(c.firestore(), "ranking_cache/t1"), cache());
    });
    const db = testEnv.unauthenticatedContext().firestore();
    await assertSucceeds(getDoc(doc(db, "ranking_cache/t1")));
  });

  it("lets anyone read a history snapshot", async () => {
    await testEnv.withSecurityRulesDisabled(async (c) => {
      await setDoc(doc(c.firestore(), "ranking_cache/t1/history/0"), cache());
    });
    const db = testEnv.unauthenticatedContext().firestore();
    await assertSucceeds(getDoc(doc(db, "ranking_cache/t1/history/0")));
  });

  it("DENIES a Voter writing the cache (cron admin SDK only)", async () => {
    const db = testEnv.authenticatedContext(VOTER).firestore();
    await assertFails(setDoc(doc(db, "ranking_cache/t1"), cache()));
  });

  it("DENIES even an admin-claim client writing the cache", async () => {
    const db = testEnv.authenticatedContext(ADMIN, { admin: true }).firestore();
    await assertFails(setDoc(doc(db, "ranking_cache/t1"), cache()));
  });
});

describe("admin_alerts — admin-claim only", () => {
  it("DENIES a Voter reading alerts", async () => {
    await testEnv.withSecurityRulesDisabled(async (c) => {
      await setDoc(doc(c.firestore(), "admin_alerts/a1"), alert());
    });
    const db = testEnv.authenticatedContext(VOTER).firestore();
    await assertFails(getDoc(doc(db, "admin_alerts/a1")));
  });

  it("DENIES a Voter writing an alert (forge guard)", async () => {
    const db = testEnv.authenticatedContext(VOTER).firestore();
    await assertFails(setDoc(doc(db, "admin_alerts/a1"), alert()));
  });

  it("lets an admin-claim user read alerts", async () => {
    await testEnv.withSecurityRulesDisabled(async (c) => {
      await setDoc(doc(c.firestore(), "admin_alerts/a1"), alert());
    });
    const db = testEnv.authenticatedContext(ADMIN, { admin: true }).firestore();
    await assertSucceeds(getDoc(doc(db, "admin_alerts/a1")));
  });
});
