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
 *
 * ## 처음부터 다시 세기 (`runRecount`)
 *
 * 증분은 "지난 누적이 맞다"를 믿는다. 기록이 지워지거나(계정 삭제 · 전환 충돌) 운영자가 의심하면
 * 그 믿음이 깨지므로 `ranking_recount_requests/{tid}` 에 요청을 남기고, 다음 발표가 대회 기록을
 * `userId` 순으로 `RECOUNT_PAGE` 건씩 처음부터 다시 센다. 한 실행 예산(`RECOUNT_BUDGET_MS`)에
 * 닿으면 진행 상태를 `ranking_recount_jobs/{tid}` 에 두고, 5분 도우미 크론이 이어 센다.
 *
 * ## 발표 흐름 (`publishTournament`)
 *
 * 발표 크론이 대회마다 부른다: 다시 세기(필요하면) → 증분 → 그림자 비교(5만 건 미만) → 마지막
 * 확정 비교 → 캐시 쓰기(`rankingCacheWrite`) → 실행 기록 `rankingPublish`. 누적 쓰기는 모두
 * "읽은 누적이 그대로일 때만"이다 — 도우미가 그 사이 다시 세기를 끝냈으면 그 값 위에 다시 더한다.
 */
import { randomUUID } from "node:crypto";
import { FieldValue, type DocumentData, type Firestore, type WriteBatch } from "firebase-admin/firestore";
import { logger } from "firebase-functions";
import {
  RUN_VOTES,
  accumEquals,
  addAccum,
  candidateRunKeys,
  emptyAccum,
  isLastPublishInWindow,
  runDelta,
  runKeyOf,
  voteCountDelta,
  windowEndMs,
  type AccumVote,
  type RankingAccum,
} from "./incrementalTally";
import { defaultToTimestamp, writeCacheFromAccum, type ToTimestamp } from "./rankingCacheWrite";

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

/** 누적 쓰기가 다른 실행과 계속 부딪쳐 포기했다 — 부르는 쪽이 이 대회만 건너뛴다(기록 남김). */
export class AccumConflictError extends Error {
  constructor(tid: string) {
    super(`ranking_accum/${tid}: 다른 실행이 누적을 계속 바꿔 ${ACCUM_WRITE_ATTEMPTS}번 만에 포기`);
    this.name = "AccumConflictError";
  }
}

/** 누적 쓰기 재시도 한도 — 부딪치는 상대는 다시 세기 끝내기(드물다)뿐이라 3번이면 넉넉하다. */
export const ACCUM_WRITE_ATTEMPTS = 3;

/** 저장된 누적이 우리가 읽은 그 누적인가(시각 · 커서 · 값). 다르면 그 사이 누가 썼다. */
function sameAccumDoc(stored: AccumDoc, read: AccumDoc): boolean {
  return (
    stored.cursorMs === read.cursorMs &&
    stored.updatedAtMs === read.updatedAtMs &&
    accumEquals(stored.accum, read.accum)
  );
}

/**
 * 읽은 누적(`read`)이 아직 그대로일 때만 `next` 를 쓴다(트랜잭션 하나). 그 사이 다시 세기가 끝나
 * 누적을 바꿨다면 쓰지 않고 지금 저장된 누적을 돌려준다 — 낡은 누적으로 덮으면 다시 세기의 교정
 * (계정 삭제로 빠진 기록)을 잃는다. 문서가 없으면 잃을 것이 없으므로 쓴다.
 */
async function writeAccumIfUnchanged(
  db: Firestore,
  tid: string,
  read: AccumDoc,
  next: AccumDoc,
): Promise<{ ok: true } | { ok: false; current: AccumDoc }> {
  const ref = db.collection(ACCUM).doc(tid);
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (snap.exists) {
      const stored = snap.data() as AccumDoc;
      if (!sameAccumDoc(stored, read)) return { ok: false as const, current: stored };
    }
    tx.set(ref, next);
    return { ok: true as const };
  });
}

