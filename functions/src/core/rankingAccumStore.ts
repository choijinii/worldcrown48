/**
 * rankingAccumStore — T5 차트 증분 집계의 저장부 (설계보고 `outputs/T5_설계보고_2026-11-24.md` §2 · §3).
 *
 * 계산은 `incrementalTally`(순수)가 한다. 여기는 Firestore 를 **어떤 순서로 몇 건 읽고, 무엇을
 * 한 번에 쓰는가**만 정한다.
 *
 * ## 누적 문서 `ranking_accum/{tid}` (서버 전용 · 규칙 read·write 모두 false)
 *
 * `cursorMs` 까지 셀 수 있게 된 기록을 모두 더한 값(`accum`). 증분 한 번은 `[cursorMs, endMs)`
 * 구간만 읽어 더하고, 누적과 새 cursor 를 **`set` 한 번**으로 쓴다 — 누적만 쓰이고 cursor 가 안
 * 움직이는(또는 그 반대) 반쪽 상태가 생기면 다음 발표에서 같은 구간을 두 번 센다.
 *
 * ## 읽기 수 (`ReadCounts`)
 *
 * 부르는 쪽이 넘긴 계수기에 쿼리마다 읽은 문서 수를 더한다. 증분이 전량보다 싼지 크론 기록으로
 * 확인하려는 것이다(그림자 비교 · 처음부터 다시 세기는 뒤 과제가 `recount` · `shadow` 칸을 쓴다).
 */
import type { DocumentData, Firestore } from "firebase-admin/firestore";
import {
  RUN_VOTES,
  addAccum,
  candidateRunKeys,
  runDelta,
  runKeyOf,
  voteCountDelta,
  type AccumVote,
  type RankingAccum,
} from "./incrementalTally";

export const ACCUM = "ranking_accum",
  REQUESTS = "ranking_recount_requests",
  JOBS = "ranking_recount_jobs";

export interface AccumDoc {
  tournamentId: string;
  /** 이 시각(정수 ms) **전에** 셀 수 있게 된 기록까지 `accum` 에 들어 있다 — 반열린 구간의 끝. */
  cursorMs: number;
  accum: RankingAccum;
  updatedAtMs: number;
}

export interface ReadCounts {
  created: number;
  relinked: number;
  runFetch: number;
  recount: number;
  shadow: number;
}

/**
 * Timestamp → ms. `instanceof Timestamp` 를 쓰지 않는다 — 에뮬레이터 시험은 루트의
 * firebase-admin 으로 db 를 만들어 넘기므로 클래스가 functions 쪽과 다르다(모양으로 판정).
 */
function toMs(v: unknown): number | null {
  if (v && typeof (v as { toMillis?: unknown }).toMillis === "function") {
    return (v as { toMillis: () => number }).toMillis();
  }
  return null;
}

/**
 * votes 문서 → 증분이 읽는 모양. 시각은 `Timestamp.toMillis()`(ms 아래 버림) — 쿼리 경계
 * `Timestamp.fromMillis(정수 ms)` 와 같은 축이라, ms 아래 자리가 있는 기록도 정확히 한 구간에만
 * 든다(끝 E ms + 0.5ms 는 `< E` 에서 빠지고 `>= E` 에서 잡힌 뒤 E 로 읽힌다).
 * 칸이 없는 옛 기록(`runIndex` · `isGuest`)은 칸 없이 둔다 — 해석은 `tallyRuns` 정본 몫.
 */
export function voteFromDoc(id: string, data: DocumentData): AccumVote {
  const v: AccumVote = {
    id,
    userId: String(data.userId),
    round: Number(data.round),
    matchId: String(data.matchId),
    contestantId: String(data.contestantId),
    createdAtMs: toMs(data.createdAt) ?? 0,
    relinkedAtMs: toMs(data.relinkedAt),
  };
  if (typeof data.runIndex === "number") v.runIndex = data.runIndex;
  if (typeof data.isGuest === "boolean") v.isGuest = data.isGuest;
  return v;
}

export async function readAccum(db: Firestore, tid: string): Promise<AccumDoc | null> {
  const snap = await db.collection(ACCUM).doc(tid).get();
  if (!snap.exists) return null;
  return snap.data() as AccumDoc;
}

