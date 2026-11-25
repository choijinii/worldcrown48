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
 *   · 처음부터 다시 세기(userId 순 페이지) = 한 번에 센 값 · 예산에 닿으면 이어 세기 · 요청 문서 정리
 *
 * Emulator-backed: run via `npm run test:rules` (wraps firebase emulators:exec).
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { deleteApp, initializeApp, type App } from "firebase-admin/app";
import { FieldValue, Timestamp, getFirestore, type Firestore } from "firebase-admin/firestore";
import {
  ACCUM,
  JOBS,
  REQUESTS,
  applyIncrement,
  publishTournament,
  runRecountHelper,
  readAccum,
  addRecountRequestToBatch,
  clearFinalMarker,
  requestRecount,
  runRecount,
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
  type RankingAccum,
} from "../../functions/src/core/incrementalTally";
import { buildTallies, contestantMetaOf, tallyVotes } from "../../functions/src/core/rankingAggregator";
import { buildRankingUpdate } from "../../functions/src/core/scheduleRankingCacheCore";
import { tallyRuns, type RunVote } from "../../lib/ranking/tallyRuns";
import { toPublicEntry } from "../../lib/ranking/publicEntry";
import { toRateOrdered } from "../../functions/src/core/scheduleRankingCacheCore";
import { relinkGuestVotes } from "../../functions/src/linkSessionVote";
import { deleteUserVotes } from "../../functions/src/onUserDelete";

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

/** 루트 firebase-admin 의 서버 시각 표지 — functions 쪽 FieldValue 는 이 db 가 직렬화하지 못한다. */
const serverTime = () => FieldValue.serverTimestamp();
const zeroReads = (): ReadCounts => ({ created: 0, relinked: 0, runFetch: 0, recount: 0, shadow: 0, count: 0 });
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

/** 메모리에서 [0, endMs) 를 한 번에 센 값 — 다시 세기의 기대값. */
function fullAccum(all: AccumVote[], endMs: number) {
  const groups = new Map<string, AccumVote[]>();
  for (const v of all) {
    const k = runKeyOf(v);
    groups.set(k, [...(groups.get(k) ?? []), v]);
  }
  return addAccum({ ...emptyAccum(), voteCounts: voteCountDelta(all, 0, endMs) }, runDelta(groups, 0, endMs));
}

const corpusEnd = (all: AccumVote[]) => all.reduce((mx, v) => Math.max(mx, countableAtMs(v)), 0) + 1;
const tick = () => new Promise((r) => setTimeout(r, 20));