/**
 * 증분 한 번: `[base.cursorMs, endMs)` 에 셀 수 있게 된 기록을 누적에 더하고 cursor 를 endMs 로.
 * `endMs <= base.cursorMs` 면 읽지도 쓰지도 않고 `base` 를 그대로 돌려준다(같은 구간 두 번 세기 방지).
 *
 * 쓰기는 "읽은 누적이 그대로일 때만"이다(`writeAccumIfUnchanged`). 기록을 읽는 동안 도우미가 다시
 * 세기를 끝내 누적(cursor = asOf)을 바꿨으면, 새 누적을 읽어 그 위에서 증분을 다시 계산한다 —
 * 최대 `ACCUM_WRITE_ATTEMPTS` 번, 그래도 부딪치면 `AccumConflictError`.
 *
 * `opts.nowMs` — 누적 문서의 `updatedAtMs`(기본 `Date.now()`). 시험이 시각을 고정한다.
 */
export async function applyIncrement(
  db: Firestore,
  tid: string,
  base: AccumDoc,
  endMs: number,
  reads: ReadCounts,
  opts: { nowMs?: number } = {},
): Promise<AccumDoc> {
  let read = base;
  for (let attempt = 0; attempt < ACCUM_WRITE_ATTEMPTS; attempt++) {
    if (endMs <= read.cursorMs) return read;
    const next = await computeIncrement(db, tid, read, endMs, reads, opts.nowMs ?? Date.now());
    const res = await writeAccumIfUnchanged(db, tid, read, next);
    if (res.ok) return next;
    read = res.current;
  }
  throw new AccumConflictError(tid);
}

