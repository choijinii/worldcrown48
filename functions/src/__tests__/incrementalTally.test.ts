/**
 * incrementalTally — T5 증분 집계 순수 계산부 시험.
 *
 * 핵심은 골든 시험: 같은 기록 묶음을 여러 구간으로 나눠 증분을 더한 값이 끝 시점에
 * 처음부터 한 번에 센 값과 **한 자리까지** 같아야 한다(설계보고 §2 (가′) · §3).
 */
import { describe, expect, it } from "vitest";
import {
  type AccumVote,
  type RankingAccum,
  PUBLISH_LAG_MS,
  RUN_VOTES,
  accumEquals,
  accumToRankingInputs,
  addAccum,
  candidateRunKeys,
  countableAtMs,
  emptyAccum,
  inWindow,
  isLastPublishInWindow,
  runDelta,
  runKeyOf,
  voteCountDelta,
  windowEndMs,
} from "../core/incrementalTally";
import { buildTallies, tallyVotes } from "../core/rankingAggregator";
import { buildRankingUpdate } from "../core/scheduleRankingCacheCore";
import { tallyRuns } from "../_ranking/tallyRuns";
import { CLOSED_GRACE_HOURS, PUBLISH_INTERVAL_HOURS } from "../core/rankingWindow";

const HOUR = 3_600_000;
const CONTESTANTS = Array.from({ length: 48 }, (_, i) => `c${i}`);

/** 시험용 결정적 난수(mulberry32). */
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
  /** undefined → 필드 없는 옛 기록(회차 1로 읽힘). */
  runIndex?: number;
  /** true → isGuest true · "missing" → 칸 없는 옛 기록 · 기본 false. */
  guest?: boolean | "missing";
  startMs: number;
  stepMs: number;
  /** 이 시각 **전에** 만들어진 기록이 게스트 → 로그인으로 옮겨졌다(최종 모습: isGuest false). */
  relinkAt?: number;
  /** 앞에서부터 이만큼만 남긴다(미완주 판). 기본 46. */
  take?: number;
  seed?: number;
}

/**
 * 한 판 = 라운드 1~5 (24·12·6·3·1 = 46건). 다음 라운드 출전자 = 앞 라운드 승자.
 * 결승은 3명 중 1명.
 */
