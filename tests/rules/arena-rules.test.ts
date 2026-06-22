/**
 * Firestore Rules — C-1 The Arena (Voter read relaxation + write denials).
 *
 * Runs against the emulator (CI: firebase emulators:exec; locally needs Java 21).
 * Posture (대표 decisions + ADR-0001):
 *   - tournaments: Voter reads ACTIVE (active-public); writes operator-only.
 *   - contestants: public read; writes operator-only.
 *   - votes: read owner; write blocked (onVote/admin only).
 *   - roundProgress: read owner; write blocked (advanceRound/admin only).
 * Negative tests prove a Voter can never write tournaments/contestants/votes/
 * roundProgress directly.
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
import { doc, getDoc, setDoc } from "firebase/firestore";

const OPERATOR = "operator-uid";
const VOTER = "voter-uid";
const OTHER = "other-uid";

let testEnv: RulesTestEnvironment;

function tournament(status: string, featured = false, hostUid = OPERATOR) {
  return {
    title: "Strikers",
    category: "FOOTBALL",
    status,
    hostUid,
    currentRound: 1,
    totalContestants: 48,
    settings: { aiNews: false, multiLang: false, showRanking: true },
    featured,
  };
}
function contestant() {
  return {
    tournamentId: "t1",
    hostUid: OPERATOR,
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
    projectId: "wc48-arena-rules",
    firestore: {
      rules: readFileSync("firestore.rules", "utf8"),
      host: "127.0.0.1",
      port: 8080,
    },
  });
});
afterAll(async () => testEnv.cleanup());
beforeEach(async () => testEnv.clearFirestore());

describe("tournaments — Voter read", () => {
  it("lets anyone read an ACTIVE tournament (active-public)", async () => {
    await testEnv.withSecurityRulesDisabled(async (c) => {
      await setDoc(doc(c.firestore(), "tournaments/t1"), tournament("active"));
    });
    const db = testEnv.unauthenticatedContext().firestore();
    await assertSucceeds(getDoc(doc(db, "tournaments/t1")));
  });

  it("forbids reading a draft (non-active, non-featured, non-owned) tournament", async () => {
    await testEnv.withSecurityRulesDisabled(async (c) => {
      await setDoc(doc(c.firestore(), "tournaments/t1"), tournament("draft"));
    });
    const db = testEnv.authenticatedContext(VOTER).firestore();
    await assertFails(getDoc(doc(db, "tournaments/t1")));
  });

  // Owner-scoped (B-1/ADR-0002): a Voter cannot write an OPERATOR-owned
  // tournament. (Self-owned creates stay allowed by the owner-scoped rule —
  // operator-only is a client gate, not a rules gate; see report note.)
  it("DENIES a Voter writing an operator-owned tournament", async () => {
    const db = testEnv.authenticatedContext(VOTER).firestore();
    await assertFails(
      setDoc(doc(db, "tournaments/t1"), tournament("active", false, OPERATOR)),
    );
  });
});

describe("contestants — public read, no Voter write", () => {
  it("lets anyone read contestants", async () => {
    await testEnv.withSecurityRulesDisabled(async (c) => {
      await setDoc(doc(c.firestore(), "contestants/c1"), contestant());
    });
    const db = testEnv.unauthenticatedContext().firestore();
    await assertSucceeds(getDoc(doc(db, "contestants/c1")));
  });

  it("DENIES a Voter writing a contestant", async () => {
    const db = testEnv.authenticatedContext(VOTER).firestore();
    await assertFails(setDoc(doc(db, "contestants/c1"), contestant()));
  });
});

describe("votes — owner read, no direct client write", () => {
  it("DENIES a Voter writing a vote directly (onVote/admin only)", async () => {
    const db = testEnv.authenticatedContext(VOTER).firestore();
    await assertFails(
      setDoc(doc(db, "votes/v1"), {
        userId: VOTER,
        tournamentId: "t1",
        round: 1,
        matchId: "t1:r1:m0",
        contestantId: "c1",
        date: "2026-06-22",
      }),
    );
  });
});

describe("roundProgress — owner read, no client write", () => {
  it("lets the owner read their own roundProgress", async () => {
    await testEnv.withSecurityRulesDisabled(async (c) => {
      await setDoc(doc(c.firestore(), `roundProgress/${VOTER}_t1`), {
        userId: VOTER,
        tournamentId: "t1",
        toRound: 2,
      });
    });
    const db = testEnv.authenticatedContext(VOTER).firestore();
    await assertSucceeds(getDoc(doc(db, `roundProgress/${VOTER}_t1`)));
  });

  it("forbids reading another Voter's roundProgress", async () => {
    await testEnv.withSecurityRulesDisabled(async (c) => {
      await setDoc(doc(c.firestore(), `roundProgress/${OTHER}_t1`), {
        userId: OTHER,
        tournamentId: "t1",
        toRound: 2,
      });
    });
    const db = testEnv.authenticatedContext(VOTER).firestore();
    await assertFails(getDoc(doc(db, `roundProgress/${OTHER}_t1`)));
  });

  it("DENIES a Voter writing roundProgress (advanceRound/admin only)", async () => {
    const db = testEnv.authenticatedContext(VOTER).firestore();
    await assertFails(
      setDoc(doc(db, `roundProgress/${VOTER}_t1`), {
        userId: VOTER,
        tournamentId: "t1",
        complete: true,
        championId: "c1",
      }),
    );
  });
});
