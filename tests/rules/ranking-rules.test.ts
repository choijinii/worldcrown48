/**
 * Firestore Rules — C-3 The Arena (ranking_cache public read · admin_alerts admin-only).
 *
 * Runs against the emulator (CI: firebase emulators:exec; locally needs Java 21
 * — [[feedback-firebase-tools-java21]]). Posture (handoff §14):
 *   - ranking_cache: public read; client writes blocked (cron admin SDK only).
 *   - ranking_cache/{tid}/history: T5 PR 2 부터 읽기 · 쓰기 모두 막힘(선택 수가 실린 옛 문서).
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

  // T5 PR 2 — 옛 공개 history 문서에는 선택 수가 실려 있다. 지우지 않고 읽기만 막는다(뒤집힘: 예전 ALLOWS).
  it("DENIES reading a history snapshot — 비로그인 · 로그인 · 관리자 클레임 모두 (T5 PR 2)", async () => {
    await seedTournament(-1 * DAY_MS);
    await testEnv.withSecurityRulesDisabled(async (c) => {
      await setDoc(doc(c.firestore(), "ranking_cache/t1/history/0"), cache());
    });
    for (const ctx of [
      testEnv.unauthenticatedContext(),
      testEnv.authenticatedContext(VOTER),
      testEnv.authenticatedContext(ADMIN, { admin: true }),
    ]) {
      await assertFails(getDoc(doc(ctx.firestore(), "ranking_cache/t1/history/0")));
      await assertFails(setDoc(doc(ctx.firestore(), "ranking_cache/t1/history/0"), cache()));
    }
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

// D-30 (2026-09-23 대표) — W-7 폐기. 차트는 마감 전에도, 로그인하지 않아도 열린다.
// "발표는 보여 주려고 하는 것"이고, 공유 링크로 들어온 팬이 바로 봐야 퍼진다.
// 아래 두 단언은 **뒤집힌 것**이다 — 예전에는 마감 전 읽기를 막는 것이 규칙이었다.
describe("ranking_cache — 상시 공개 (D-30 · W-7 폐기)", () => {
  it("ALLOWS read BEFORE the Deadline — 비로그인 포함 (뒤집힘: 예전 DENIES)", async () => {
    await seedTournament(30 * DAY_MS); // Deadline 30d ahead → still open
    await testEnv.withSecurityRulesDisabled(async (c) => {
      await setDoc(doc(c.firestore(), "ranking_cache/t1"), cache());
    });
    const db = testEnv.unauthenticatedContext().firestore();
    await assertSucceeds(getDoc(doc(db, "ranking_cache/t1")));
  });

  it("ALLOWS read AFTER the Deadline", async () => {
    await seedTournament(-1 * DAY_MS); // Deadline passed → revealed
    await testEnv.withSecurityRulesDisabled(async (c) => {
      await setDoc(doc(c.firestore(), "ranking_cache/t1"), cache());
    });
    const db = testEnv.unauthenticatedContext().firestore();
    await assertSucceeds(getDoc(doc(db, "ranking_cache/t1")));
  });

  it("DENIES a history read BEFORE the Deadline too (T5 PR 2 · 공개 history 닫힘)", async () => {
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

/** T5 PR 1 — 누적 · 다시 세기 요청 · 도우미 자리는 서버 전용(Admin SDK 크론만). 관리자 클레임도 못 읽고 못 쓴다. */
describe("T5 서버 전용 자리", () => {
  const PATHS = ["ranking_accum/t1", "ranking_accum/t1/history/0", "ranking_archive/t1", "ranking_archive/t1/gens/0", "ranking_recount_requests/t1", "ranking_recount_jobs/t1"];
  const layers: Array<[string, () => ReturnType<RulesTestEnvironment["unauthenticatedContext"]>]> = [
    ["비로그인", () => testEnv.unauthenticatedContext()],
    ["로그인", () => testEnv.authenticatedContext(VOTER)],
    ["관리자 클레임", () => testEnv.authenticatedContext(ADMIN, { admin: true })],
  ];
  for (const [label, ctx] of layers) {
    for (const p of PATHS) {
      it(`${label} — ${p} 읽기 · 쓰기 모두 막힌다`, async () => {
        await testEnv.withSecurityRulesDisabled(async (c) => {
          await setDoc(doc(c.firestore(), p), { x: 1 });
        });
        const db = ctx().firestore();
        await assertFails(getDoc(doc(db, p)));
        await assertFails(setDoc(doc(db, p), { x: 2 }));
      });
    }
  }
});