/** 증분 계산(읽기만) — `[base.cursorMs, endMs)` 를 읽어 다음 누적 문서를 만든다. 쓰지 않는다. */
async function computeIncrement(
  db: Firestore,
  tid: string,
  base: AccumDoc,
  endMs: number,
  reads: ReadCounts,
  nowMs: number,
): Promise<AccumDoc> {
  const startMs = base.cursorMs;

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

  // ⑥ 누적 + cursor 를 문서 하나로 — 쓰기는 부르는 쪽(applyIncrement)이 조건부로 한 번
  const delta: RankingAccum = { ...runDelta(runs, startMs, endMs), voteCounts: voteCountDelta(win, startMs, endMs) };
  return {
    tournamentId: tid,
    cursorMs: endMs,
    accum: addAccum(base.accum, delta),
    updatedAtMs: nowMs,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 처음부터 다시 세기 · 이어 세기 · 요청

/**
 * 한 페이지 기록 수 · 발표 크론 한 실행 예산(함수 시간 초과 540초 안에 쓰기까지 마칠 여유를 남긴다) ·
 * 도우미 크론 예산(5분 간격보다 짧게 — 길면 매번 다음 실행과 겹친다) · 임대 여유(마지막 페이지 ·
 * 쓰기가 예산을 넘겨도 다른 실행이 끼어들지 않게).
 */
export const RECOUNT_PAGE = 5_000,
  RECOUNT_BUDGET_MS = 400_000,
  HELPER_BUDGET_MS = 240_000,
  LEASE_SLACK_MS = 60_000;

/**
 * 서버 시각(요청)과 함수 시계(시작 시각)는 서로 다른 시계다. 요청은 시작보다 이만큼 앞서야
 * 지운다 — 경계 근처 요청은 남겨 한 번 더 세는 쪽으로 틀린다(교정을 잃는 쪽으로는 틀리지 않는다).
 */
export const REQUEST_CLOCK_SKEW_MS = 5_000;

/** `ranking_recount_jobs/{tid}` — 예산에 닿아 멈춘 다시 세기의 진행 상태. */
export interface RecountJob {
  tournamentId: string;
  /** 이 시각 **전에** 셀 수 있게 된 기록만 센다 — 끝나면 누적의 `cursorMs` 가 된다. */
  asOfMs: number;
  /** 여기까지(포함) 사람의 기록은 `partial` 에 다 들어 있다. 처음이면 null. */
  lastUserId: string | null;
  partial: RankingAccum;
  /** 대회의 마지막 확정 집계인가 — 끝나면 최종 차트를 써야 한다(Task 4 · 도우미 크론). */
  final: boolean;
  /**
   * 다시 세기를 처음 시작한 시각. 이어 세기에서도 바뀌지 않는다 — 요청 문서를 지울지 판단하는
   * 기준이라, 이어 센 시각으로 바꾸면 중간에 들어온 요청까지 지워 버린다.
   */
  startedAtMs: number;
  /**
   * 임대 — 이 시각까지는 `leaseHolder` 실행만 이어 센다. 발표 크론(540초)과 도우미 크론(5분)이
   * 같은 job 을 함께 이어 세면 진 쪽이 읽은 것을 모두 버린다(비용 두 배). 저장 · 끝낼 때 비운다.
   * 칸이 없는 job 은 임대 없음으로 본다.
   */
  leaseUntilMs?: number;
  leaseHolder?: string | null;
}

export type RecountReason = "user-delete" | "relink-conflict" | "admin";

/**
 * 서버 시각 표지를 만드는 함수. 기본은 functions 의 `FieldValue.serverTimestamp()`.
 * 에뮬레이터 시험은 루트의 firebase-admin 으로 만든 db 를 넘기는데, 두 패키지의 FieldValue 는
 * 서로 다른 클래스라 섞으면 직렬화가 거절된다 → 시험은 루트 쪽 것을 넘긴다(waitlistCore 와 같은 방식).
 */
export type ServerTime = () => unknown;
const defaultServerTime: ServerTime = () => FieldValue.serverTimestamp();

/** 요청은 대회당 문서 하나 — 여러 번 와도 다시 세기 한 번이면 다 풀린다(가장 늦은 시각만 남긴다). */
function recountRequestDoc(tid: string, reason: RecountReason, serverTime: ServerTime) {
  return { tournamentId: tid, reason, requestedAt: serverTime() };
}

export async function requestRecount(
  db: Firestore,
  tid: string,
  reason: RecountReason,
  serverTime: ServerTime = defaultServerTime,
): Promise<void> {
  await db.collection(REQUESTS).doc(tid).set(recountRequestDoc(tid, reason, serverTime), { merge: true });
}

/** 기록 지우기와 **같은 batch** 에 요청을 싣는다 — 지우기만 되고 요청이 빠지는 반쪽 상태를 막는다. */
export function addRecountRequestToBatch(
  db: Firestore,
  batch: WriteBatch,
  tid: string,
  reason: RecountReason,
  serverTime: ServerTime = defaultServerTime,
): void {
  batch.set(db.collection(REQUESTS).doc(tid), recountRequestDoc(tid, reason, serverTime), { merge: true });
}

/**
 * 한 사람 이상의 기록 **전부**를 `[0, asOfMs)` 로 센다. 사람 기록이 페이지에 다 들어 있어야
 * 판(46건)이 온전하다 — 부르는 쪽(`runRecount`)이 페이지 끝의 사람을 잘라 다음 페이지로 넘긴다.
 */
function tallyUsers(votes: AccumVote[], asOfMs: number): RankingAccum {
  const runs = new Map<string, AccumVote[]>();
  for (const v of votes) {
    const k = runKeyOf(v);
    const b = runs.get(k);
    if (b) b.push(v);
    else runs.set(k, [v]);
  }
  return { ...runDelta(runs, 0, asOfMs), voteCounts: voteCountDelta(votes, 0, asOfMs) };
}

/**
 * 처음부터 다시 세기. `ranking_recount_jobs/{tid}` 가 있으면 그 상태(asOf · final · partial ·
 * 시작 시각)로 이어 센다 — 넘겨받은 `asOfMs` · `final` 은 새로 시작할 때만 쓴다(이어 세는데 asOf
 * 를 바꾸면 앞 페이지와 뒤 페이지가 다른 구간을 센다).
 *
 * `resumeOnly`(도우미 크론): job 이 없으면 기록을 읽지 않고 `{done:false}`. 도우미가 job 목록을
 * 읽은 뒤 다른 실행이 그 job 을 끝내 지웠을 수 있다 — 그때 옛 asOf 로 새로 세기 시작하면 전량을
 * 한 번 더 읽고 cursor 를 뒤로 돌린다. 새 다시 세기는 발표 흐름만 시작한다.
 *
 * 이어 세기 전에 트랜잭션으로 임대를 잡는다. 다른 실행의 임대가 살아 있으면 읽지도 쓰지도 않고
 * `{done:false}`. 쓰기 직전에는 job 이 읽을 때 그대로인지(임대 주인 포함) 한 번 더 본다 — 임대가
 * 끝나 다른 실행이 넘겨받았다면 늦은 실행은 아무것도 쓰지 않는다(옛 asOf 로 누적을 덮어 cursor 가
 * 뒤로 가는 것을 막는다).
 *
 * asOf 이후에 옮겨진 기록(createdAt < asOf ≤ relinkedAt)은 셀 수 있게 된 시각이 asOf 뒤라
 * 여기서 빠지고, 다음 증분의 relinkedAt 쿼리가 asOf 부터 읽어 한 번 센다 — 따로 다룰 코드가 없다.
 *
 * 매 페이지 뒤 `nowMs() >= deadlineAtMs` 면 job 을 쓰고 `{done:false}`. 한 페이지는 반드시 끝내므로
 * 예산이 이미 지났어도 매 호출마다 앞으로 나아간다.
 */
export async function runRecount(
  db: Firestore,
  tid: string,
  opts: {
    asOfMs: number;
    final: boolean;
    deadlineAtMs: number;
    nowMs: () => number;
    pageSize?: number;
    resumeOnly?: boolean;
  },
  reads: ReadCounts,
): Promise<{ done: true; accum: AccumDoc; final: boolean } | { done: false }> {
  const pageSize = opts.pageSize ?? RECOUNT_PAGE;
  const jobRef = db.collection(JOBS).doc(tid);
  const me = randomUUID();

  // ① job 읽기 + 임대 잡기(트랜잭션 하나)
  const claimed = await db.runTransaction(async (tx): Promise<RecountJob | "skip" | null> => {
    const snap = await tx.get(jobRef);
    if (!snap.exists) return opts.resumeOnly ? "skip" : null;
    const j = snap.data() as RecountJob;
    const now = opts.nowMs();
    if ((j.leaseUntilMs ?? 0) > now && j.leaseHolder && j.leaseHolder !== me) return "skip";
    const leaseUntilMs = Math.min(opts.deadlineAtMs, now + RECOUNT_BUDGET_MS) + LEASE_SLACK_MS;
    tx.update(jobRef, { leaseUntilMs, leaseHolder: me });
    return { ...j, leaseUntilMs, leaseHolder: me };
  });
  if (claimed === "skip") return { done: false };

  const job: RecountJob = claimed ?? {
    tournamentId: tid,
    asOfMs: opts.asOfMs,
    lastUserId: null,
    partial: emptyAccum(),
    final: opts.final,
    startedAtMs: opts.nowMs(),
  };
  const loaded = claimed ? { lastUserId: job.lastUserId, startedAtMs: job.startedAtMs } : null;
  const stillOurs = (snap: { exists: boolean; data: () => DocumentData | undefined }): boolean => {
    if (!loaded) return !snap.exists;
    const d = snap.data();
    return (
      snap.exists &&
      !!d &&
      d.leaseHolder === me &&
      d.lastUserId === loaded.lastUserId &&
      d.startedAtMs === loaded.startedAtMs
    );
  };

  for (;;) {
    let q = db.collection("votes").where("tournamentId", "==", tid).orderBy("userId");
    if (job.lastUserId !== null) q = q.startAfter(job.lastUserId);
    const snap = await q.limit(pageSize).get();
    reads.recount += snap.size;
    const page = snap.docs.map((d) => voteFromDoc(d.id, d.data()));
    const finished = page.length < pageSize;

    let counted: AccumVote[];
    if (finished) {
      counted = page;
      if (page.length > 0) job.lastUserId = page[page.length - 1].userId;
    } else {
      const tailUser = page[page.length - 1].userId;
      if (page[0].userId === tailUser) {
        // 페이지 전체가 한 사람 — 자르면 앞으로 못 나간다. 그 사람만 따로 다 읽는다.
        const one = await db.collection("votes").where("userId", "==", tailUser).where("tournamentId", "==", tid).get();
        reads.recount += one.size;
        counted = one.docs.map((d) => voteFromDoc(d.id, d.data()));
      } else {
        // 꽉 찬 페이지의 마지막 사람은 다음 페이지에 이어질 수 있다 → 버리고 다음 페이지가 그 사람부터.
        counted = page.filter((v) => v.userId !== tailUser);
      }
      job.lastUserId = counted[counted.length - 1].userId;
    }
    job.partial = addAccum(job.partial, tallyUsers(counted, job.asOfMs));

    if (finished) break;
    if (opts.nowMs() >= opts.deadlineAtMs) {
      // 진행 저장 + 임대 비우기 — 다음 실행(도우미 · 발표)이 바로 이어 받는다.
      await db.runTransaction(async (tx) => {
        if (stillOurs(await tx.get(jobRef))) tx.set(jobRef, { ...job, leaseUntilMs: 0, leaseHolder: null });
      });
      return { done: false };
    }
  }

  // 끝: 누적 · job 삭제(임대도 함께 사라진다) · 요청 정리를 트랜잭션 하나로. 요청은 다시 세기 시작
  // 전에 들어온 것만 지운다 — 시작 뒤에 들어온 요청은 이미 읽은 페이지에 반영되지 않았을 수 있다.
  const accum: AccumDoc = {
    tournamentId: tid,
    cursorMs: job.asOfMs,
    accum: job.partial,
    updatedAtMs: opts.nowMs(),
  };
  const reqRef = db.collection(REQUESTS).doc(tid);
  const won = await db.runTransaction(async (tx) => {
    const cur = await tx.get(jobRef);
    const req = await tx.get(reqRef);
    if (!stillOurs(cur)) return false; // 다른 실행이 넘겨받았다 — 아무것도 쓰지 않는다
    tx.set(db.collection(ACCUM).doc(tid), accum);
    tx.delete(jobRef);
    if (req.exists) {
      const at = toMs(req.data()!.requestedAt);
      // 시각을 못 읽는 요청 · 시작 직전(시계 차이 안)의 요청은 남긴다 — 지우면 교정을 잃고,
      // 남기면 한 번 더 셀 뿐이다.
      if (at !== null && at <= job.startedAtMs - REQUEST_CLOCK_SKEW_MS) tx.delete(reqRef);
    }
    return true;
  });
  // final 은 job 의 값 — 이어 세기에서는 넘겨받은 opts.final 이 아니라 시작할 때 정한 값이 이긴다.
  return won ? { done: true, accum, final: job.final } : { done: false };
}

// ─────────────────────────────────────────────────────────────────────────────
// 발표 흐름 — 증분 · 그림자 비교 · 마지막 확정 · 실행 기록

/**
 * 그림자 비교: 증분이 맞는지 발표마다 전량을 한 번 더 세어 본다. 대회 기록이 이 수 이상이면
 * 건너뛴다(전량 읽기 비용 · 메모리) — 그 크기에서는 마지막 확정(처음부터 다시 세기)이 지킨다.
 * 끄는 자리는 여기 한 곳이다.
 */
export const SHADOW_ENABLED = true,
  SHADOW_MAX_VOTES = 50_000;

export type PublishMode = "increment" | "recount" | "recount-pending" | "final-recount";

export interface PublishLog {
  tournamentId: string;
  /**
   * increment = 누적에 증분만 · recount / final-recount = 처음부터 다시 세기를 이번에 끝냄
   * (final = 창 안 마지막 발표의 확정) · recount-pending = 다시 세기가 예산 안에 안 끝남.
   */
  mode: PublishMode;
  reads: ReadCounts;
  ms: number;
  rssMb: number;
  shadow: "match" | "mismatch" | "skipped";
  /** 차트 캐시를 썼는가. recount-pending 이고 누적이 없으면 false(옛 캐시 유지). */
  cacheWritten: boolean;
  /** 이번 구간 끝(발표 시각 − 2분). */
  endMs: number;
  /** writeCacheFromAccum 의 고정 읽기(contestants · 직전 캐시 · 24시간 전 세대 · 열린 경보). */
  readsFixed: number;
}

export interface PublishOptions {
  /** 함수 시계(예산 · 소요 시간 · updatedAtMs). 기본 `Date.now`. */
  clock?: () => number;
  /** 캐시 · 경보에 쓸 시각 값 — 에뮬레이터 시험은 루트 firebase-admin 의 것을 넘긴다. */
  toTimestamp?: ToTimestamp;
  /** 캐시 쓰기 — 시험이 "캐시 쓰기 전에 죽음"을 흉내 낸다. */
  writeCache?: typeof writeCacheFromAccum;
  /** 다시 세기 페이지 크기 — 시험이 예산 초과를 작은 기록으로 흉내 낸다. */
  recountPageSize?: number;
}

/** 누적 → 맞지 않은 곳 요약(관리자 경보 한 줄). 숫자는 관리자 전용이다. */
function mismatchDetail(label: string, cursorMs: number, have: RankingAccum, want: RankingAccum): string {
  const sum = (r: Record<string, number>) => Object.values(r).reduce((s, n) => s + n, 0);
  const ids = Array.from(new Set(Object.keys(have.voteCounts).concat(Object.keys(want.voteCounts))));
  const diff = ids.filter((k) => (have.voteCounts[k] ?? 0) !== (want.voteCounts[k] ?? 0)).length;
  return (
    `${label} · cursorMs=${cursorMs} · runsTotal ${have.runsTotal}→${want.runsTotal}` +
    ` · voteCount 합 ${sum(have.voteCounts)}→${sum(want.voteCounts)} · 다른 엔트리 ${diff}`
  );
}

/** `[0, endMs)` 전량을 한 번에 센 누적 — 그림자 비교의 기대값. */
async function shadowTally(db: Firestore, tid: string, endMs: number, reads: ReadCounts): Promise<RankingAccum> {
  const snap = await db.collection("votes").where("tournamentId", "==", tid).get();
  reads.shadow += snap.size;
  const votes = snap.docs.map((d) => voteFromDoc(d.id, d.data()));
  const runs = new Map<string, AccumVote[]>();
  for (const v of votes) {
    const k = runKeyOf(v);
    const b = runs.get(k);
    if (b) b.push(v);
    else runs.set(k, [v]);
  }
  return { ...runDelta(runs, 0, endMs), voteCounts: voteCountDelta(votes, 0, endMs) };
}

/**
 * 대회 하나의 발표. 순서(설계보고 §3):
 *   1. 구간 끝 = 발표 시각 − 2분. 누적 · 다시 세기 요청 · job 을 읽는다.
 *   2. job 이 있으면 이어 센다. 없고 (누적 없음 | 요청 있음 | 창 안 마지막 발표)면 새로 다시 센다
 *      (asOf = 구간 끝 · final = 마지막 발표). 예산 안에 못 끝냈는데 누적도 없으면 캐시를 쓰지 않고
 *      돌아간다(옛 캐시 유지 · 도우미가 이어 센다). 누적이 있으면 그 누적으로 계속.
 *   3. 누적 cursor 가 구간 끝 전이면 증분.
 *   4. 그림자 비교(5만 건 미만) — 다르면 경보 + 누적을 센 값으로(커서 그대로).
 *   5. 마지막 확정이 그 전 누적과 다르면 같은 경보("final").
 *   6. 캐시 쓰기 → 실행 기록.
 *
 * 마지막 확정의 비교 기준은 "증분을 구간 끝까지 더한 누적"이다 — 그래서 마지막 발표는 증분을 먼저
 * 하고 다시 센다. 요청이 있던 발표는 경보를 내지 않는다(지워진 기록 때문에 다른 것이 정상이다).
 *
 * 누적 쓰기는 모두 "읽은 그대로일 때만"이다(`applyIncrement` 주석). 도우미가 그 사이 다시 세기를
 * 끝내 cursor 를 asOf 로 되돌릴 수 있는데, 값은 맞고 다음 증분이 그 구간을 한 번 더 읽을 뿐이다.
 *
 * 캐시 쓰기 전에 죽으면 누적만 앞서 간다 — 다음 실행(같은 발표 시각이면 증분 0건)이 그 누적으로
 * 캐시를 쓴다. 대회 하나의 실패를 다른 대회로 번지지 않게 막는 것은 부르는 크론의 몫이다.
 */
export async function publishTournament(
  db: Firestore,
  tid: string,
  deadlineMs: number,
  nowMs: number,
  opts: PublishOptions = {},
): Promise<PublishLog> {
  const clock = opts.clock ?? Date.now;
  const toTimestamp = opts.toTimestamp ?? defaultToTimestamp;
  const writeCache = opts.writeCache ?? writeCacheFromAccum;
  const startedMs = clock();
  const deadlineAtMs = startedMs + RECOUNT_BUDGET_MS;
  const reads: ReadCounts = { created: 0, relinked: 0, runFetch: 0, recount: 0, shadow: 0 };

  // 1.
  const endMs = windowEndMs(nowMs);
  const isLast = isLastPublishInWindow(deadlineMs, nowMs);
  const [accumSnap, reqSnap, jobSnap] = await Promise.all([
    db.collection(ACCUM).doc(tid).get(),
    db.collection(REQUESTS).doc(tid).get(),
    db.collection(JOBS).doc(tid).get(),
  ]);
  let doc: AccumDoc | null = accumSnap.exists ? (accumSnap.data() as AccumDoc) : null;
  const hadRequest = reqSnap.exists;
  let mode: PublishMode = "increment";
  /** 이번 실행에서 [0, endMs) 를 처음부터 다 셌다 — 그림자 비교가 같은 일을 다시 할 필요가 없다. */
  let countedFullToEnd = false;
  const alerts: string[] = [];

  // 2.
  const recount = (asOfMs: number, final: boolean) =>
    runRecount(db, tid, { asOfMs, final, deadlineAtMs, nowMs: clock, pageSize: opts.recountPageSize }, reads);
  if (jobSnap.exists) {
    // 이어 세기 — asOf · final 은 job 의 값을 runRecount 가 쓴다(넘기는 값은 새로 시작할 때만 쓰인다).
    const job = jobSnap.data() as RecountJob;
    const res = await recount(job.asOfMs, job.final);
    if (res.done) {
      doc = res.accum;
      mode = res.final ? "final-recount" : "recount";
      countedFullToEnd = res.accum.cursorMs === endMs;
    } else {
      mode = "recount-pending";
    }
  } else if (!doc || hadRequest || isLast) {
    // 마지막 확정의 비교 기준 — 증분을 구간 끝까지 먼저 더해 둔다(다시 세기가 못 끝나도 이 누적으로 발표).
    let before: AccumDoc | null = null;
    if (isLast && doc && !hadRequest) {
      before = await applyIncrement(db, tid, doc, endMs, reads, { nowMs: clock() });
      doc = before;
    }
    const res = await recount(endMs, isLast);
    if (res.done) {
      mode = res.final ? "final-recount" : "recount";
      countedFullToEnd = res.accum.cursorMs === endMs;
      if (before && before.cursorMs === res.accum.cursorMs && !accumEquals(before.accum, res.accum.accum)) {
        alerts.push(mismatchDetail("final recount mismatch", endMs, before.accum, res.accum.accum));
      }
      doc = res.accum;
    } else {
      mode = "recount-pending";
    }
  }

  const finish = (shadow: PublishLog["shadow"], cacheWritten: boolean, readsFixed: number): PublishLog => {
    const log: PublishLog = {
      tournamentId: tid,
      mode,
      reads,
      ms: clock() - startedMs,
      rssMb: Math.round(process.memoryUsage().rss / 1_048_576),
      shadow,
      cacheWritten,
      endMs,
      readsFixed,
    };
    logger.info("rankingPublish", log);
    return log;
  };

  // 다시 세기 진행 중 · 셀 누적 없음 → 옛 캐시 유지(도우미가 이어 센다)
  if (!doc) return finish("skipped", false, 0);

  // 3.
  if (doc.cursorMs < endMs) doc = await applyIncrement(db, tid, doc, endMs, reads, { nowMs: clock() });

  // 4. 그림자 비교 — 누적의 cursor 까지를 전량으로 센 값과 견준다.
  let shadow: PublishLog["shadow"] = "skipped";
  let accum = doc.accum;
  if (SHADOW_ENABLED && !countedFullToEnd) {
    const n = (await db.collection("votes").where("tournamentId", "==", tid).count().get()).data().count;
    if (n < SHADOW_MAX_VOTES) {
      const want = await shadowTally(db, tid, doc.cursorMs, reads);
      if (accumEquals(doc.accum, want)) {
        shadow = "match";
      } else {
        shadow = "mismatch";
        // 요청이 남아 있는 발표(다시 세기가 아직 진행 중)는 지워진 기록 때문에 다른 것이 정상 — 고치기만 한다.
        if (!hadRequest) alerts.push(mismatchDetail("shadow mismatch", doc.cursorMs, doc.accum, want));
        accum = want;
        // 커서는 그대로. 그 사이 다른 실행이 누적을 바꿨으면 고치지 않는다(그쪽이 더 새 값) — 이번 캐시만 바른 값으로.
        await writeAccumIfUnchanged(db, tid, doc, { ...doc, accum: want, updatedAtMs: clock() });
      }
    }
  }

  // 5. 경보(그림자 · 마지막 확정) — admin_alerts 문서 모양만 같고 AnomalyTag 는 아니다.
  for (const detail of alerts) {
    await db.collection("admin_alerts").add({
      type: "ACCUM_MISMATCH",
      tournamentId: tid,
      detail,
      createdAt: toTimestamp(nowMs),
      resolved: false,
    });
  }

  // 6.
  const { readsFixed } = await writeCache(db, tid, accum, nowMs, { toTimestamp });
  return finish(shadow, true, readsFixed);
}
