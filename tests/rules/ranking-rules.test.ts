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
import { doc, getDoc, setDoc, Timestamp } from "firebase/firestore";

const VOTER = "voter-uid";
const ADMIN = "admin-uid";
const DAY_MS = 86_400_000;

let testEnv: RulesTestEnvironment;

// ranking_cache carries PURE Voter data only — no anomaly fields (W-2).
function cache() {
  return {
    tournamentId: "t1",
    rankings: [
      { rank: 1, contestantId: "c1", name: "P1", imageUrl: null, voteCount: 9, rate: 60 },
    ],
    totalVotes: 15,
    generationSequence: 0,
  };
}

/** Seed the parent Tournament whose deadline gates the ranking_cache read (W-7). */
async function seedTournament(deadlineFromNowMs: number) {
  await testEnv.withSecurityRulesDisabled(async (c) => {
    await setDoc(doc(c.firestore(), "tournaments/t1"), {
      title: "T",
      status: "active",
      tournamentDeadline: Timestamp.fromMillis(Date.now() + deadlineFromNowMs),
    });
  });
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

describe("ranking_cache — public read after Deadline, no client write", () => {
  it("lets anyone (even unauthenticated) read the cache once closed", async () => {
    await seedTournament(-1 * DAY_MS); // Deadline 1d ago → open ranking
    await testEnv.withSecurityRulesDisabled(async (c) => {
      await setDoc(doc(c.firestore(), "ranking_cache/t1"), cache());
    });
    const db = testEnv.unauthenticatedContext().firestore();
    await assertSucceeds(getDoc(doc(db, "ranking_cache/t1")));
  });

  it("lets anyone read a history snapshot once closed", async () => {
    await seedTournament(-1 * DAY_MS);
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

describe("ranking_cache — Tournament Deadline gate (W-7)", () => {
  it("DENIES read BEFORE the Deadline (locked)", async () => {
    await seedTournament(30 * DAY_MS); // Deadline 30d ahead → still open
    await testEnv.withSecurityRulesDisabled(async (c) => {
      await setDoc(doc(c.firestore(), "ranking_cache/t1"), cache());
    });
    const db = testEnv.unauthenticatedContext().firestore();
    await assertFails(getDoc(doc(db, "ranking_cache/t1")));
  });

  it("ALLOWS read AFTER the Deadline", async () => {
    await seedTournament(-1 * DAY_MS); // Deadline passed → revealed
    await testEnv.withSecurityRulesDisabled(async (c) => {
      await setDoc(doc(c.firestore(), "ranking_cache/t1"), cache());
    });
    const db = testEnv.unauthenticatedContext().firestore();
    await assertSucceeds(getDoc(doc(db, "ranking_cache/t1")));
  });

  it("DENIES a history read BEFORE the Deadline (locked)", async () => {
    await seedTournament(30 * DAY_MS);
    await testEnv.withSecurityRulesDisabled(async (c) => {
      await setDoc(doc(c.firestore(), "ranking_cache/t1/history/0"), cache());
    });
    const db = testEnv.unauthenticatedContext().firestore();
    await assertFails(getDoc(doc(db, "ranking_cache/t1/history/0")));
  });

  it("DENIES read when the parent Tournament doc is missing", async () => {
    // No tournaments/t1 seeded → the exists() guard short-circuits to deny.
    await testEnv.withSecurityRulesDisabled(async (c) => {
      await setDoc(doc(c.firestore(), "ranking_cache/t1"), cache());
    });
    const db = testEnv.unauthenticatedContext().firestore();
    await assertFails(getDoc(doc(db, "ranking_cache/t1")));
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
