/**
 * T5 차트 증분 집계 — 저장부(rankingAccumStore) 에뮬레이터 통합 (PR 1 · Task 2).
 *
 * 순수 계산부(incrementalTally)는 functions 유닛 시험이 골든으로 지킨다. 여기는 그 계산을
 * **진짜 Firestore 쿼리**(createdAt · relinkedAt 구간 · 판 따로 읽기)에 얹었을 때도 같은 값이
 * 나오는지 본다. 지키는 것:
 *   · 구간 3개로 나눠 증분한 누적 = 한 번에 센 값(골든 묶음)
 *   · 구간 경계는 정수 ms 반열린 [start,end) — 끝 ms 보다 0.5ms 뒤 기록은 다음 구간 몫
 *   · 경계에 걸친 판은 다음 구간에서 판 따로 읽기 한 번(46건)으로 세어진다
 *   · 끝이 cursor 뒤가 아니면 아무것도 읽거나 쓰지 않는다
 *
 * Emulator-backed: run via `npm run test:rules` (wraps firebase emulators:exec).
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { deleteApp, initializeApp, type App } from "firebase-admin/app";
import { Timestamp, getFirestore, type Firestore } from "firebase-admin/firestore";
import {
  ACCUM,
  applyIncrement,
  readAccum,
  type AccumDoc,
  type ReadCounts,
} from "../../functions/src/core/rankingAccumStore";
import {
  RUN_VOTES,
  accumEquals,
  addAccum,
  countableAtMs,
  emptyAccum,
  runDelta,
  runKeyOf,
  voteCountDelta,
  type AccumVote,
} from "../../functions/src/core/incrementalTally";

const PROJECT_ID = "wc48-rules-ranking-accum";
process.env.FIRESTORE_EMULATOR_HOST ??= "127.0.0.1:8080";

let adminApp: App;
let db: Firestore;

const HOUR = 3_600_000;
const MIN = 60_000;
const CONTESTANTS = Array.from({ length: 48 }, (_, i) => `c${i}`);

/** 시험용 결정적 난수(mulberry32) — functions 유닛 시험의 골든 묶음과 같은 생성기. */
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffled<T>(xs: T[], r: () => number): T[] {
  const out = xs.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    const tmp = out[i];
    out[i] = out[j];
    out[j] = tmp;
  }
  return out;
}

let idSeq = 0;

interface MakeRunOpts {
  userId: string;
  runIndex?: number;
  guest?: boolean | "missing";
  startMs: number;
  stepMs: number;
  relinkAt?: number;
  take?: number;
}

/** 한 판 = 라운드 1~5 (24·12·6·3·1 = 46건). incrementalTally.test.ts 의 makeRun 과 같은 모양. */
function makeRun(o: MakeRunOpts): AccumVote[] {
  const r = rng(o.startMs + o.userId.length * 7919 + (o.runIndex ?? 0));
  const votes: AccumVote[] = [];
  let field = shuffled(CONTESTANTS, r);
  let t = o.startMs;
  const push = (round: number, m: number, contestantId: string) => {
    const created = t;
    t += o.stepMs;
    const relinked = o.relinkAt != null && created < o.relinkAt;
    const v: AccumVote = {
      id: `v${String(idSeq++).padStart(6, "0")}`,
      userId: o.userId,
      round,
      matchId: `t:r${round}:m${m}`,
      contestantId,
      createdAtMs: created,
      relinkedAtMs: relinked ? o.relinkAt! : null,
    };
    if (o.runIndex !== undefined) v.runIndex = o.runIndex;
    if (o.guest !== "missing") v.isGuest = relinked ? false : o.guest === true;
    votes.push(v);
  };
  for (let round = 1; round <= 4; round++) {
    const winners: string[] = [];
    for (let m = 0; m < field.length / 2; m++) {
      const w = r() < 0.5 ? field[2 * m] : field[2 * m + 1];
      winners.push(w);
      push(round, m, w);
    }
    field = winners;
  }
  push(5, 0, field[Math.floor(r() * 3)]);
  return votes.slice(0, o.take ?? RUN_VOTES);
}

const T1 = 10 * HOUR;
const T2 = 20 * HOUR;
const T3 = 30 * HOUR;