function makeRun(o: MakeRunOpts): AccumVote[] {
  const r = rng(o.seed ?? o.startMs + o.userId.length * 7919 + (o.runIndex ?? 0));
  const votes: AccumVote[] = [];
  let field = shuffled(CONTESTANTS, r);
  let t = o.startMs;
  const push = (round: number, m: number, contestantId: string) => {
    const created = t;
    t += o.stepMs;
    const relinked = o.relinkAt != null && created < o.relinkAt;
    const v: AccumVote = {
      id: `v${idSeq++}`,
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
  expect(votes).toHaveLength(RUN_VOTES);
  return votes.slice(0, o.take ?? RUN_VOTES);
}

function groupByRun(votes: AccumVote[]): Map<string, AccumVote[]> {
  const m = new Map<string, AccumVote[]>();
  for (const v of votes) {
    const k = runKeyOf(v);
    const b = m.get(k);
    if (b) b.push(v);
    else m.set(k, [v]);
  }
  return m;
}

function maxCountable(votes: AccumVote[]): number {
  return votes.reduce((mx, v) => Math.max(mx, countableAtMs(v)), 0);
}

// 발표 경계(시험용)
const T1 = 10 * HOUR;
const T2 = 20 * HOUR;
const T3 = 30 * HOUR;

function buildCorpus(): AccumVote[] {
  const all: AccumVote[] = [];
  const min = 60_000;
  // 로그인 판 20 (두 사람이 회차 여러 개 · 나머지는 한 판씩)
  for (let i = 0; i < 20; i++) {
    const user = i < 5 ? "heavy" : `u${i}`;
    all.push(...makeRun({ userId: user, runIndex: i < 5 ? i + 1 : 1, startMs: i * HOUR + 1_000, stepMs: min }));
  }
  // 게스트 판 3
  for (let i = 0; i < 3; i++) {
    all.push(...makeRun({ userId: `g${i}`, runIndex: 1, guest: true, startMs: (3 + i * 7) * HOUR, stepMs: min }));
  }
  // runIndex 없는 옛 판 1 · isGuest 없는 옛 판 1
  all.push(...makeRun({ userId: "legacyRun", startMs: 2 * HOUR, stepMs: min }));
  all.push(...makeRun({ userId: "legacyGuestField", runIndex: 1, guest: "missing", startMs: 4 * HOUR, stepMs: min }));
  // 미완주 판 2
  all.push(...makeRun({ userId: "quit1", runIndex: 1, startMs: 5 * HOUR, stepMs: min, take: 30 }));
  all.push(...makeRun({ userId: "quit2", runIndex: 2, startMs: 15 * HOUR, stepMs: min, take: 45 }));
  // 발표 경계에 걸친 판 2 (T1 · T2 를 가로지른다)
  all.push(...makeRun({ userId: "cross1", runIndex: 1, startMs: T1 - 20 * min, stepMs: min }));
  all.push(...makeRun({ userId: "cross2", runIndex: 3, startMs: T2 - 45 * min, stepMs: min }));
  // 게스트였다가 relink 된 완주 판 2 (판은 앞 구간에서 끝났고 옮긴 시각이 뒤 구간)
  all.push(...makeRun({ userId: "relinked1", runIndex: 1, startMs: 6 * HOUR, stepMs: min, relinkAt: 12 * HOUR }));
  all.push(...makeRun({ userId: "relinked2", runIndex: 1, startMs: 18 * HOUR, stepMs: min, relinkAt: T3 + 5 }));
  // 전환 뒤 이어서 끝낸 판 1 (앞 20건만 옮겨지고 나머지는 로그인으로)
  all.push(...makeRun({ userId: "continued", runIndex: 1, startMs: T2 - 20 * min, stepMs: min, relinkAt: T2 - 1 }));
  return all;
}

function randomCuts(seed: number, n: number, end: number): number[] {
  const r = rng(seed);
  const cuts = Array.from({ length: n - 1 }, () => Math.floor(r() * end));
  cuts.sort((a, b) => a - b);
  return [...cuts, end];
}

/** 구간 하나 증분(크론 흉내): 구간 읽기 → 후보 판 → 판 따로 읽기 → 더하기. */
function step(all: AccumVote[], acc: RankingAccum, start: number, end: number): RankingAccum {
  const win = all.filter(
    (v) => inWindow(v.createdAtMs, start, end) || (v.relinkedAtMs != null && inWindow(v.relinkedAtMs, start, end)),
  );
  const keys = new Set(candidateRunKeys(win, start, end));
  const runs = groupByRun(all.filter((v) => keys.has(runKeyOf(v))));
  return addAccum(acc, { ...runDelta(runs, start, end), voteCounts: voteCountDelta(win, start, end) });
}

describe("incrementalTally", () => {
  it("상수", () => {
    expect(PUBLISH_LAG_MS).toBe(120_000);
    expect(RUN_VOTES).toBe(46);
    expect(windowEndMs(1_000_000)).toBe(880_000);
  });

  it("golden: 증분을 여러 구간으로 나눠 더한 값 = 끝 시점 한 번에 센 값", () => {
    const all = buildCorpus();
    const E = maxCountable(all) + 1;
    const full = addAccum(
      { ...emptyAccum(), voteCounts: voteCountDelta(all, 0, E) },
      runDelta(groupByRun(all), 0, E),
    );
    // 전량과도 맞는가(완주 로그인 판 20 + 옛 판 2 + 경계 2 + relink 2 + 이어서 1 = 27)
    expect(full.runsTotal).toBe(tallyRuns(all).runsTotal);
    expect(full.runsTotal).toBe(27);
    for (const cuts of [[E], [T1, E], [T1, T2, T3, E], randomCuts(42, 7, E), randomCuts(7, 30, E)]) {
      let acc = emptyAccum();
      let start = 0;
      for (const end of cuts) {
        acc = step(all, acc, start, end);
        start = end;
      }
      expect(accumEquals(acc, full)).toBe(true);
    }
  });

  it("같은 기록이 두 쿼리 결과로 두 번 들어와도 한 번만 센다", () => {
    const run = makeRun({ userId: "u", runIndex: 1, startMs: 0, stepMs: 10 });
    const once = voteCountDelta(run, 0, 10_000);
    const twice = voteCountDelta([...run, ...run], 0, 10_000);
    expect(twice).toEqual(once);
    expect(Object.values(once).reduce((s, n) => s + n, 0)).toBe(46);
  });

  // 옛 "split-relink"(판의 앞 조각만 옮겨진 구간)는 실제로 생기지 않는 상태였다 — 전환은 판 하나를
  // 통째로 한 batch(= relinkedAt 하나)에 옮긴다(linkSessionVote `relinkGuestVotes` 의 불변식 ·
  // 에뮬레이터 `relink-split-pages` · `relink-publish-between-batches`). 여기는 그 실제 모양:
  // 게스트로 돈 판 전부가 뒤 구간의 한 시각에 옮겨진다.
  it("whole-relink: 판 전부가 뒤 구간에서 한 번에 옮겨지면 그 구간에서 한 번 센다", () => {
    const run = makeRun({ userId: "x", runIndex: 1, startMs: 0, stepMs: 10, relinkAt: 200_000, seed: 3 });
    expect(run.every((v) => v.relinkedAtMs === 200_000 && v.isGuest === false)).toBe(true);
    let acc = step(run, emptyAccum(), 0, 150_000);
    // 옮기기 전에는 게스트 판이라 판도 선택 수도 세지 않는다(셀 수 있게 된 시각 = 200_000)
    expect(acc.runsTotal).toBe(0);
    expect(Object.values(acc.voteCounts).reduce((s, n) => s + n, 0)).toBe(0);
    acc = step(run, acc, 150_000, 300_000);
    expect(acc.runsTotal).toBe(1);
    expect(Object.values(acc.voteCounts).reduce((s, n) => s + n, 0)).toBe(46);
    acc = step(run, acc, 300_000, 400_000);
    expect(acc.runsTotal).toBe(1);
  });

  it("guest run excluded but isGuest-missing legacy run counted", () => {
    const guest = makeRun({ userId: "g", runIndex: 1, guest: true, startMs: 0, stepMs: 10 });
    const legacy = makeRun({ userId: "l", runIndex: 1, guest: "missing", startMs: 0, stepMs: 10 });
    const all = [...guest, ...legacy];
    expect(legacy.every((v) => !("isGuest" in v))).toBe(true);
    const d = runDelta(groupByRun(all), 0, 10_000);
    expect(d.runsTotal).toBe(1);
    expect(d.voteCounts).toEqual({});
    expect(Object.values(voteCountDelta(all, 0, 10_000)).reduce((s, n) => s + n, 0)).toBe(46);
  });

  it("runIndex 없는 기록은 회차 1 로 묶인다", () => {
    expect(runKeyOf({ userId: "a" })).toBe(runKeyOf({ userId: "a", runIndex: 1 }));
    expect(runKeyOf({ userId: "a", runIndex: 2 })).not.toBe(runKeyOf({ userId: "a", runIndex: 1 }));
    // 앞 절반은 칸 없음 · 뒤 절반은 runIndex 1 → 한 판
    const run = makeRun({ userId: "a", runIndex: 1, startMs: 0, stepMs: 10 }).map((v, i) => {
      if (i >= 23) return v;
      const { runIndex: _drop, ...rest } = v;
      return rest as AccumVote;
    });
    expect(candidateRunKeys(run, 0, 10_000)).toEqual([runKeyOf({ userId: "a", runIndex: 1 })]);
    expect(runDelta(groupByRun(run), 0, 10_000).runsTotal).toBe(1);
  });

  it("inWindow 은 [start,end) — end 와 같은 ms 는 다음 구간", () => {
    expect(inWindow(100, 0, 100)).toBe(false);
    expect(inWindow(100, 100, 200)).toBe(true);
    expect(inWindow(99, 0, 100)).toBe(true);
  });

  it("countableAtMs = relinkedAtMs ?? createdAtMs", () => {
    const base = { id: "a", userId: "u", round: 1, matchId: "m", contestantId: "c" };
    expect(countableAtMs({ ...base, createdAtMs: 5, relinkedAtMs: null })).toBe(5);
    expect(countableAtMs({ ...base, createdAtMs: 5, relinkedAtMs: 9 })).toBe(9);
  });

  it("addAccum 은 새 객체를 돌려주고 입력을 바꾸지 않는다 · accumEquals 는 0 키를 없는 것으로 본다", () => {
    const a: RankingAccum = {
      voteCounts: { x: 1 },
      runsTotal: 1,
      byContestant: { x: { placementPoints: 10, wins: 1, picks: 2 } },
    };
    const b: RankingAccum = {
      voteCounts: { x: 2, y: 1 },
      runsTotal: 2,
      byContestant: { x: { placementPoints: 5, wins: 0, picks: 1 } },
    };
    const snapA = JSON.stringify(a);
    const snapB = JSON.stringify(b);
    const s = addAccum(a, b);
    expect(JSON.stringify(a)).toBe(snapA);
    expect(JSON.stringify(b)).toBe(snapB);
    expect(s).toEqual({
      voteCounts: { x: 3, y: 1 },
      runsTotal: 3,
      byContestant: { x: { placementPoints: 15, wins: 1, picks: 3 } },
    });
    expect(
      accumEquals(
        { ...a, voteCounts: { x: 1, z: 0 }, byContestant: { ...a.byContestant, z: { placementPoints: 0, wins: 0, picks: 0 } } },
        a,
      ),
    ).toBe(true);
    expect(accumEquals(a, b)).toBe(false);
    expect(accumEquals(a, { ...a, runsTotal: 2 })).toBe(false);
  });

  it("accumToRankingInputs → buildRankingUpdate 결과가 기존 전량 집계와 같다", () => {
    const all = buildCorpus();
    const E = maxCountable(all) + 1;
    let acc = emptyAccum();
    let start = 0;
    for (const end of [T1, T2, T3, E]) {
      acc = step(all, acc, start, end);
      start = end;
    }
    const { counts, runs } = accumToRankingInputs(acc);
    const fullCounts = tallyVotes(all);
    const fullRuns = tallyRuns(all);
    expect(new Map(Array.from(counts.entries()).sort())).toEqual(new Map(Array.from(fullCounts.entries()).sort()));
    expect(runs.runsTotal).toBe(fullRuns.runsTotal);
    expect(new Map(Array.from(runs.byContestant.entries()).sort())).toEqual(
      new Map(Array.from(fullRuns.byContestant.entries()).sort()),
    );
    const metas = CONTESTANTS.map((id) => ({ id, name: id.toUpperCase(), videoId: "" }));
    const common = { tournamentId: "t", prevCache: null, history24: null, existingUnresolvedTags: [] };
    const inc = buildRankingUpdate({ ...common, tallies: buildTallies(counts, metas), runs });
    const ref = buildRankingUpdate({ ...common, tallies: buildTallies(fullCounts, metas), runs: fullRuns });
    expect(inc.rankings.length).toBeGreaterThan(0);
    expect(inc.rankings).toEqual(ref.rankings);
    expect(inc.runsTotal).toBe(ref.runsTotal);
    expect(inc.totalVotes).toBe(ref.totalVotes);
  });

  it("isLastPublishInWindow: 마감 2시간 전 발표 false · 마감 1시간 뒤 발표 true", () => {
    // 창 = 마감 + 13시간 · 다음 발표 = 지금 + 12시간
    expect(PUBLISH_INTERVAL_HOURS).toBe(12);
    expect(CLOSED_GRACE_HOURS).toBe(13);
    const deadline = 1_000 * HOUR;
    expect(isLastPublishInWindow(deadline, deadline - 2 * HOUR)).toBe(false);
    expect(isLastPublishInWindow(deadline, deadline + 1 * HOUR)).toBe(true);
    // 경계: 마감 1시간 뒤 발표(위)는 다음 발표가 정확히 마감 + 13h — isInRankingWindow 의
    // 초과 비교로 창 밖이므로 이번이 마지막이다. 1ms 이르면 다음 발표가 아직 창 안.
    expect(isLastPublishInWindow(deadline, deadline + 1 * HOUR - 1)).toBe(false);
  });
});