describe("rankingAccumStore · runRecount (에뮬레이터)", () => {
  it("recount-paging-carry: 7건씩 userId 순 페이지로 다시 센 값 = 한 번에 센 값", async () => {
    const tid = "recountT";
    const all = buildCorpus();
    await seedVotes(tid, all);
    await seedVotes("otherT", makeRun({ userId: "u1", runIndex: 1, startMs: 1_000, stepMs: MIN }));
    const E = corpusEnd(all);

    const reads = zeroReads();
    const res = await runRecount(
      db,
      tid,
      { asOfMs: E, final: false, deadlineAtMs: Number.POSITIVE_INFINITY, nowMs: () => Date.now(), pageSize: 7 },
      reads,
    );
    expect(res.done).toBe(true);
    if (!res.done) return;
    const full = fullAccum(all, E);
    expect(full.runsTotal).toBe(27);
    expect(res.accum.cursorMs).toBe(E);
    expect(accumEquals(res.accum.accum, full)).toBe(true);
    const stored = await readAccum(db, tid);
    expect(stored!.cursorMs).toBe(E);
    expect(accumEquals(stored!.accum, full)).toBe(true);
    // 페이지 끝에서 버린 사람은 다음 페이지가 다시 읽으므로 읽은 수 >= 기록 수
    expect(reads.recount).toBeGreaterThanOrEqual(all.length);
    expect((await db.collection(JOBS).doc(tid).get()).exists).toBe(false);
  });

  it("recount-resume: 첫 페이지 뒤 예산 초과 → job 문서 → 두 번째 호출로 끝 · 값 같음 · job 없어짐", async () => {
    const tid = "resumeT";
    const all = buildCorpus();
    await seedVotes(tid, all);
    const E = corpusEnd(all);

    const reads = zeroReads();
    const first = await runRecount(
      db,
      tid,
      { asOfMs: E, final: true, deadlineAtMs: 0, nowMs: () => Date.now(), pageSize: 100 },
      reads,
    );
    expect(first.done).toBe(false);
    const job = await db.collection(JOBS).doc(tid).get();
    expect(job.exists).toBe(true);
    expect(job.data()!.asOfMs).toBe(E);
    expect(job.data()!.final).toBe(true);
    expect(typeof job.data()!.lastUserId).toBe("string");
    expect((await db.collection(ACCUM).doc(tid).get()).exists).toBe(false);

    const second = await runRecount(
      db,
      tid,
      { asOfMs: E, final: true, deadlineAtMs: Number.POSITIVE_INFINITY, nowMs: () => Date.now(), pageSize: 100 },
      reads,
    );
    expect(second.done).toBe(true);
    if (!second.done) return;
    expect(accumEquals(second.accum.accum, fullAccum(all, E))).toBe(true);
    expect((await db.collection(JOBS).doc(tid).get()).exists).toBe(false);
  });

  it("request-during-recount: 다시 세기 중간에 들어온 요청은 끝난 뒤에도 남는다", async () => {
    const tid = "reqDuringT";
    await seedVotes(tid, makeRun({ userId: "a", runIndex: 1, startMs: 1_000, stepMs: MIN }));
    await seedVotes(tid, makeRun({ userId: "b", runIndex: 1, startMs: 1_000, stepMs: MIN }));
    const opts = { asOfMs: 10 * HOUR, final: false, nowMs: () => Date.now(), pageSize: 46 };
    const first = await runRecount(db, tid, { ...opts, deadlineAtMs: 0 }, zeroReads());
    expect(first.done).toBe(false);
    await tick();
    await requestRecount(db, tid, "user-delete", serverTime);
    const second = await runRecount(db, tid, { ...opts, deadlineAtMs: Number.POSITIVE_INFINITY }, zeroReads());
    expect(second.done).toBe(true);
    const req = await db.collection(REQUESTS).doc(tid).get();
    expect(req.exists).toBe(true);
    expect(req.data()!.reason).toBe("user-delete");
    expect(req.data()!.tournamentId).toBe(tid);
  });

  it("request-before-recount-cleared: 다시 세기 전에 들어온 요청은 끝날 때 지워진다", async () => {
    const tid = "reqBeforeT";
    await seedVotes(tid, makeRun({ userId: "a", runIndex: 1, startMs: 1_000, stepMs: MIN }));
    await requestRecount(db, tid, "admin", serverTime);
    expect((await db.collection(REQUESTS).doc(tid).get()).exists).toBe(true);
    // 시계 차이 여유(5초)보다 앞선 요청이어야 지운다 → 시작 시각을 10초 뒤로 흉내
    const res = await runRecount(
      db,
      tid,
      { asOfMs: 10 * HOUR, final: false, deadlineAtMs: Number.POSITIVE_INFINITY, nowMs: () => Date.now() + 10_000 },
      zeroReads(),
    );
    expect(res.done).toBe(true);
    expect((await db.collection(REQUESTS).doc(tid).get()).exists).toBe(false);
  });

  it("relink-after-asOf: asOf 뒤에 옮겨진 기록은 다시 세기에서 빠지고 이어지는 증분에서 한 번 세어진다", async () => {
    const tid = "relinkAsOfT";
    const all = buildCorpus();
    await seedVotes(tid, all);
    const E = corpusEnd(all);
    // relinked2: createdAt < T3 · relinkedAt = T3 + 5 >= asOf
    expect(all.some((v) => v.createdAtMs < T3 && v.relinkedAtMs != null && v.relinkedAtMs >= T3)).toBe(true);

    const res = await runRecount(
      db,
      tid,
      { asOfMs: T3, final: false, deadlineAtMs: Number.POSITIVE_INFINITY, nowMs: () => Date.now(), pageSize: 7 },
      zeroReads(),
    );
    expect(res.done).toBe(true);
    if (!res.done) return;
    expect(accumEquals(res.accum.accum, fullAccum(all, T3))).toBe(true);
    expect(accumEquals(res.accum.accum, fullAccum(all, E))).toBe(false);

    const next = await applyIncrement(db, tid, res.accum, E, zeroReads());
    expect(accumEquals(next.accum, fullAccum(all, E))).toBe(true);
  });

  it("request-in-batch: addRecountRequestToBatch 는 같은 batch 의 지우기와 함께 쓰인다", async () => {
    const tid = "batchReqT";
    await db.collection("votes").doc("x").set({ tournamentId: tid });
    const batch = db.batch();
    batch.delete(db.collection("votes").doc("x"));
    addRecountRequestToBatch(db, batch, tid, "relink-conflict", serverTime);
    expect((await db.collection(REQUESTS).doc(tid).get()).exists).toBe(false);
    await batch.commit();
    const req = await db.collection(REQUESTS).doc(tid).get();
    expect(req.data()!.reason).toBe("relink-conflict");
    expect(typeof req.data()!.requestedAt.toMillis()).toBe("number");
    expect((await db.collection("votes").doc("x").get()).exists).toBe(false);
  });

  it("concurrent-resume: 같은 job 을 두 실행이 함께 이어 세면 하나만 끝내고 하나는 아무것도 쓰지 않는다", async () => {
    const tid = "concurrentT";
    const all = buildCorpus();
    await seedVotes(tid, all);
    const E = corpusEnd(all);
    const base = { asOfMs: E, final: false, nowMs: () => Date.now(), pageSize: 50 };
    expect((await runRecount(db, tid, { ...base, deadlineAtMs: 0 }, zeroReads())).done).toBe(false);

    // 도우미 두 실행 흉내(resumeOnly) — 하나가 임대를 잡고, 다른 하나는 임대에 막히거나
    // (먼저 끝나 job 이 사라졌으면) 새로 세기 시작하지 않고 물러난다
    const go = { ...base, deadlineAtMs: Number.POSITIVE_INFINITY, resumeOnly: true };
    const [a, b] = await Promise.all([runRecount(db, tid, go, zeroReads()), runRecount(db, tid, go, zeroReads())]);
    expect([a.done, b.done].filter(Boolean)).toHaveLength(1);
    const stored = await readAccum(db, tid);
    expect(accumEquals(stored!.accum, fullAccum(all, E))).toBe(true);
    expect((await db.collection(JOBS).doc(tid).get()).exists).toBe(false);
  });

  it("recount-paging-carry-100: 100건씩(46 의 배수 아님) — 페이지 끝 사람 버리고 이어 읽기 경로 = 한 번에 센 값", async () => {
    const tid = "carry100T";
    const all = buildCorpus();
    await seedVotes(tid, all);
    const E = corpusEnd(all);
    const reads = zeroReads();
    const res = await runRecount(
      db,
      tid,
      { asOfMs: E, final: false, deadlineAtMs: Number.POSITIVE_INFINITY, nowMs: () => Date.now(), pageSize: 100 },
      reads,
    );
    expect(res.done).toBe(true);
    if (!res.done) return;
    expect(accumEquals(res.accum.accum, fullAccum(all, E))).toBe(true);
    // 버린 사람을 다음 페이지가 다시 읽으므로 기록 수보다 많이 읽는다(이어 읽기 경로가 실제로 돌았다)
    expect(reads.recount).toBeGreaterThan(all.length);
  });

  it("request-within-skew-kept: 시작 직전(시계 차이 5초 안)에 들어온 요청은 남긴다", async () => {
    const tid = "skewT";
    await seedVotes(tid, makeRun({ userId: "a", runIndex: 1, startMs: 1_000, stepMs: MIN }));
    await requestRecount(db, tid, "admin", serverTime);
    await tick();
    const res = await runRecount(
      db,
      tid,
      { asOfMs: 10 * HOUR, final: false, deadlineAtMs: Number.POSITIVE_INFINITY, nowMs: () => Date.now() },
      zeroReads(),
    );
    expect(res.done).toBe(true);
    expect((await db.collection(REQUESTS).doc(tid).get()).exists).toBe(true);
  });

  it("resume-only-no-job: 도우미(resumeOnly)는 job 이 없으면 기록을 읽지 않고 아무것도 쓰지 않는다", async () => {
    const tid = "resumeOnlyT";
    await seedVotes(tid, makeRun({ userId: "a", runIndex: 1, startMs: 1_000, stepMs: MIN }));
    const prior: AccumDoc = { tournamentId: tid, cursorMs: 20 * HOUR, accum: emptyAccum(), updatedAtMs: 1 };
    await db.collection(ACCUM).doc(tid).set(prior);
    const reads = zeroReads();
    const res = await runRecount(
      db,
      tid,
      { asOfMs: 10 * HOUR, final: true, deadlineAtMs: Number.POSITIVE_INFINITY, nowMs: () => Date.now(), resumeOnly: true },
      reads,
    );
    expect(res.done).toBe(false);
    expect(reads).toEqual(zeroReads());
    expect((await db.collection(JOBS).doc(tid).get()).exists).toBe(false);
    expect(await readAccum(db, tid)).toEqual(prior);
  });

  it("lease-blocks-then-expires: 다른 실행의 임대 중엔 읽지도 쓰지도 않고, 임대가 끝나면 이어 센다", async () => {
    const tid = "leaseT";
    const all = buildCorpus();
    await seedVotes(tid, all);
    const E = corpusEnd(all);
    const base = { asOfMs: E, final: false, pageSize: 100 };
    expect((await runRecount(db, tid, { ...base, deadlineAtMs: 0, nowMs: () => Date.now() }, zeroReads())).done).toBe(false);
    const saved = (await db.collection(JOBS).doc(tid).get()).data()!;
    expect(saved.leaseUntilMs).toBe(0);
    expect(saved.leaseHolder).toBeNull();

    // 다른 실행이 임대 중
    const leaseUntilMs = Date.now() + 60_000;
    await db.collection(JOBS).doc(tid).update({ leaseUntilMs, leaseHolder: "other-runner" });
    const before = (await db.collection(JOBS).doc(tid).get()).data();
    const reads = zeroReads();
    const blocked = await runRecount(
      db,
      tid,
      { ...base, deadlineAtMs: Number.POSITIVE_INFINITY, nowMs: () => Date.now(), resumeOnly: true },
      reads,
    );
    expect(blocked.done).toBe(false);
    expect(reads).toEqual(zeroReads());
    expect((await db.collection(JOBS).doc(tid).get()).data()).toEqual(before);
    expect((await db.collection(ACCUM).doc(tid).get()).exists).toBe(false);

    // 임대가 끝난 뒤(시계를 2분 뒤로) — 이어 세어 끝낸다
    const later = () => Date.now() + 120_000;
    const resumed = await runRecount(
      db,
      tid,
      { ...base, deadlineAtMs: Number.POSITIVE_INFINITY, nowMs: later, resumeOnly: true },
      zeroReads(),
    );
    expect(resumed.done).toBe(true);
    if (!resumed.done) return;
    expect(accumEquals(resumed.accum.accum, fullAccum(all, E))).toBe(true);
    expect((await db.collection(JOBS).doc(tid).get()).exists).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Task 4 — 발표 흐름(publishTournament) · 누적 쓰기 경쟁

/** 루트 firebase-admin 의 Timestamp — functions 쪽 클래스는 이 db 가 직렬화하지 못한다. */
const toTimestamp = (ms: number) => Timestamp.fromMillis(ms);
const FAR_DEADLINE = 1e15; // 마지막 발표가 아닌 대회
const LAG = 2 * MIN; // PUBLISH_LAG_MS

async function seedContestants(tid: string) {
  const batch = db.batch();
  for (const c of CONTESTANTS) {
    batch.set(db.collection("contestants").doc(c), { tournamentId: tid, name: `Name ${c}` });
  }
  await batch.commit();
}

/**
 * 옛 전량 방식(tallyVotes + tallyRuns + buildTallies + buildRankingUpdate)이 만드는 rankings 를
 * 공개 캐시 모양(T5 PR 2 · `voteCount`·`rate` 뺌)으로.
 */
async function legacyRankings(tid: string) {
  return (await legacyUpdate(tid)).rankings.map(toPublicEntry);
}

/** 옛 전량 방식 결과 그대로(선택 수 · 비율 포함 — 경보 기준선 시험이 쓴다). */
async function legacyUpdate(tid: string) {
  const [votes, contestants] = await Promise.all([
    db.collection("votes").where("tournamentId", "==", tid).get(),
    db.collection("contestants").where("tournamentId", "==", tid).get(),
  ]);
  const rows = votes.docs.map((d) => d.data() as RunVote);
  const tallies = buildTallies(
    tallyVotes(rows),
    contestants.docs.map((d) => contestantMetaOf(d.id, d.data())),
  );
  return buildRankingUpdate({
    tournamentId: tid,
    tallies,
    runs: tallyRuns(rows),
    prevCache: null,
    history24: null,
    existingUnresolvedTags: [],
  });
}

async function cacheOf(tid: string) {
  const snap = await db.collection("ranking_cache").doc(tid).get();
  return snap.exists ? snap.data()! : null;
}

async function mismatchAlerts(tid: string) {
  const snap = await db
    .collection("admin_alerts")
    .where("tournamentId", "==", tid)
    .where("type", "==", "ACCUM_MISMATCH")
    .get();
  return snap.docs.map((d) => d.data());
}

/** 누적 문서를 일부러 틀리게 — 커서 · 시각은 그대로 두고 선택 수 하나와 판수만 바꾼다. */
async function corruptAccum(tid: string) {
  const ref = db.collection(ACCUM).doc(tid);
  const cur = (await ref.get()).data() as AccumDoc;
  const accum: RankingAccum = {
    ...cur.accum,
    voteCounts: { ...cur.accum.voteCounts, c0: (cur.accum.voteCounts.c0 ?? 0) + 5 },
    runsTotal: cur.accum.runsTotal + 2,
  };
  await ref.set({ ...cur, accum });
}

describe("rankingAccumStore · publishTournament (에뮬레이터)", () => {
  it("empty-tournament: 기록 0 · 누적 없음 → 캐시 rankings [] · runsTotal 0 · 누적 cursorMs = endMs", async () => {
    const tid = "emptyT";
    const nowMs = 100 * HOUR;
    const log = await publishTournament(db, tid, FAR_DEADLINE, nowMs, { toTimestamp });
    expect(log.mode).toBe("recount");
    expect(log.cacheWritten).toBe(true);
    const cache = await cacheOf(tid);
    expect(cache).not.toBeNull();
    expect(cache!.rankings).toEqual([]);
    expect(cache!.runsTotal).toBe(0);
    expect(cache!.generationSequence).toBe(0);
    expect(cache!.generatedAt.toMillis()).toBe(nowMs);
    const stored = await readAccum(db, tid);
    expect(stored!.cursorMs).toBe(nowMs - LAG);
    expect(accumEquals(stored!.accum, emptyAccum())).toBe(true);
  });

  it("cache-equals-legacy: 같은 기록으로 옛 전량 방식 rankings = 새 캐시 rankings", async () => {
    const tid = "legacyT";
    const all = buildCorpus();
    await seedVotes(tid, all);
    await seedContestants(tid);
    const nowMs = corpusEnd(all) + LAG + HOUR;
    await publishTournament(db, tid, FAR_DEADLINE, nowMs, { toTimestamp });
    const cache = await cacheOf(tid);
    const legacy = await legacyRankings(tid);
    expect(legacy.length).toBeGreaterThan(0);
    expect(cache!.rankings).toEqual(legacy);
    expect(cache!.runsTotal).toBe(27);
  });

  it("rerun-idempotent: 같은 nowMs 로 두 번 → 캐시 rankings 같음 · 누적 같음", async () => {
    const tid = "rerunT";
    const all = buildCorpus();
    await seedVotes(tid, all);
    await seedContestants(tid);
    const nowMs = corpusEnd(all) + LAG + HOUR;
    await publishTournament(db, tid, FAR_DEADLINE, nowMs, { toTimestamp });
    const cache1 = await cacheOf(tid);
    const accum1 = await readAccum(db, tid);
    const log2 = await publishTournament(db, tid, FAR_DEADLINE, nowMs, { toTimestamp });
    expect(log2.mode).toBe("increment");
    expect(log2.reads.created + log2.reads.relinked + log2.reads.runFetch + log2.reads.recount).toBe(0);
    expect(log2.shadow).toBe("match");
    const cache2 = await cacheOf(tid);
    expect(cache2!.rankings).toEqual(cache1!.rankings);
    expect(cache2!.generationSequence).toBe(1);
    expect(await readAccum(db, tid)).toEqual(accum1);
  });

  it("crash-before-cache: 캐시 쓰기 전에 죽어도 누적은 진행 · 다음 호출에서 캐시가 맞다", async () => {
    const tid = "crashT";
    const all = buildCorpus();
    await seedVotes(tid, all);
    await seedContestants(tid);
    await publishTournament(db, tid, FAR_DEADLINE, T1 + LAG, { toTimestamp });

    const nowMs = corpusEnd(all) + LAG + HOUR;
    const boom = async (): Promise<{ readsFixed: number }> => {
      throw new Error("boom");
    };
    await expect(
      publishTournament(db, tid, FAR_DEADLINE, nowMs, { toTimestamp, writeCache: boom }),
    ).rejects.toThrow("boom");
    const stored = await readAccum(db, tid);
    expect(stored!.cursorMs).toBe(nowMs - LAG);
    expect(accumEquals(stored!.accum, fullAccum(all, nowMs - LAG))).toBe(true);
    // 캐시는 첫 발표(T1 까지)의 것 그대로
    expect((await cacheOf(tid))!.generationSequence).toBe(0);

    await publishTournament(db, tid, FAR_DEADLINE, nowMs, { toTimestamp });
    const cache = await cacheOf(tid);
    expect(cache!.rankings).toEqual(await legacyRankings(tid));
    expect(cache!.generationSequence).toBe(1);
  });

  it("shadow-mismatch-repairs: 누적이 틀리면 경보 1건 · 누적 고침(커서 그대로) · 캐시는 바른 값", async () => {
    const tid = "shadowT";
    const all = buildCorpus();
    await seedVotes(tid, all);
    await seedContestants(tid);
    await publishTournament(db, tid, FAR_DEADLINE, T2 + LAG, { toTimestamp });
    await corruptAccum(tid);

    const nowMs = corpusEnd(all) + LAG + HOUR;
    const log = await publishTournament(db, tid, FAR_DEADLINE, nowMs, { toTimestamp });
    expect(log.mode).toBe("increment");
    expect(log.shadow).toBe("mismatch");
    expect(log.reads.shadow).toBe(all.length);
    expect(all.length).toBeGreaterThan(1000);
    expect(log.reads.count).toBe(Math.ceil(all.length / 1000)); // count() — 1,000건마다 1읽기
    const alerts = await mismatchAlerts(tid);
    expect(alerts).toHaveLength(1);
    expect(alerts[0].resolved).toBe(false);
    expect(typeof alerts[0].detail).toBe("string");
    expect(alerts[0].createdAt.toMillis()).toBe(nowMs);
    const stored = await readAccum(db, tid);
    expect(stored!.cursorMs).toBe(nowMs - LAG);
    expect(accumEquals(stored!.accum, fullAccum(all, nowMs - LAG))).toBe(true);
    expect((await cacheOf(tid))!.rankings).toEqual(await legacyRankings(tid));
  });

  it("final-recount-on-last-publish: 창 안 마지막 발표는 처음부터 다시 세고, 누적과 다르면 'final' 경보", async () => {
    const tid = "finalT";
    const all = buildCorpus();
    await seedVotes(tid, all);
    await seedContestants(tid);
    const N1 = corpusEnd(all) + LAG + HOUR;
    const N2 = N1 + 12 * HOUR;
    const deadline = N2 - HOUR; // 마감 1시간 뒤 발표 = 창 안 마지막(다음 발표가 마감 + 13h)
    const first = await publishTournament(db, tid, deadline, N1, { toTimestamp });
    expect(first.mode).toBe("recount"); // 누적 없음 → 처음부터
    await corruptAccum(tid);

    const log = await publishTournament(db, tid, deadline, N2, { toTimestamp });
    expect(log.mode).toBe("final-recount");
    expect(log.shadow).toBe("skipped"); // 방금 전량을 다시 셌다 — 그림자 비교는 같은 일을 두 번 한다
    const alerts = await mismatchAlerts(tid);
    expect(alerts).toHaveLength(1);
    expect(alerts[0].detail).toContain("final");
    const stored = await readAccum(db, tid);
    expect(stored!.cursorMs).toBe(N2 - LAG);
    expect(accumEquals(stored!.accum, fullAccum(all, N2 - LAG))).toBe(true);
    expect((await cacheOf(tid))!.rankings).toEqual(await legacyRankings(tid));
    expect((await db.collection(JOBS).doc(tid).get()).exists).toBe(false);
    // 발표가 그 자리에서 최종 차트를 썼다 → 표지를 지웠다
    expect(stored!.finalCachePendingMs).toBeUndefined();
    expect(stored!.finalEndMs).toBeUndefined();
  });

  it("final-recount-match-no-alert: 누적이 맞으면 마지막 확정도 경보 없음", async () => {
    const tid = "finalOkT";
    const all = buildCorpus();
    await seedVotes(tid, all);
    await seedContestants(tid);
    const N1 = corpusEnd(all) + LAG + HOUR;
    const N2 = N1 + 12 * HOUR;
    await publishTournament(db, tid, N2 - HOUR, N1, { toTimestamp });
    const log = await publishTournament(db, tid, N2 - HOUR, N2, { toTimestamp });
    expect(log.mode).toBe("final-recount");
    expect(await mismatchAlerts(tid)).toHaveLength(0);
  });

  it("request-triggers-recount: 다시 세기 요청이 있으면 처음부터 다시 세어 지워진 기록을 뺀다", async () => {
    const tid = "reqPubT";
    const all = buildCorpus();
    await seedVotes(tid, all);
    await seedContestants(tid);
    const N1 = corpusEnd(all) + LAG + HOUR;
    await publishTournament(db, tid, FAR_DEADLINE, N1, { toTimestamp });
    // 계정 삭제 흉내 — u7 의 기록을 지우고 같은 batch 에 요청
    const gone = all.filter((v) => v.userId === "u7");
    expect(gone.length).toBe(RUN_VOTES);
    const batch = db.batch();
    for (const v of gone) batch.delete(db.collection("votes").doc(`${tid}_${v.id}`));
    addRecountRequestToBatch(db, batch, tid, "user-delete", serverTime);
    await batch.commit();
    await tick();

    const N2 = N1 + 12 * HOUR;
    // 시작 시각을 요청보다 10초 뒤로 — 시계 차이 여유(5초) 밖이라 요청이 지워진다
    const log = await publishTournament(db, tid, FAR_DEADLINE, N2, { toTimestamp, clock: () => Date.now() + 10_000 });
    expect(log.mode).toBe("recount");
    const rest = all.filter((v) => v.userId !== "u7");
    expect(accumEquals((await readAccum(db, tid))!.accum, fullAccum(rest, N2 - LAG))).toBe(true);
    expect((await db.collection(REQUESTS).doc(tid).get()).exists).toBe(false);
    expect(await mismatchAlerts(tid)).toHaveLength(0);
    expect((await cacheOf(tid))!.rankings).toEqual(await legacyRankings(tid));
  });

  it("recount-pending: 누적 없이 다시 세기가 예산 안에 못 끝나면 캐시를 쓰지 않고 job 을 남긴다", async () => {
    const tid = "pendingT";
    const all = buildCorpus();
    await seedVotes(tid, all);
    await seedContestants(tid);
    let calls = 0;
    // 첫 호출(시작 시각) 뒤로는 예산이 이미 지난 시계
    const clock = () => (calls++ === 0 ? 0 : Number.MAX_SAFE_INTEGER);
    const log = await publishTournament(db, tid, FAR_DEADLINE, corpusEnd(all) + LAG, {
      toTimestamp,
      clock,
      recountPageSize: 50,
    });
    expect(log.mode).toBe("recount-pending");
    expect(log.cacheWritten).toBe(false);
    expect(await cacheOf(tid)).toBeNull();
    expect((await db.collection(JOBS).doc(tid).get()).exists).toBe(true);
    expect(await readAccum(db, tid)).toBeNull();
  });
});

describe("rankingAccumStore · 실행 예산 · 최종 차트 표지 (에뮬레이터)", () => {
  it("shared-run-budget: 다시 세기가 필요한 두 대회가 실행 예산 하나를 나눠 쓰면, 둘 다 캐시를 쓰고 job 을 도우미에게 남긴다", async () => {
    const tids = ["budgetA", "budgetB"];
    const N1 = 40 * HOUR;
    const N2 = N1 + 12 * HOUR;
    for (const tid of tids) {
      await seedVotes(tid, buildCorpus());
      await publishTournament(db, tid, FAR_DEADLINE, N1, { toTimestamp });
      await requestRecount(db, tid, "user-delete", serverTime);
    }
    // 크론 한 실행의 예산 — 이미 다 썼다(앞 대회들이 먹은 상태)
    const runDeadlineMs = Date.now() - 1;
    for (const tid of tids) {
      const log = await publishTournament(db, tid, FAR_DEADLINE, N2, {
        toTimestamp,
        deadlineAtMs: runDeadlineMs,
        recountPageSize: 46,
      });
      expect(log.mode).toBe("recount-pending");
      expect(log.cacheWritten).toBe(true);
      // 예산이 지난 대회는 다시 세기 한 페이지만 · 그림자 비교 건너뜀
      expect(log.reads.recount).toBeLessThanOrEqual(2 * 46);
      expect(log.shadow).toBe("skipped");
      expect((await cacheOf(tid))!.generationSequence).toBe(1);
      expect((await readAccum(db, tid))!.cursorMs).toBe(N2 - LAG);
    }
    const jobs = await db.collection(JOBS).get();
    expect(jobs.size).toBeGreaterThanOrEqual(1);
  });

  it("helper-final-cache-retry: 도우미의 최종 차트 쓰기가 한 번 실패해도 표지가 남아 다음 실행이 쓰고 지운다", async () => {
    const tid = "helperRetryT";
    const all = buildCorpus();
    await seedVotes(tid, all);
    await seedContestants(tid);
    const E = corpusEnd(all);
    expect((await runRecount(db, tid, { asOfMs: E, final: true, deadlineAtMs: 0, nowMs: () => Date.now(), pageSize: 100 }, zeroReads())).done).toBe(false);

    let calls = 0;
    const boomOnce = async (): Promise<{ readsFixed: number }> => {
      calls++;
      throw new Error("boom");
    };
    await runRecountHelper(db, { toTimestamp, writeCache: boomOnce });
    expect(calls).toBe(1);
    expect((await db.collection(JOBS).doc(tid).get()).exists).toBe(false); // job 은 끝나 지워졌다
    const marked = await readAccum(db, tid);
    expect(typeof marked!.finalCachePendingMs).toBe("number");
    expect(await cacheOf(tid)).toBeNull();

    const res = await runRecountHelper(db, { toTimestamp });
    expect(res.finalCaches).toBe(1);
    expect((await cacheOf(tid))!.rankings).toEqual(await legacyRankings(tid));
    const cleared = await readAccum(db, tid);
    expect(cleared!.finalCachePendingMs).toBeUndefined();
    expect(accumEquals(cleared!.accum, fullAccum(all, E))).toBe(true);

    // 표지가 없으면 다음 실행은 아무것도 쓰지 않는다
    expect((await runRecountHelper(db, { toTimestamp })).finalCaches).toBe(0);
  });

  it("last-publish-marks-job-final: 마지막 발표가 만난 job 은 final + finalEndMs 가 되고, 끝낸 도우미가 [asOf, finalEndMs) 를 더한 뒤 최종 차트를 쓴다", async () => {
    const tid = "markFinalT";
    const all = buildCorpus();
    await seedVotes(tid, all);
    await seedContestants(tid);
    const N1 = corpusEnd(all) + LAG + HOUR;
    const N2 = N1 + 12 * HOUR;
    const deadline = N2 - HOUR;
    await publishTournament(db, tid, deadline, N1, { toTimestamp });
    // 요청 때문에 돌던 다시 세기(asOf = T2 · final 아님)가 예산에 닿아 멈춰 있다
    expect((await runRecount(db, tid, { asOfMs: T2, final: false, deadlineAtMs: 0, nowMs: () => Date.now(), pageSize: 46 }, zeroReads())).done).toBe(false);

    // 창 안 마지막 발표 — 예산이 이미 지나 한 페이지만 잇는다
    const log = await publishTournament(db, tid, deadline, N2, { toTimestamp, deadlineAtMs: 0, recountPageSize: 46 });
    expect(log.mode).toBe("recount-pending");
    expect(log.cacheWritten).toBe(true);
    const job = (await db.collection(JOBS).doc(tid).get()).data()!;
    expect(job.final).toBe(true);
    expect(job.finalEndMs).toBe(N2 - LAG);
    expect(job.asOfMs).toBe(T2); // asOf 는 그대로

    const res = await runRecountHelper(db, { toTimestamp, pageSize: 46 });
    expect(res.finalCaches).toBe(1);
    expect((await db.collection(JOBS).doc(tid).get()).exists).toBe(false);
    const stored = await readAccum(db, tid);
    expect(stored!.cursorMs).toBe(N2 - LAG);
    expect(accumEquals(stored!.accum, fullAccum(all, N2 - LAG))).toBe(true);
    expect(accumEquals(fullAccum(all, T2), fullAccum(all, N2 - LAG))).toBe(false); // 증분이 실제로 필요했다
    expect(stored!.finalCachePendingMs).toBeUndefined();
    expect((await cacheOf(tid))!.rankings).toEqual(await legacyRankings(tid));
  });

  it("job-vanished-at-last-publish: 마지막 발표가 job 을 읽은 뒤 도우미가 끝내 지웠으면, 낡은 asOf 로 새로 세지 않고 구간 끝까지 마지막 확정을 한다", async () => {
    const tid = "vanishLastT";
    const all = buildCorpus();
    await seedVotes(tid, all);
    await seedContestants(tid);
    const N1 = corpusEnd(all) + LAG + HOUR;
    const N2 = N1 + 12 * HOUR;
    const deadline = N2 - HOUR;
    await publishTournament(db, tid, deadline, N1, { toTimestamp });
    // 요청 때문에 돌던 다시 세기(asOf = T2 · final 아님)가 예산에 닿아 멈춰 있다
    expect((await runRecount(db, tid, { asOfMs: T2, final: false, deadlineAtMs: 0, nowMs: () => Date.now(), pageSize: 46 }, zeroReads())).done).toBe(false);

    let helperRan = 0;
    const log = await publishTournament(db, tid, deadline, N2, {
      toTimestamp,
      // 발표가 job 을 읽은 직후 — 같은 :00 에 돈 도우미가 job 을 끝내 지운다(final 아님)
      afterJobRead: async () => {
        const r = await runRecountHelper(db, { toTimestamp });
        helperRan += r.jobsDone;
      },
    });
    expect(helperRan).toBe(1);
    expect(log.mode).toBe("final-recount");
    expect(log.cacheWritten).toBe(true);
    // 낡은 asOf 로 한 번 + 마지막 확정 한 번 = 두 번이 아니라, 마지막 확정 한 번만 읽는다
    expect(log.reads.recount).toBe(all.length);
    expect((await db.collection(JOBS).doc(tid).get()).exists).toBe(false);
    const stored = await readAccum(db, tid);
    expect(stored!.cursorMs).toBe(N2 - LAG);
    expect(accumEquals(stored!.accum, fullAccum(all, N2 - LAG))).toBe(true);
    expect(stored!.finalCachePendingMs).toBeUndefined();
    expect((await cacheOf(tid))!.rankings).toEqual(await legacyRankings(tid));
  });

  it("job-vanished-not-last: 마지막 발표가 아니면 사라진 job 을 새로 세지 않고 다시 읽은 누적에 증분만 한다", async () => {
    const tid = "vanishMidT";
    const all = buildCorpus();
    await seedVotes(tid, all);
    await seedContestants(tid);
    const N1 = T1 + LAG;
    await publishTournament(db, tid, FAR_DEADLINE, N1, { toTimestamp });
    expect((await runRecount(db, tid, { asOfMs: T2, final: false, deadlineAtMs: 0, nowMs: () => Date.now(), pageSize: 46 }, zeroReads())).done).toBe(false);

    const N2 = corpusEnd(all) + LAG + HOUR;
    const log = await publishTournament(db, tid, FAR_DEADLINE, N2, {
      toTimestamp,
      afterJobRead: async () => {
        await runRecountHelper(db, { toTimestamp });
      },
    });
    expect(log.mode).toBe("increment");
    expect(log.reads.recount).toBe(0);
    expect((await db.collection(JOBS).doc(tid).get()).exists).toBe(false);
    const stored = await readAccum(db, tid);
    expect(stored!.cursorMs).toBe(N2 - LAG);
    expect(accumEquals(stored!.accum, fullAccum(all, N2 - LAG))).toBe(true);
  });
});

describe("rankingAccumStore · 누적 쓰기 경쟁 (에뮬레이터)", () => {
  it("accum-write-race: 읽은 뒤 다시 세기가 끝나 누적을 바꿨으면, 증분은 새 누적 위에 다시 더한다", async () => {
    const tid = "raceT";
    const all = buildCorpus();
    await seedVotes(tid, all);
    const E = corpusEnd(all);

    // 발표 흐름이 읽은 누적(T1 까지) — 지워질 사람의 기록이 들어 있다
    const stale = await applyIncrement(db, tid, baseDoc(tid), T1, zeroReads());

    // 그 사이: 계정 삭제(u9) + 요청 → 도우미가 다시 세기(asOf = T2)를 끝내 누적을 바꾸고 요청을 지운다
    const gone = all.filter((v) => v.userId === "u9");
    expect(gone.length).toBe(RUN_VOTES);
    const batch = db.batch();
    for (const v of gone) batch.delete(db.collection("votes").doc(`${tid}_${v.id}`));
    addRecountRequestToBatch(db, batch, tid, "user-delete", serverTime);
    await batch.commit();
    await tick();
    const rec = await runRecount(
      db,
      tid,
      { asOfMs: T2, final: false, deadlineAtMs: Number.POSITIVE_INFINITY, nowMs: () => Date.now() + 10_000 },
      zeroReads(),
    );
    expect(rec.done).toBe(true);
    expect((await db.collection(REQUESTS).doc(tid).get()).exists).toBe(false);

    // 발표 흐름이 낡은 누적으로 쓰려 한다 → 새 누적(다시 센 값) + [T2, E) 증분이어야 한다
    const rest = all.filter((v) => v.userId !== "u9");
    expect(accumEquals(fullAccum(rest, E), fullAccum(all, E))).toBe(false);
    const next = await applyIncrement(db, tid, stale, E, zeroReads(), { nowMs: 12_345 });
    expect(next.cursorMs).toBe(E);
    expect(accumEquals(next.accum, fullAccum(rest, E))).toBe(true);
    expect(next.updatedAtMs).toBe(12_345);
    const stored = await readAccum(db, tid);
    expect(accumEquals(stored!.accum, fullAccum(rest, E))).toBe(true);
    // 요청은 되살아나지 않는다
    expect((await db.collection(REQUESTS).doc(tid).get()).exists).toBe(false);
  });

  it("final-marker-not-resurrected: 표지를 지운 뒤 그 전에 읽은 누적으로 증분하면, 표지를 되살리지 않고 새 누적 위에 다시 더한다", async () => {
    const tid = "markerRaceT";
    await seedVotes(tid, makeRun({ userId: "a", runIndex: 1, startMs: 1_000, stepMs: MIN }));
    const E = 10 * HOUR;
    // 마지막 확정이 끝나 표지가 붙은 누적(cursor 0) — 증분 하나가 이 문서를 읽었다
    const withMarker: AccumDoc = { ...baseDoc(tid), updatedAtMs: 1, finalCachePendingMs: 1, finalEndMs: 0 };
    await db.collection(ACCUM).doc(tid).set(withMarker);
    // 그 사이 캐시를 쓴 쪽이 표지를 지운다 — updatedAtMs 가 바뀌어야 읽은 쪽이 "그 사이 누가 썼다"를 안다
    expect(await clearFinalMarker(db, tid, 1, 999)).toBe(true);
    const cleared = await readAccum(db, tid);
    expect(cleared!.finalCachePendingMs).toBeUndefined();
    expect(cleared!.updatedAtMs).toBe(999);

    const next = await applyIncrement(db, tid, withMarker, E, zeroReads(), { nowMs: 2_000 });
    expect(next.finalCachePendingMs).toBeUndefined();
    const stored = await readAccum(db, tid);
    expect(stored!.finalCachePendingMs).toBeUndefined();
    expect(stored!.finalEndMs).toBeUndefined();
    expect(stored!.cursorMs).toBe(E);
    expect(stored!.accum.runsTotal).toBe(1);
  });

  it("recount-returns-final: 다 센 다시 세기는 job 의 final 을 돌려준다(도우미가 최종 차트를 쓸지 정한다)", async () => {
    const tid = "retFinalT";
    await seedVotes(tid, makeRun({ userId: "a", runIndex: 1, startMs: 1_000, stepMs: MIN }));
    await seedVotes(tid, makeRun({ userId: "b", runIndex: 1, startMs: 1_000, stepMs: MIN }));
    const opts = { asOfMs: 10 * HOUR, nowMs: () => Date.now(), pageSize: 46 };
    expect((await runRecount(db, tid, { ...opts, final: true, deadlineAtMs: 0 }, zeroReads())).done).toBe(false);
    // 이어 세는 쪽이 final:false 를 넘겨도 job 의 값이 이긴다
    const res = await runRecount(db, tid, { ...opts, final: false, deadlineAtMs: Number.POSITIVE_INFINITY }, zeroReads());
    expect(res.done).toBe(true);
    if (!res.done) return;
    expect(res.final).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Task 5 — 전환(relinkGuestVotes) · 계정 삭제(deleteUserVotes)
//
// cron 밖에서 votes 를 바꾸는 두 곳. 전환은 게스트였던 기록에만 relinkedAt 을 찍어 "셀 수 있게 된
// 시각"을 옮기고, 지우는 쪽(계정 삭제 · 충돌로 버리는 옛 기록)은 다시 세기 요청을 남긴다.

/** 시각 표지를 정해진 값으로 — 루트 firebase-admin 의 Timestamp(functions 쪽 것은 이 db 가 못 쓴다). */
const fixedTime = (ms: number) => () => Timestamp.fromMillis(ms);

async function votesOf(userId: string) {
  const snap = await db.collection("votes").where("userId", "==", userId).get();
  return snap.docs.map((d) => d.data());
}

async function accumOf(tid: string) {
  return (await readAccum(db, tid))!.accum;
}

describe("전환 · 계정 삭제 (에뮬레이터)", () => {
  it("relink-guest-full-run: 발표 뒤 옮긴 게스트 완주 판은 다음 발표에서 runsTotal +1 한 번 · 그다음 발표 그대로", async () => {
    const tid = "relinkFullT";
    await seedContestants(tid);
    await seedVotes(tid, makeRun({ userId: "u1", runIndex: 1, startMs: 1_000, stepMs: MIN }));
    await seedVotes(tid, makeRun({ userId: "anonA", runIndex: 1, guest: true, startMs: HOUR, stepMs: MIN }));

    const N1 = 5 * HOUR + LAG;
    await publishTournament(db, tid, FAR_DEADLINE, N1, { toTimestamp });
    expect((await accumOf(tid)).runsTotal).toBe(1); // 게스트 판은 빠진다
    expect(sumCounts((await accumOf(tid)).voteCounts)).toBe(RUN_VOTES);

    const res = await relinkGuestVotes(db, "anonA", "googleB", new Set(), { serverTime: fixedTime(6 * HOUR) });
    expect(res).toEqual({ linked: RUN_VOTES, legacyDeletedTids: [] });
    const moved = await votesOf("googleB");
    expect(moved).toHaveLength(RUN_VOTES);
    for (const v of moved) {
      expect(v.isGuest).toBe(false);
      expect(v.relinkedAt.toMillis()).toBe(6 * HOUR);
    }

    const log2 = await publishTournament(db, tid, FAR_DEADLINE, 10 * HOUR + LAG, { toTimestamp });
    expect(log2.mode).toBe("increment");
    expect(log2.shadow).toBe("match");
    expect((await accumOf(tid)).runsTotal).toBe(2);
    expect(sumCounts((await accumOf(tid)).voteCounts)).toBe(2 * RUN_VOTES);

    const log3 = await publishTournament(db, tid, FAR_DEADLINE, 20 * HOUR + LAG, { toTimestamp });
    expect(log3.shadow).toBe("match");
    expect((await accumOf(tid)).runsTotal).toBe(2);
    expect(sumCounts((await accumOf(tid)).voteCounts)).toBe(2 * RUN_VOTES);
    expect((await db.collection(REQUESTS).doc(tid).get()).exists).toBe(false);
  });

  it("relink-legacy-no-stamp: isGuest 칸 없는 옛 기록 · isGuest:false 기록은 relinkedAt 없음 · 두 번 안 셈", async () => {
    const tid = "relinkLegacyT";
    await seedContestants(tid);
    // 이미 센 판 둘 — 옛 기록(isGuest · runIndex 칸 없음)과 isGuest:false 기록
    await seedVotes(tid, makeRun({ userId: "anonA", guest: "missing", startMs: 1_000, stepMs: MIN }));
    await seedVotes(tid, makeRun({ userId: "anonA", runIndex: 2, guest: false, startMs: HOUR, stepMs: MIN }));

    await publishTournament(db, tid, FAR_DEADLINE, 5 * HOUR + LAG, { toTimestamp });
    expect((await accumOf(tid)).runsTotal).toBe(2);

    const res = await relinkGuestVotes(db, "anonA", "googleB", new Set(), { serverTime: fixedTime(6 * HOUR) });
    expect(res.linked).toBe(2 * RUN_VOTES);
    const moved = await votesOf("googleB");
    expect(moved).toHaveLength(2 * RUN_VOTES);
    for (const v of moved) {
      // 다시 찍으면 그 판의 max(countableAt) 이 뒤 구간으로 가 한 번 더 세어진다
      expect(v.relinkedAt).toBeUndefined();
      expect(v.isGuest).toBe(false);
      expect(typeof v.runIndex).toBe("number"); // 옛 기록은 runIndex 1 을 채운다(기존 동작)
    }

    const log = await publishTournament(db, tid, FAR_DEADLINE, 10 * HOUR + LAG, { toTimestamp });
    expect(log.shadow).toBe("match");
    expect((await accumOf(tid)).runsTotal).toBe(2);
    expect(sumCounts((await accumOf(tid)).voteCounts)).toBe(2 * RUN_VOTES);
  });

  it("relink-split-pages: 쓰기 상한을 작게 줘도 판은 조각 사이에 나뉘지 않는다 — 판마다 relinkedAt 하나", async () => {
    const tid = "relinkSplitT";
    await seedContestants(tid);
    // 두 판의 기록 id 를 번갈아 놓는다 — __name__ 순 조각이면 두 판이 조각마다 섞여 나뉜다
    const a = makeRun({ userId: "anonA", runIndex: 1, guest: true, startMs: 1_000, stepMs: MIN });
    const b = makeRun({ userId: "anonA", runIndex: 2, guest: true, startMs: 2 * HOUR, stepMs: MIN });
    const inter = (vs: AccumVote[], off: number) =>
      vs.map((v, i) => ({ ...v, id: `s${String(2 * i + off).padStart(4, "0")}` }));
    await seedVotes(tid, inter(a, 0).concat(inter(b, 1)));
    await publishTournament(db, tid, FAR_DEADLINE, 5 * HOUR + LAG, { toTimestamp });
    expect((await accumOf(tid)).runsTotal).toBe(0);

    const batches: string[][] = [];
    const res = await relinkGuestVotes(db, "anonA", "googleB", new Set(), {
      writeLimit: 50, // 판 하나(46) + 요청 몫 — 두 판(92)은 한 batch 에 못 든다
      serverTime: () => Timestamp.fromMillis(6 * HOUR + batches.length * HOUR),
      afterCommit: ({ voteIds }) => {
        batches.push(voteIds);
      },
    });
    expect(res.linked).toBe(2 * RUN_VOTES);
    expect(batches).toHaveLength(2);
    const runOfId = new Map<string, number>();
    for (const v of inter(a, 0)) runOfId.set(`${tid}_${v.id}`, 1);
    for (const v of inter(b, 1)) runOfId.set(`${tid}_${v.id}`, 2);
    // batch 마다 판 하나 · 판 하나는 batch 하나
    const seen = new Set<number>();
    for (const ids of batches) {
      const runs = new Set(ids.map((id) => runOfId.get(id)));
      expect(runs.size).toBe(1);
      const r = Array.from(runs)[0]!;
      expect(seen.has(r)).toBe(false);
      seen.add(r);
      expect(ids).toHaveLength(RUN_VOTES);
    }
    // relinkedAt 은 판 단위로 정확히 묶인다
    const moved = await votesOf("googleB");
    const stampsByRun = new Map<number, Set<number>>();
    for (const v of moved) {
      const s = stampsByRun.get(v.runIndex) ?? new Set<number>();
      s.add(v.relinkedAt.toMillis());
      stampsByRun.set(v.runIndex, s);
    }
    expect(Array.from(stampsByRun.values()).map((s) => s.size)).toEqual([1, 1]);

    const after = await publishTournament(db, tid, FAR_DEADLINE, 12 * HOUR + LAG, { toTimestamp });
    expect(after.shadow).toBe("match");
    expect((await accumOf(tid)).runsTotal).toBe(2);
    expect(sumCounts((await accumOf(tid)).voteCounts)).toBe(2 * RUN_VOTES);
  });

  it("relink-publish-between-batches: 판 A 만 옮겨진 진짜 중간 상태에서 발표가 돌아도 판마다 한 번 · 옛 전량 방식과 같다", async () => {
    const tid = "relinkMidT";
    await seedContestants(tid);
    await seedVotes(tid, makeRun({ userId: "u1", runIndex: 1, startMs: 1_000, stepMs: MIN }));
    await seedVotes(tid, makeRun({ userId: "anonA", runIndex: 1, guest: true, startMs: HOUR, stepMs: MIN }));
    await seedVotes(tid, makeRun({ userId: "anonA", runIndex: 2, guest: true, startMs: 2 * HOUR, stepMs: MIN }));
    await publishTournament(db, tid, FAR_DEADLINE, 5 * HOUR + LAG, { toTimestamp });
    expect((await accumOf(tid)).runsTotal).toBe(1);

    let committed = 0;
    const mid: { runsTotal: number; anonLeft: number; anonGuest: boolean; movedAll: boolean }[] = [];
    const res = await relinkGuestVotes(db, "anonA", "googleB", new Set(), {
      writeLimit: RUN_VOTES, // batch 하나에 판 하나
      serverTime: () => Timestamp.fromMillis(6 * HOUR + committed * 3 * HOUR), // 6h · 9h
      afterCommit: async () => {
        committed++;
        if (committed !== 1) return;
        // 첫 batch 와 둘째 batch 사이의 발표 — 판 하나는 통째로 옮겨졌고 다른 판은 아직 게스트
        const left = await votesOf("anonA");
        const moved = await votesOf("googleB");
        const log = await publishTournament(db, tid, FAR_DEADLINE, 8 * HOUR + LAG, { toTimestamp });
        expect(log.shadow).toBe("match");
        mid.push({
          runsTotal: (await accumOf(tid)).runsTotal,
          anonLeft: left.length,
          anonGuest: left.every((v) => v.isGuest === true),
          movedAll: moved.length === RUN_VOTES && moved.every((v) => v.relinkedAt.toMillis() === 6 * HOUR),
        });
      },
    });
    expect(res.linked).toBe(2 * RUN_VOTES);
    expect(committed).toBe(2);
    expect(mid).toEqual([{ runsTotal: 2, anonLeft: RUN_VOTES, anonGuest: true, movedAll: true }]);

    const log2 = await publishTournament(db, tid, FAR_DEADLINE, 12 * HOUR + LAG, { toTimestamp });
    expect(log2.shadow).toBe("match");
    expect((await accumOf(tid)).runsTotal).toBe(3);
    const log3 = await publishTournament(db, tid, FAR_DEADLINE, 24 * HOUR + LAG, { toTimestamp });
    expect(log3.shadow).toBe("match");
    expect((await accumOf(tid)).runsTotal).toBe(3);
    expect(sumCounts((await accumOf(tid)).voteCounts)).toBe(3 * RUN_VOTES);
    // 옛 전량 방식과 같다
    const cache = await cacheOf(tid);
    expect(cache!.runsTotal).toBe(3);
    expect(cache!.rankings).toEqual(await legacyRankings(tid));
  });

  it("relink-run-over-limit: 판 하나가 쓰기 상한보다 크면 아무것도 쓰지 않고 멈춘다", async () => {
    const tid = "relinkOverT";
    await seedVotes(tid, makeRun({ userId: "anonA", runIndex: 1, guest: true, startMs: 1_000, stepMs: MIN, take: 5 }));
    await expect(
      relinkGuestVotes(db, "anonA", "googleB", new Set(), { writeLimit: 4, serverTime: fixedTime(6 * HOUR) }),
    ).rejects.toThrow(/쓰기 상한/);
    expect(await votesOf("anonA")).toHaveLength(5);
    expect(await votesOf("googleB")).toHaveLength(0);
  });

  it("user-delete-requests-recount: 지우는 batch 에 대회마다 요청 → 다음 발표 mode recount · 지운 판 빠짐", async () => {
    const tid = "userDelT";
    const tid2 = "userDelT2";
    await seedContestants(tid);
    await seedVotes(tid, makeRun({ userId: "u1", runIndex: 1, startMs: 1_000, stepMs: MIN }));
    await seedVotes(tid, makeRun({ userId: "u7", runIndex: 1, startMs: HOUR, stepMs: MIN }));
    await seedVotes(tid2, makeRun({ userId: "u7", runIndex: 1, startMs: HOUR, stepMs: MIN, take: 5 }));
    const N1 = 5 * HOUR + LAG;
    await publishTournament(db, tid, FAR_DEADLINE, N1, { toTimestamp });
    expect((await accumOf(tid)).runsTotal).toBe(2);

    const deleted = await deleteUserVotes(db, "u7", { pageSize: 10, serverTime });
    expect(deleted).toBe(RUN_VOTES + 5);
    expect(await votesOf("u7")).toHaveLength(0);
    for (const t of [tid, tid2]) {
      const req = await db.collection(REQUESTS).doc(t).get();
      expect(req.exists).toBe(true);
      expect(req.data()!.reason).toBe("user-delete");
    }
    await tick();

    const log = await publishTournament(db, tid, FAR_DEADLINE, N1 + 12 * HOUR, {
      toTimestamp,
      clock: () => Date.now() + 10_000,
    });
    expect(log.mode).toBe("recount");
    expect((await accumOf(tid)).runsTotal).toBe(1);
    expect(sumCounts((await accumOf(tid)).voteCounts)).toBe(RUN_VOTES);
    expect((await db.collection(REQUESTS).doc(tid).get()).exists).toBe(false);
    expect(await mismatchAlerts(tid)).toHaveLength(0);
  });

  it("relink-conflict-legacy-request: 옛 기록을 지운 batch 에 그 대회 요청이 함께 쓰인다 · 게스트 기록뿐이면 요청 없음", async () => {
    const legacyT = "conflictLegacyT"; // 충돌 · 옛 기록(isGuest 칸 없음) 섞임 → 요청
    const guestT = "conflictGuestT"; // 충돌 · 게스트 기록뿐 → 센 적 없으니 요청 없음
    const okT = "noConflictT"; // 충돌 아님 → 옮김
    await seedVotes(legacyT, makeRun({ userId: "anonA", guest: "missing", startMs: 1_000, stepMs: MIN, take: 3 }));
    await seedVotes(legacyT, makeRun({ userId: "anonA", runIndex: 2, guest: true, startMs: HOUR, stepMs: MIN, take: 3 }));
    await seedVotes(guestT, makeRun({ userId: "anonA", runIndex: 1, guest: true, startMs: 1_000, stepMs: MIN, take: 4 }));
    await seedVotes(okT, makeRun({ userId: "anonA", runIndex: 1, guest: true, startMs: 1_000, stepMs: MIN, take: 5 }));

    // batch 마다: 그 batch 가 지운 옛 기록 수 · 그 batch 의 요청 수 몫 · 커밋 직후 요청 문서가 있었는가
    const legacyIds = new Set(
      (await db.collection("votes").where("tournamentId", "==", legacyT).get()).docs
        .filter((d) => d.data().isGuest === undefined)
        .map((d) => d.id),
    );
    expect(legacyIds.size).toBe(3);
    const seen: { legacyDeleted: number; writes: number; requestExists: boolean }[] = [];
    const res = await relinkGuestVotes(db, "anonA", "googleB", new Set([legacyT, guestT]), {
      writeLimit: 6,
      serverTime: fixedTime(6 * HOUR),
      afterCommit: async ({ voteIds, writes }) => {
        seen.push({
          legacyDeleted: voteIds.filter((id) => legacyIds.has(id)).length,
          writes,
          requestExists: (await db.collection(REQUESTS).doc(legacyT).get()).exists,
        });
      },
    });
    expect(res.linked).toBe(5);
    expect(res.legacyDeletedTids).toEqual([legacyT]);
    expect(await votesOf("anonA")).toHaveLength(0);
    const moved = await votesOf("googleB");
    expect(moved).toHaveLength(5);
    expect(moved.every((v) => v.tournamentId === okT)).toBe(true);

    // 옛 기록을 지운 batch 가 커밋된 바로 그때 요청이 이미 있다(같은 batch) · 쓰기 수는 상한 안
    const withLegacy = seen.filter((b) => b.legacyDeleted > 0);
    expect(withLegacy.length).toBeGreaterThan(0);
    expect(withLegacy.reduce((s, b) => s + b.legacyDeleted, 0)).toBe(3);
    expect(withLegacy.every((b) => b.requestExists)).toBe(true);
    expect(seen.every((b) => b.writes <= 6)).toBe(true);

    const req = await db.collection(REQUESTS).doc(legacyT).get();
    expect(req.exists).toBe(true);
    expect(req.data()!.reason).toBe("relink-conflict");
    expect(req.data()!.requestedAt.toMillis()).toBe(6 * HOUR);
    expect((await db.collection(REQUESTS).doc(guestT).get()).exists).toBe(false);
    expect((await db.collection(REQUESTS).doc(okT).get()).exists).toBe(false);
  });
});


// ─────────────────────────────────────────────────────────────────────────────
// Task 9 (PR 2) — 공개 캐시에서 선택 수 · 비율 · 합계 빼기 · 경보 기준선은 서버 전용

/** 서버 전용 경보 기준선 문서 id 들(숫자 순). */
async function privateHistorySeqs(tid: string): Promise<number[]> {
  const snap = await db.collection(ACCUM).doc(tid).collection("history").get();
  return snap.docs.map((d) => Number(d.id)).sort((a, b) => a - b);
}

async function alertsOfType(tid: string, type: string) {
  const snap = await db
    .collection("admin_alerts")
    .where("tournamentId", "==", tid)
    .where("type", "==", type)
    .get();
  return snap.docs.map((d) => d.data());
}

describe("공개 캐시 · 서버 전용 경보 기준선 (T5 PR 2 · 에뮬레이터)", () => {
  it("public-cache-has-no-counts: 캐시 행에 voteCount · rate 없음 · 문서에 totalVotes 없음 · 나머지는 옛 값 그대로", async () => {
    const tid = "publicT";
    const all = buildCorpus();
    await seedVotes(tid, all);
    await seedContestants(tid);
    const nowMs = corpusEnd(all) + LAG + HOUR;
    await publishTournament(db, tid, FAR_DEADLINE, nowMs, { toTimestamp });
    const cache = await cacheOf(tid);
    expect(cache!.rankings.length).toBeGreaterThan(0);
    for (const row of cache!.rankings as Record<string, unknown>[]) {
      expect(Object.keys(row)).not.toContain("voteCount");
      expect(Object.keys(row)).not.toContain("rate");
      expect(typeof row.crownScore).toBe("number");
      expect(typeof row.shareRate).toBe("number");
    }
    expect(Object.keys(cache!)).not.toContain("totalVotes");
    expect(cache!.runsTotal).toBe(27);
    expect(cache!.rankings).toEqual(await legacyRankings(tid));
    // 공개 history 에는 더 쓰지 않는다.
    expect((await db.collection("ranking_cache").doc(tid).collection("history").get()).size).toBe(0);
    // 이번 세대의 기준선(선택 수 · 비율 포함)은 서버 전용 자리에.
    const base = (await db.collection(ACCUM).doc(tid).collection("history").doc("0").get()).data()!;
    const legacy = await legacyUpdate(tid);
    expect(base.rankings).toEqual(legacy.rankings);
    expect(base.totalVotes).toBe(legacy.totalVotes);
    expect(base.generationSequence).toBe(0);
  });

  it("baseline-private-history: 세 번 발표 → 서버 전용 history 0·1·2 · 네 번째에 0 지움 · T-3 은 seq−2 를 쓴다", async () => {
    const tid = "baselineT";
    const all = buildCorpus();
    await seedVotes(tid, all);
    await seedContestants(tid);
    const N = corpusEnd(all) + LAG + HOUR;
    await publishTournament(db, tid, FAR_DEADLINE, N, { toTimestamp });
    await publishTournament(db, tid, FAR_DEADLINE, N + 12 * HOUR, { toTimestamp });
    expect(await privateHistorySeqs(tid)).toEqual([0, 1]);
    // 기록이 그대로라 선택 수가 늘지 않는다 → 지금까지 T-3 없음.
    expect(await alertsOfType(tid, "T-3")).toHaveLength(0);

    // seq 0 (= 세 번째 발표의 seq−2) 만 선택 수를 1로 낮춘다 → T-3 이 이걸 읽으면 #1 이 +200% 이상.
    const h0 = db.collection(ACCUM).doc(tid).collection("history").doc("0");
    const d0 = (await h0.get()).data()!;
    await h0.set({ ...d0, rankings: (d0.rankings as Record<string, unknown>[]).map((r) => ({ ...r, voteCount: 1 })) });

    await publishTournament(db, tid, FAR_DEADLINE, N + 24 * HOUR, { toTimestamp });
    expect(await privateHistorySeqs(tid)).toEqual([0, 1, 2]);
    expect(await alertsOfType(tid, "T-3")).toHaveLength(1);
    expect((await cacheOf(tid))!.generationSequence).toBe(2);

    await publishTournament(db, tid, FAR_DEADLINE, N + 36 * HOUR, { toTimestamp });
    expect(await privateHistorySeqs(tid)).toEqual([1, 2, 3]);
    // 네 번째의 seq−2 는 고치지 않은 1 → 새 T-3 없음.
    expect(await alertsOfType(tid, "T-3")).toHaveLength(1);
    expect((await db.collection("ranking_cache").doc(tid).collection("history").get()).size).toBe(0);
  });

  it("baseline-fallback-once: 옛 모양 공개 캐시만 있으면 그 값으로 T-4 를 판정하고, 기준선을 서버 전용 자리에 옮긴다", async () => {
    const tid = "fallbackT";
    const all = buildCorpus();
    await seedVotes(tid, all);
    await seedContestants(tid);
    const legacy = await legacyUpdate(tid);
    // 지금 선택 수 순 1·2위 → 옛 캐시에선 맨 아래(순위 3 이상)였다고 심는다.
    const nowTop2 = toRateOrdered({
      tournamentId: tid,
      rankings: legacy.rankings,
      totalVotes: legacy.totalVotes,
      generationSequence: 0,
    })!.rankings.slice(0, 2).map((r) => r.contestantId);
    const oldRows = legacy.rankings.map((r) => ({
      ...r,
      voteCount: nowTop2.includes(r.contestantId) ? 1 : r.voteCount + 1000,
    }));
    const prevGeneratedAt = Timestamp.fromMillis(HOUR);
    await db.collection("ranking_cache").doc(tid).set({
      tournamentId: tid,
      rankings: oldRows,
      totalVotes: 999_999,
      runsTotal: 3,
      generationSequence: 5,
      generatedAt: prevGeneratedAt,
      previousGeneratedAt: null,
    });

    const nowMs = corpusEnd(all) + LAG + HOUR;
    await publishTournament(db, tid, FAR_DEADLINE, nowMs, { toTimestamp });
    expect(await alertsOfType(tid, "T-4")).toHaveLength(1);
    const cache = await cacheOf(tid);
    expect(cache!.generationSequence).toBe(6);
    expect(cache!.previousGeneratedAt.toMillis()).toBe(HOUR);
    expect(Object.keys(cache!)).not.toContain("totalVotes");
    // 옛 기준선(seq 5)은 서버 전용 자리에 한 번 옮겨져, 다음 발표는 공개 캐시를 다시 보지 않는다.
    expect(await privateHistorySeqs(tid)).toEqual([5, 6]);
    const moved = (await db.collection(ACCUM).doc(tid).collection("history").doc("5").get()).data()!;
    expect(moved.rankings.map((r: { voteCount: number }) => r.voteCount)).toEqual(oldRows.map((r) => r.voteCount));
    expect(moved.totalVotes).toBe(999_999);
  });

  it("baseline-fallback-needs-counts: 옛 캐시 행에 voteCount 가 없으면 기준선으로 쓰지 않는다(T-4 없음 · 옮기지 않음)", async () => {
    const tid = "fallbackNoCountT";
    const all = buildCorpus();
    await seedVotes(tid, all);
    await seedContestants(tid);
    const legacy = await legacyUpdate(tid);
    // 순위만 뒤집은 공개 모양 행 — 선택 수가 없으니 기준선이 될 수 없다.
    const n = legacy.rankings.length;
    await db.collection("ranking_cache").doc(tid).set({
      tournamentId: tid,
      rankings: legacy.rankings.map((r, i) => ({ ...toPublicEntry(r), rank: n - i })),
      runsTotal: 3,
      generationSequence: 5,
      generatedAt: Timestamp.fromMillis(HOUR),
      previousGeneratedAt: null,
    });
    await publishTournament(db, tid, FAR_DEADLINE, corpusEnd(all) + LAG + HOUR, { toTimestamp });
    expect(await alertsOfType(tid, "T-4")).toHaveLength(0);
    expect(await privateHistorySeqs(tid)).toEqual([6]);
  });
});

describe("차트 사진 영구 보관 (T5 PR 2 · 에뮬레이터)", () => {
  it("two-publishes-two-archives: 발표 2번 → gens 문서 2개 · 행에 영상 · 그림 · 선택 수 · 비율 없음", async () => {
    const tid = "archiveT";
    const all = buildCorpus();
    await seedVotes(tid, all);
    await seedContestants(tid);
    const nowMs = corpusEnd(all) + LAG + HOUR;
    await publishTournament(db, tid, FAR_DEADLINE, nowMs, { toTimestamp });
    await publishTournament(db, tid, FAR_DEADLINE, nowMs + 12 * HOUR, { toTimestamp });
    const gens = await db.collection("ranking_archive").doc(tid).collection("gens").get();
    expect(gens.docs.map((d) => d.id).sort()).toEqual(["0", "1"]);
    const cache = await cacheOf(tid);
    const g1 = gens.docs.find((d) => d.id === "1")!.data();
    expect(g1.tournamentId).toBe(tid);
    expect(g1.seq).toBe(1);
    expect(g1.runsTotal).toBe(cache!.runsTotal);
    expect(g1.generatedAtMs).toBe(nowMs + 12 * HOUR);
    expect(g1.rows.length).toBe(cache!.rankings.length);
    for (const row of g1.rows as Record<string, unknown>[]) {
      for (const k of ["videoId", "imageUrl", "voteCount", "rate"]) expect(Object.keys(row)).not.toContain(k);
      expect(typeof row.crownScore).toBe("number");
    }
  });
});