/** functions 유닛 시험 buildCorpus 와 같은 구성(로그인 · 게스트 · 옛 판 · 미완주 · 경계 · relink · 이어서). */
function buildCorpus(): AccumVote[] {
  const all: AccumVote[] = [];
  for (let i = 0; i < 20; i++) {
    const user = i < 5 ? "heavy" : `u${i}`;
    all.push(...makeRun({ userId: user, runIndex: i < 5 ? i + 1 : 1, startMs: i * HOUR + 1_000, stepMs: MIN }));
  }
  for (let i = 0; i < 3; i++) {
    all.push(...makeRun({ userId: `g${i}`, runIndex: 1, guest: true, startMs: (3 + i * 7) * HOUR, stepMs: MIN }));
  }
  all.push(...makeRun({ userId: "legacyRun", startMs: 2 * HOUR, stepMs: MIN }));
  all.push(...makeRun({ userId: "legacyGuestField", runIndex: 1, guest: "missing", startMs: 4 * HOUR, stepMs: MIN }));
  all.push(...makeRun({ userId: "quit1", runIndex: 1, startMs: 5 * HOUR, stepMs: MIN, take: 30 }));
  all.push(...makeRun({ userId: "quit2", runIndex: 2, startMs: 15 * HOUR, stepMs: MIN, take: 45 }));
  all.push(...makeRun({ userId: "cross1", runIndex: 1, startMs: T1 - 20 * MIN, stepMs: MIN }));
  all.push(...makeRun({ userId: "cross2", runIndex: 3, startMs: T2 - 45 * MIN, stepMs: MIN }));
  all.push(...makeRun({ userId: "relinked1", runIndex: 1, startMs: 6 * HOUR, stepMs: MIN, relinkAt: 12 * HOUR }));
  all.push(...makeRun({ userId: "relinked2", runIndex: 1, startMs: 18 * HOUR, stepMs: MIN, relinkAt: T3 + 5 }));
  all.push(...makeRun({ userId: "continued", runIndex: 1, startMs: T2 - 20 * MIN, stepMs: MIN, relinkAt: T2 - 1 }));
  return all;
}

/** 기록을 votes 문서로 심는다. 시각은 admin Timestamp 로 직접(서버 시각 흉내). */
async function seedVotes(tid: string, votes: AccumVote[], createdAt?: (v: AccumVote) => Timestamp) {
  for (let i = 0; i < votes.length; i += 400) {
    const batch = db.batch();
    for (const v of votes.slice(i, i + 400)) {
      const data: Record<string, unknown> = {
        tournamentId: tid,
        userId: v.userId,
        round: v.round,
        matchId: v.matchId,
        contestantId: v.contestantId,
        createdAt: createdAt ? createdAt(v) : Timestamp.fromMillis(v.createdAtMs),
      };
      if (v.runIndex !== undefined) data.runIndex = v.runIndex;
      if (v.isGuest !== undefined) data.isGuest = v.isGuest;
      if (v.relinkedAtMs != null) data.relinkedAt = Timestamp.fromMillis(v.relinkedAtMs);
      batch.set(db.collection("votes").doc(`${tid}_${v.id}`), data);
    }
    await batch.commit();
  }
}

const zeroReads = (): ReadCounts => ({ created: 0, relinked: 0, runFetch: 0, recount: 0, shadow: 0 });
const baseDoc = (tid: string, cursorMs = 0): AccumDoc => ({ tournamentId: tid, cursorMs, accum: emptyAccum(), updatedAtMs: 0 });
const sumCounts = (r: Record<string, number>) => Object.values(r).reduce((s, n) => s + n, 0);

async function clearFirestore() {
  const host = process.env.FIRESTORE_EMULATOR_HOST;
  await fetch(`http://${host}/emulator/v1/projects/${PROJECT_ID}/databases/(default)/documents`, { method: "DELETE" });
}

beforeAll(() => {
  adminApp = initializeApp({ projectId: PROJECT_ID }, `ranking-accum-${Date.now()}`);
  db = getFirestore(adminApp);
});

afterAll(async () => {
  await deleteApp(adminApp);
});

beforeEach(async () => {
  await clearFirestore();
});