/**
 * 구간 `[startMs, endMs)` 에 `field` 시각이 든 이 대회 기록.
 * 경계는 `Date`(정수 ms)로 넘긴다 — Firestore 가 같은 ms 의 Timestamp 로 바꾸므로
 * `Timestamp.fromMillis` 와 같은 값이고, 넘겨받은 db 와 다른 패키지의 Timestamp 클래스를
 * 섞어 쓰는 오류("doesn't match the expected instance")를 피한다.
 */
async function readWindow(
  db: Firestore,
  tid: string,
  field: "createdAt" | "relinkedAt",
  startMs: number,
  endMs: number,
): Promise<AccumVote[]> {
  const snap = await db
    .collection("votes")
    .where("tournamentId", "==", tid)
    .where(field, ">=", new Date(startMs))
    .where(field, "<", new Date(endMs))
    .get();
  return snap.docs.map((d) => voteFromDoc(d.id, d.data()));
}

/**
 * 판 하나의 기록 전부. 회차가 있으면 (userId, tournamentId, runIndex) 색인으로 읽는다.
 * 회차 칸이 없는 옛 판(RUN-1 이전)은 그 쿼리에 안 잡히므로 (userId, tournamentId) 로 읽고
 * 메모리에서 회차 없음 / 1 만 남긴다 — `runKeyOf` 가 둘을 같은 판(회차 1)으로 묶는 것과 같은 규칙.
 */
async function fetchRun(
  db: Firestore,
  tid: string,
  userId: string,
  runIndex: number | undefined,
  reads: ReadCounts,
): Promise<AccumVote[]> {
  let q = db.collection("votes").where("userId", "==", userId).where("tournamentId", "==", tid);
  if (runIndex !== undefined) q = q.where("runIndex", "==", runIndex);
  const snap = await q.get();
  reads.runFetch += snap.size;
  const votes = snap.docs.map((d) => voteFromDoc(d.id, d.data()));
  return runIndex !== undefined ? votes : votes.filter((v) => v.runIndex === undefined || v.runIndex === 1);
}

/**
 * 증분 한 번: `[base.cursorMs, endMs)` 에 셀 수 있게 된 기록을 누적에 더하고 cursor 를 endMs 로.
 * `endMs <= base.cursorMs` 면 읽지도 쓰지도 않고 `base` 를 그대로 돌려준다(같은 구간 두 번 세기 방지).
 */
export async function applyIncrement(
  db: Firestore,
  tid: string,
  base: AccumDoc,
  endMs: number,
  reads: ReadCounts,
): Promise<AccumDoc> {
  const startMs = base.cursorMs;
  if (endMs <= startMs) return base;

  // ①② 구간 읽기 두 번 ③ id 로 합침(옮겨진 기록은 두 쿼리에 다 나올 수 있다)
  const created = await readWindow(db, tid, "createdAt", startMs, endMs);
  reads.created += created.length;
  const relinked = await readWindow(db, tid, "relinkedAt", startMs, endMs);
  reads.relinked += relinked.length;
  const byId = new Map<string, AccumVote>();
  for (const v of created.concat(relinked)) byId.set(v.id, v);
  const win = Array.from(byId.values());

  // ④ 이 구간에서 끝났을 수 있는 판 ⑤ 구간 안에 판 전부(46건)가 없으면 판을 따로 읽는다
  const inWin = new Map<string, AccumVote[]>();
  for (const v of win) {
    const k = runKeyOf(v);
    const b = inWin.get(k);
    if (b) b.push(v);
    else inWin.set(k, [v]);
  }
  const runs = new Map<string, AccumVote[]>();
  for (const key of candidateRunKeys(win, startMs, endMs)) {
    const have = inWin.get(key) ?? [];
    if (have.length >= RUN_VOTES) {
      runs.set(key, have);
      continue;
    }
    const sample = have[0];
    // 구간 안 조각에 회차 칸 없는 기록이 있으면 옛 판 — 회차 쿼리로는 그 기록이 안 잡힌다
    const legacy = have.some((v) => v.runIndex === undefined);
    runs.set(key, await fetchRun(db, tid, sample.userId, legacy ? undefined : sample.runIndex, reads));
  }

  // ⑥ 누적 + cursor 를 문서 하나 쓰기로
  const delta: RankingAccum = { ...runDelta(runs, startMs, endMs), voteCounts: voteCountDelta(win, startMs, endMs) };
  const next: AccumDoc = {
    tournamentId: tid,
    cursorMs: endMs,
    accum: addAccum(base.accum, delta),
    updatedAtMs: Date.now(),
  };
  await db.collection(ACCUM).doc(tid).set(next);
  return next;
}
