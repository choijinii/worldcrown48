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
import { doc, getDoc, setDoc, deleteDoc, serverTimestamp } from "firebase/firestore";

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

  // HF-1.6: a Voter entering a NEW Tournament has no roundProgress doc yet.
  // The read rule must allow the get/listen on the not-yet-existing doc so
  // useRoundTransition's onSnapshot listener survives (otherwise it errors and
  // terminates → no round-transition overlay, THE FINAL hangs until refresh).
  it("lets the owner get/listen their OWN roundProgress before it exists", async () => {
    const db = testEnv.authenticatedContext(VOTER).firestore();
    await assertSucceeds(getDoc(doc(db, `roundProgress/${VOTER}_t1`)));
  });

  it("forbids get/listen on another Voter's not-yet-existing roundProgress", async () => {
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

describe("crown_cards (C-2) — owner read, featured public, no client write", () => {
  it("lets the owner read their own crown card", async () => {
    await testEnv.withSecurityRulesDisabled(async (c) => {
      await setDoc(doc(c.firestore(), `crown_cards/${VOTER}_t1`), {
        voterUid: VOTER,
        championId: "c1",
        featured: false,
      });
    });
    const db = testEnv.authenticatedContext(VOTER).firestore();
    await assertSucceeds(getDoc(doc(db, `crown_cards/${VOTER}_t1`)));
  });

  // HF-1.6: owner can get/listen their card before onChampionConfirmed writes
  // it — same not-yet-existing-doc trap as roundProgress.
  it("lets the owner get/listen their OWN crown card before it exists", async () => {
    const db = testEnv.authenticatedContext(VOTER).firestore();
    await assertSucceeds(getDoc(doc(db, `crown_cards/${VOTER}_t1`)));
  });

  it("lets an authed Voter read a featured crown card (Hall of Fame)", async () => {
    await testEnv.withSecurityRulesDisabled(async (c) => {
      await setDoc(doc(c.firestore(), `crown_cards/${OTHER}_t1`), {
        voterUid: OTHER,
        championId: "c1",
        featured: true,
      });
    });
    const db = testEnv.authenticatedContext(VOTER).firestore();
    await assertSucceeds(getDoc(doc(db, `crown_cards/${OTHER}_t1`)));
  });

  it("forbids reading another Voter's non-featured crown card", async () => {
    await testEnv.withSecurityRulesDisabled(async (c) => {
      await setDoc(doc(c.firestore(), `crown_cards/${OTHER}_t1`), {
        voterUid: OTHER,
        championId: "c1",
        featured: false,
      });
    });
    const db = testEnv.authenticatedContext(VOTER).firestore();
    await assertFails(getDoc(doc(db, `crown_cards/${OTHER}_t1`)));
  });

  it("DENIES a Voter writing a crown card (onChampionConfirmed/admin only)", async () => {
    const db = testEnv.authenticatedContext(VOTER).firestore();
    await assertFails(
      setDoc(doc(db, `crown_cards/${VOTER}_t1`), {
        voterUid: VOTER,
        championId: "c1",
        featured: false,
      }),
    );
  });
});

describe("daily_participation (HF-1) — owner read, no client write", () => {
  const DATE = "2026-07-05";

  it("lets the owner read their own participation doc (`${uid}_${date}`)", async () => {
    await testEnv.withSecurityRulesDisabled(async (c) => {
      await setDoc(doc(c.firestore(), `daily_participation/${VOTER}_${DATE}`), {
        tournamentIds: ["t1", "t2"],
      });
    });
    const db = testEnv.authenticatedContext(VOTER).firestore();
    await assertSucceeds(getDoc(doc(db, `daily_participation/${VOTER}_${DATE}`)));
  });

  it("forbids reading another Voter's participation doc", async () => {
    await testEnv.withSecurityRulesDisabled(async (c) => {
      await setDoc(doc(c.firestore(), `daily_participation/${OTHER}_${DATE}`), {
        tournamentIds: ["t1"],
      });
    });
    const db = testEnv.authenticatedContext(VOTER).firestore();
    await assertFails(getDoc(doc(db, `daily_participation/${OTHER}_${DATE}`)));
  });

  it("DENIES a Voter writing their participation doc (onVote/admin only)", async () => {
    const db = testEnv.authenticatedContext(VOTER).firestore();
    await assertFails(
      setDoc(doc(db, `daily_participation/${VOTER}_${DATE}`), {
        tournamentIds: ["t1"],
      }),
    );
  });
});

describe("bracket_seeds (HF-2) — owner read via doc-id prefix, create-once, immutable", () => {
  function seedDoc() {
    return { seed: 12345, createdAt: serverTimestamp() };
  }

  it("lets the owner read their own seed doc (`${uid}_${tid}`)", async () => {
    await testEnv.withSecurityRulesDisabled(async (c) => {
      await setDoc(doc(c.firestore(), `bracket_seeds/${VOTER}_t1`), {
        seed: 42,
        createdAt: new Date(),
      });
    });
    const db = testEnv.authenticatedContext(VOTER).firestore();
    await assertSucceeds(getDoc(doc(db, `bracket_seeds/${VOTER}_t1`)));
  });

  it("forbids reading another Voter's seed doc", async () => {
    await testEnv.withSecurityRulesDisabled(async (c) => {
      await setDoc(doc(c.firestore(), `bracket_seeds/${OTHER}_t1`), {
        seed: 42,
        createdAt: new Date(),
      });
    });
    const db = testEnv.authenticatedContext(VOTER).firestore();
    await assertFails(getDoc(doc(db, `bracket_seeds/${OTHER}_t1`)));
  });

  // HF-1.6 lesson (PR #37): the read rule MUST authorize the owner off the DOC
  // ID, never resource.data — a Voter's Arena entry get/listens the seed doc
  // BEFORE it is created, and a resource.data owner check would permission-deny
  // that read and kill the listener. Doc-absent owner read must SUCCEED.
  it("lets the owner get/listen their OWN seed doc before it exists", async () => {
    const db = testEnv.authenticatedContext(VOTER).firestore();
    await assertSucceeds(getDoc(doc(db, `bracket_seeds/${VOTER}_t1`)));
  });

  it("forbids get/listen on another Voter's not-yet-existing seed doc", async () => {
    const db = testEnv.authenticatedContext(VOTER).firestore();
    await assertFails(getDoc(doc(db, `bracket_seeds/${OTHER}_t1`)));
  });

  it("lets the owner CREATE their own seed doc once (Arena entry)", async () => {
    const db = testEnv.authenticatedContext(VOTER).firestore();
    await assertSucceeds(
      setDoc(doc(db, `bracket_seeds/${VOTER}_t1`), seedDoc()),
    );
  });

  it("DENIES creating a seed doc under another Voter's id", async () => {
    const db = testEnv.authenticatedContext(VOTER).firestore();
    await assertFails(
      setDoc(doc(db, `bracket_seeds/${OTHER}_t1`), seedDoc()),
    );
  });

  it("DENIES updating an existing seed doc (seed is immutable — no reshuffle)", async () => {
    await testEnv.withSecurityRulesDisabled(async (c) => {
      await setDoc(doc(c.firestore(), `bracket_seeds/${VOTER}_t1`), {
        seed: 42,
        createdAt: new Date(),
      });
    });
    const db = testEnv.authenticatedContext(VOTER).firestore();
    await assertFails(
      setDoc(doc(db, `bracket_seeds/${VOTER}_t1`), seedDoc()),
    );
  });

  it("DENIES deleting a seed doc", async () => {
    await testEnv.withSecurityRulesDisabled(async (c) => {
      await setDoc(doc(c.firestore(), `bracket_seeds/${VOTER}_t1`), {
        seed: 42,
        createdAt: new Date(),
      });
    });
    const db = testEnv.authenticatedContext(VOTER).firestore();
    await assertFails(deleteDoc(doc(db, `bracket_seeds/${VOTER}_t1`)));
  });
});

/**
 * RUN-1 — 판(Run) 원장과 게스트 한도의 소유자 규칙.
 *
 * 두 컬렉션 모두 서버(onVote·linkSessionVote, admin SDK) 전용 쓰기다. 클라이언트가
 * 쓸 수 있으면 한도를 초기화해 하루 5판 규칙이 사라지고, guest_runs는 §9 함정 4
 * (게스트 uid는 브라우저마다 새로 생기니 랭킹 조작 비용 0)로 직행한다.
 */
describe("tournament_runs / guest_runs (RUN-1)", () => {
  it("소유자는 자기 문서를 읽는다 — 문서가 없어도 거부되지 않는다", async () => {
    const db = testEnv.authenticatedContext(VOTER).firestore();
    await assertSucceeds(getDoc(doc(db, "tournament_runs", `${VOTER}_gen4_idol_48`)));
  });

  it("남의 문서는 못 읽는다", async () => {
    const db = testEnv.authenticatedContext(OTHER).firestore();
    await assertFails(getDoc(doc(db, "tournament_runs", `${VOTER}_gen4_idol_48`)));
  });

  it("tournamentId의 '_'와 회차 접미사가 소유자 판정을 깨지 않는다 (§9 함정 2)", async () => {
    const db = testEnv.authenticatedContext(VOTER).firestore();
    await assertSucceeds(getDoc(doc(db, "tournament_runs", `${VOTER}_best_stage_48`)));
  });

  it("클라이언트는 한도를 고쳐 쓸 수 없다 — 서버 전용", async () => {
    const db = testEnv.authenticatedContext(VOTER).firestore();
    await assertFails(
      setDoc(doc(db, "tournament_runs", `${VOTER}_gen4_idol_48`), {
        runIndex: 1,
        runsToday: 0,
        lastRunDate: "2026-09-06",
      }),
    );
  });

  it("게스트는 자기 guest_runs를 읽고, 남의 것은 못 읽는다", async () => {
    const mine = testEnv.authenticatedContext(VOTER).firestore();
    const other = testEnv.authenticatedContext(OTHER).firestore();
    await assertSucceeds(getDoc(doc(mine, "guest_runs", VOTER)));
    await assertFails(getDoc(doc(other, "guest_runs", VOTER)));
  });

  it("guest_runs도 클라이언트 쓰기 차단 — 풀리면 랭킹 조작 비용이 0이 된다 (§9 함정 4)", async () => {
    const db = testEnv.authenticatedContext(VOTER).firestore();
    await assertFails(
      setDoc(doc(db, "guest_runs", VOTER), { runsToday: 0, lastRunDate: "2026-09-06" }),
    );
  });

  it("로그인하지 않으면 아무것도 못 읽는다", async () => {
    const db = testEnv.unauthenticatedContext().firestore();
    await assertFails(getDoc(doc(db, "tournament_runs", `${VOTER}_gen4_idol_48`)));
    await assertFails(getDoc(doc(db, "guest_runs", VOTER)));
  });
});