describe("rankingAccumStore · applyIncrement (에뮬레이터)", () => {
  it("increment-equals-full: 구간 3개로 나눠 증분한 누적 = 한 번에 센 값", async () => {
    const tid = "goldT";
    const all = buildCorpus();
    await seedVotes(tid, all);
    // 다른 대회 기록은 섞이지 않는다
    await seedVotes("otherT", makeRun({ userId: "u1", runIndex: 1, startMs: 1_000, stepMs: MIN }));

    const E = all.reduce((mx, v) => Math.max(mx, countableAtMs(v)), 0) + 1;
    const groups = new Map<string, AccumVote[]>();
    for (const v of all) {
      const k = runKeyOf(v);
      groups.set(k, [...(groups.get(k) ?? []), v]);
    }
    const full = addAccum({ ...emptyAccum(), voteCounts: voteCountDelta(all, 0, E) }, runDelta(groups, 0, E));
    expect(full.runsTotal).toBe(27);

    const reads = zeroReads();
    let doc = baseDoc(tid);
    for (const end of [T1, T2, E]) {
      doc = await applyIncrement(db, tid, doc, end, reads);
      expect(doc.cursorMs).toBe(end);
    }
    expect(accumEquals(doc.accum, full)).toBe(true);

    // 저장된 문서도 같은 값
    const stored = await readAccum(db, tid);
    expect(stored).not.toBeNull();
    expect(stored!.tournamentId).toBe(tid);
    expect(stored!.cursorMs).toBe(E);
    expect(accumEquals(stored!.accum, full)).toBe(true);
    // 구간 읽기는 각 기록을 createdAt 으로 한 번 · relinkedAt 으로 한 번만
    expect(reads.created).toBe(all.length);
    expect(reads.relinked).toBe(all.filter((v) => v.relinkedAtMs != null).length);
  });

  it("boundary-sub-ms: 끝 ms + 0.5ms 기록은 [S,E) 에서 빠지고 [E,F) 에서 세어진다", async () => {
    const tid = "subMsT";
    const S = 1_700_000_000_000;
    const E = S + 10 * HOUR + 123; // ms 자리가 0 이 아닌 경계
    const F = E + 10 * HOUR;
    const [v] = makeRun({ userId: "u", runIndex: 1, startMs: E, stepMs: MIN, take: 1 });
    await seedVotes(tid, [v], () => new Timestamp(Math.floor(E / 1000), (E % 1000) * 1e6 + 500_000));

    const reads = zeroReads();
    let doc = await applyIncrement(db, tid, baseDoc(tid, S), E, reads);
    expect(sumCounts(doc.accum.voteCounts)).toBe(0);
    expect(reads.created).toBe(0);
    doc = await applyIncrement(db, tid, doc, F, reads);
    expect(sumCounts(doc.accum.voteCounts)).toBe(1);
    expect(doc.accum.voteCounts[v.contestantId]).toBe(1);
    expect(reads.created).toBe(1);
  });

  it("straddling-run-fetch: 라운드 1~4 는 앞 구간 · 라운드 5 는 다음 구간 → 판 따로 읽기 1번", async () => {
    const tid = "straddleT";
    const run = makeRun({ userId: "u", runIndex: 2, startMs: 1_000, stepMs: MIN });
    const cut = run[RUN_VOTES - 1].createdAtMs; // 라운드 5 기록의 시각
    await seedVotes(tid, run);

    const reads = zeroReads();
    let doc = await applyIncrement(db, tid, baseDoc(tid), cut, reads);
    expect(doc.accum.runsTotal).toBe(0);
    expect(sumCounts(doc.accum.voteCounts)).toBe(45);
    expect(reads.runFetch).toBe(0);

    doc = await applyIncrement(db, tid, doc, cut + HOUR, reads);
    expect(reads.runFetch).toBe(46);
    expect(doc.accum.runsTotal).toBe(1);
    expect(sumCounts(doc.accum.voteCounts)).toBe(46);
  });

  it("noop-when-end-not-after-cursor: 끝 <= cursor 면 읽지도 쓰지도 않고 base 를 돌려준다", async () => {
    const tid = "noopT";
    await seedVotes(tid, makeRun({ userId: "u", runIndex: 1, startMs: 1_000, stepMs: MIN }));
    const base = baseDoc(tid, 5 * HOUR);
    const reads = zeroReads();
    expect(await applyIncrement(db, tid, base, 5 * HOUR, reads)).toBe(base);
    expect(await applyIncrement(db, tid, base, 4 * HOUR, reads)).toBe(base);
    expect(reads).toEqual(zeroReads());
    expect((await db.collection(ACCUM).doc(tid).get()).exists).toBe(false);
    expect(await readAccum(db, tid)).toBeNull();
  });
});
