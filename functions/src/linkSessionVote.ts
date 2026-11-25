/**
 * linkSessionVote — re-parents the guest vote to the freshly signed-in user.
 *
 * Trigger flow (handoff §부록 A): the visitor casts a guest vote against
 * their anonymous uid A. They open the LoginModal, sign in with Google
 * (new uid B), and the client calls this function with { anonUid: A }.
 * We update the vote rows from userId=A to userId=B, carry the per-Voter
 * bracket seed (bracket_seeds, ADR-0007 / §8 Edge #1) so the bracket does not
 * reshuffle on login, and tidy up the now-orphaned anonymous account so the
 * project doesn't accumulate ghosts.
 *
 * Caller authorisation: the new uid is `req.auth.uid` (B). The body only
 * carries the old anon uid. We refuse if:
 *   - the caller is not signed in
 *   - anonUid equals the caller's own uid (no-op or attempted self-loop)
 *   - anonUid does not name an actual anonymous account (defensive — keeps
 *     a malicious caller from passing another real user's uid and getting
 *     us to delete their account)
 *
 * **v2.1 (2026-09-06)**: 게스트 한도가 하루 3판이 되면서 한 대회에 여러 회차가 생길 수 있다.
 * `GUEST_RUN_INDEX = 1` 고정은 "게스트는 하루 1판"이라는 v2.0 전제에 기대고 있었고, 그 전제가
 * 깨지면 2·3판째의 진행·씨앗·카드가 이관되지 않고 사라진다 — votes 는 통째로 재부모화되므로
 * 그 판들의 선택만 남고 진행이 없어져, 로그인 직후 팬이 완주했던 판이 사라진 것처럼 보인다.
 * 이제 게스트의 `tournament_runs.runIndex` 를 읽어 회차 1..R을 전부 옮긴다.
 *
 * 재부모화한 vote 에는 `isGuest: false` 를 찍는다 — "로그인하면 내 선택이 랭킹에 반영된다"가
 * 실제로 성립하려면 필수다(§16 5). 이 줄이 없으면 옮겨온 선택이 PR 3의 필터에 계속 걸린다.
 *
 * sessionId scoping (handoff §4-6 #2): the spec asks for an additional
 * `sessionId == current` constraint. sessionId is written to vote rows
 * by C-1's onVote, which is not yet implemented; until it is, querying by
 * userId==anonUid alone is correct because anonymous uids are scoped to
 * one device. We'll thread sessionId through when C-1 lands.
 */
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { FieldValue, type Firestore, type QueryDocumentSnapshot } from "firebase-admin/firestore";
import { adminAuth, adminDb } from "./admin";
import { addRecountRequestToBatch, type ServerTime } from "./core/rankingAccumStore";
import { ALLOWED_ORIGINS } from "./cors";
import {
  distinctTournamentIds,
  planSeedTransfer,
  type AnonSeed,
} from "./core/linkSeeds";
import {
  planRoundProgressTransfer,
  transferredTournaments,
  conflictTournamentIds,
  type RoundProgressFacts,
} from "./core/linkRoundProgress";
import { kstDate } from "./core/voteRecord";
import { runDocId, tournamentRunsDocId } from "./_run/runDocId";
import { effectiveRunsToday } from "./_run/decideRun";

/** 게스트 기록 읽기 한 페이지. */
const BATCH_LIMIT = 500;
/**
 * 전환 batch 한 번의 쓰기 상한. Firestore 상한 500 에서 충돌 대회의 다시 세기 요청 몫을 남긴다 —
 * 요청은 그 대회의 옛 기록 지우기와 **같은 batch** 에 싣는다(아래 `relinkGuestVotes`).
 * 판 하나는 46건이라 판 단위로 담아도 이 상한 하나로 충분하다.
 */
export const RELINK_WRITE_LIMIT = 450;
const TIMEOUT_SECONDS = 30;

interface LinkSessionVoteRequest {
  anonUid: string;
}

interface LinkSessionVoteResponse {
  ok: true;
  linked: number;
  /** One entry per tournament the guest run touched; `complete` + `source` drive
   * the client landing (W6 → /arena/{tid}/champion). `source: "guest"` = the run
   * just completed (preferred), `"existing"` = a conflict card (fallback + banner). */
  tournaments: Array<{ tournamentId: string; complete: boolean; source: "guest" | "existing" }>;
}

/**
 * 게스트가 그 대회에서 돈 판의 수 R (= 마지막 회차) — v2.1.
 *
 * 한도가 3판이 되면서 한 대회에 회차가 여럿일 수 있다. R을 모르면 2·3판째의 진행·씨앗·카드가
 * 이관되지 않고 사라진다. 문서가 없으면(회차 도입 전 게스트) 1이다 — 접미사 없는 옛 문서가
 * 곧 1회차 문서다(§3.0 B안).
 */
async function guestRunCount(anonUid: string, tid: string): Promise<number> {
  const snap = await adminDb
    .doc(`tournament_runs/${tournamentRunsDocId(anonUid, tid)}`)
    .get();
  const n = Number(snap.get("runIndex") ?? 0);
  return Number.isInteger(n) && n > 0 ? n : 1;
}

/**
 * Read the roundProgress facts for each tournament the guest voted in (HF-3.1:
 * fetched ONCE, up front — the caller needs `conflictTournamentIds(facts)` to
 * branch the votes write phase BEFORE any vote is moved). Pure decision-making
 * lives in linkRoundProgress.ts; this is the read half.
 */
async function fetchRoundProgressFacts(
  anonUid: string,
  googleUid: string,
  tids: string[],
): Promise<RoundProgressFacts[]> {
  const perTid = await Promise.all(
    tids.map(async (tid) => {
      const runs = await guestRunCount(anonUid, tid);
      // 충돌 판정은 **대회 단위**다: Google이 1회차 문서를 가지고 있으면 그 계정은 이미 그
      // 대회에 판이 있다(회차는 단조 증가라 1회차 없이 2회차가 생기지 않는다). 그러면 게스트
      // 회차 전부를 버린다 — HF-3.1 케이스 2 무변경.
      const googleFirst = await adminDb
        .doc(`roundProgress/${runDocId(googleUid, tid, 1)}`)
        .get();
      const googleExists = googleFirst.exists;
      const googleComplete = googleFirst.get("complete") === true;

      return Promise.all(
        Array.from({ length: runs }, (_, i) => i + 1).map(async (runIndex) => {
          const guestSnap = await adminDb
            .doc(`roundProgress/${runDocId(anonUid, tid, runIndex)}`)
            .get();
          return {
            tournamentId: tid,
            runIndex,
            guestExists: guestSnap.exists,
            guestComplete: guestSnap.get("complete") === true,
            googleExists,
            googleComplete,
          };
        }),
      );
    }),
  );
  return perTid.flat();
}

/**
 * Execute the roundProgress transfer plan for the pre-fetched facts (HF-3 W4,
 * Phase 3.3). Returns the response payload (one entry per tournament, now with
 * `source`). See linkRoundProgress.ts for the decision table; the completed-run
 * REFIRE path writes in TWO separate commits so onChampionConfirmed
 * (onDocumentUpdated) sees the false→true edge and regenerates the Crown Card
 * under the new uid.
 */
async function executeRoundProgressPlan(
  anonUid: string,
  googleUid: string,
  facts: RoundProgressFacts[],
): Promise<ReturnType<typeof transferredTournaments>> {
  const plan = planRoundProgressTransfer(facts);

  for (const decision of plan) {
    if (decision.action === "skip") continue;
    const tid = decision.tournamentId;
    // v2.1: 회차마다 문서가 따로다. 1로 고정하면 2·3판째가 1판째 문서를 덮어쓴다.
    const guestSnap = await adminDb
      .doc(`roundProgress/${runDocId(anonUid, tid, decision.runIndex)}`)
      .get();
    const guestData = guestSnap.data() ?? {};
    const targetRef = adminDb.doc(
      `roundProgress/${runDocId(googleUid, tid, decision.runIndex)}`,
    );

    if (decision.action === "copy") {
      // Incomplete run → single create under the new uid (no trigger needed).
      await targetRef.set({
        ...guestData,
        userId: googleUid,
        updatedAt: FieldValue.serverTimestamp(),
      });
    } else {
      // REFIRE — 2 separate commits so onDocumentUpdated fires (§확인 필요 2).
      await targetRef.set({
        ...guestData,
        userId: googleUid,
        complete: false,
        updatedAt: FieldValue.serverTimestamp(),
      });
      await targetRef.set(
        {
          complete: true,
          championId: guestData.championId ?? null,
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
    }
  }

  return transferredTournaments(plan);
}

/**
 * 이관된 판을 Google 계정의 판 원장에 반영한다 (§8 Edge #5의 v2.0판).
 *
 * RUN-1 이전에는 `daily_participation` 의 참가 Tournament 집합을 합쳤다. v2.0에서 세는
 * 단위가 "참가한 Tournament"가 아니라 **판**이 되었으므로, 이관된 Tournament마다
 * `tournament_runs` 에 1판을 기록한다. 이게 없으면 "게스트로 1판 돌고 로그인"이 하루
 * 한도를 세탁한다 — 게스트가 완주한 판이 Google 계정에서는 없던 일이 된다.
 *
 * **이관된 Tournament만** 대상이다. 충돌(HF-3.1 케이스 2)로 게스트 판이 버려진
 * Tournament는 옮겨온 판이 없으므로 한도도 소모하지 않는다.
 *
 * 이관이 일어났다는 것은 Google 계정에 그 Tournament의 판이 없었다는 뜻이라(충돌 판정이
 * 곧 그 검사다) 회차는 **게스트가 돈 판 수 R** 이 된다. v2.1 전에는 게스트가 하루 1판이라
 * 언제나 1이었다. 그래도 기존 값을 읽어 확인한다 — 예상은 확인이 아니다.
 * 실패는 비치명적이다: 선택은 이미 옮겨졌고, 한도 몇 판이 덜 세어지는 것이 로그인 직후
 * 전체 실패보다 낫다.
 */
async function mergeTournamentRuns(
  googleUid: string,
  anonUid: string,
  transferredTids: string[],
): Promise<void> {
  if (transferredTids.length === 0) return;
  const date = kstDate();
  for (const tid of transferredTids) {
    try {
      const ref = adminDb.doc(`tournament_runs/${tournamentRunsDocId(googleUid, tid)}`);
      const snap = await ref.get();
      const stored = snap.data() ?? {};
      const existingRunIndex = Number(stored.runIndex ?? 0);
      // 이미 판이 있으면 충돌이었어야 한다 — 이관되지 않았을 것이므로 손대지 않는다.
      if (existingRunIndex > 0) continue;
      // v2.1: 게스트가 그 대회에서 돈 판이 여럿일 수 있다. 1로 고정하면 회차가 뒤로 감겨
      // 다음 판이 이미 있는 문서 위에 올라탄다(create-once 씨앗이라 어제 대진표가 나온다).
      const runs = await guestRunCount(anonUid, tid);
      const runsToday = effectiveRunsToday({
        lastRunDate: (stored.lastRunDate as string | undefined) ?? null,
        runsToday: Number(stored.runsToday ?? 0),
        todayKST: date,
      });
      await ref.set(
        {
          runIndex: runs,
          runsToday: runsToday + runs,
          lastRunDate: date,
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
    } catch (err) {
      console.warn("[linkSessionVote] tournament_runs merge failed:", tid, err);
    }
  }
}

/**
 * 게스트 계정의 기록 전부(`__name__` 순 페이지로 읽어 모은다). PASS 1 이 대회 목록을 정하려고
 * 읽고, PASS 2 가 같은 문서를 그대로 옮긴다 — 두 번 읽지 않는다. 게스트는 판이 몇 개뿐이라
 * (하루 3판 · 판당 46건) 메모리에 다 올려도 된다.
 */
export async function readAnonVotes(db: Firestore, anonUid: string): Promise<QueryDocumentSnapshot[]> {
  const out: QueryDocumentSnapshot[] = [];
  let cursor: QueryDocumentSnapshot | undefined;
  for (;;) {
    let q = db.collection("votes").where("userId", "==", anonUid).orderBy("__name__").limit(BATCH_LIMIT);
    if (cursor) q = q.startAfter(cursor);
    const snap = await q.get();
    if (snap.empty) break;
    out.push(...snap.docs);
    cursor = snap.docs[snap.docs.length - 1];
    if (snap.size < BATCH_LIMIT) break;
  }
  return out;
}

interface VoteFields {
  tournamentId?: string;
  runIndex?: unknown;
  isGuest?: unknown;
}

/** 판 하나(대회 · 회차)의 기록 — 전환 batch 에 나뉘지 않고 통째로 들어가는 단위. */
interface RunGroup {
  docs: QueryDocumentSnapshot[];
  /** 충돌로 지우는 기록 중 이미 센(게스트 아닌) 기록이 있는 대회 — 이 batch 에 요청을 싣는다. */
  legacyConflictTid: string | null;
}

/**
 * 판(대회 · `runIndex ?? 1`)마다 묶는다. 차트는 userId + 회차로 판을 세는데, 게스트 계정의
 * 기록이라 userId 는 하나다 — 대회 · 회차만으로 판이 정해진다.
 */
function groupByRun(docs: QueryDocumentSnapshot[], conflictTids: Set<string>): RunGroup[] {
  const groups = new Map<string, RunGroup>();
  for (const d of docs) {
    const data = d.data() as VoteFields;
    const tid = data.tournamentId ?? "";
    const run = typeof data.runIndex === "number" ? data.runIndex : 1;
    const key = JSON.stringify([tid, run]);
    let g = groups.get(key);
    if (!g) {
      g = { docs: [], legacyConflictTid: null };
      groups.set(key, g);
    }
    g.docs.push(d);
    // 칸 없는 옛 기록 · isGuest:false 는 이미 세어졌다 → 지우면 다시 세야 빠진다
    if (data.tournamentId && conflictTids.has(data.tournamentId) && data.isGuest !== true) {
      g.legacyConflictTid = data.tournamentId;
    }
  }
  return Array.from(groups.values());
}

/**
 * 판들을 batch 로 담는다 — 판은 나누지 않고, batch 의 쓰기(기록 + 그 batch 의 요청)가 `limit` 을
 * 넘기 전에 끊는다. 판 하나가 혼자 상한을 넘으면(판당 46건이라 실제로는 없다) 아무것도 쓰기 전에 던진다.
 */
function packRuns(groups: RunGroup[], limit: number): { groups: RunGroup[]; requestTids: string[] }[] {
  const plan: { groups: RunGroup[]; requestTids: string[] }[] = [];
  let cur = { groups: [] as RunGroup[], requestTids: new Set<string>(), writes: 0 };
  const cost = (g: RunGroup, reqs: Set<string>) =>
    g.docs.length + (g.legacyConflictTid && !reqs.has(g.legacyConflictTid) ? 1 : 0);
  const flush = () => {
    if (cur.groups.length > 0) plan.push({ groups: cur.groups, requestTids: Array.from(cur.requestTids) });
    cur = { groups: [], requestTids: new Set<string>(), writes: 0 };
  };
  for (const g of groups) {
    const alone = cost(g, new Set());
    if (alone > limit) {
      throw new Error(
        `relinkGuestVotes: 판 하나의 쓰기 ${alone}건이 batch 쓰기 상한 ${limit}건을 넘는다 — 판을 나누면 차트가 판을 두 번 센다`,
      );
    }
    if (cur.writes + cost(g, cur.requestTids) > limit) flush();
    cur.writes += cost(g, cur.requestTids);
    if (g.legacyConflictTid) cur.requestTids.add(g.legacyConflictTid);
    cur.groups.push(g);
  }
  flush();
  return plan;
}

/**
 * PASS 2 몸통 — 충돌 아닌 대회의 기록은 로그인 계정으로 옮기고, 충돌 대회의 기록은 지운다.
 * 에뮬레이터 시험이 이 몸통을 직접 부르려고 함수 밖으로 꺼냈다.
 *
 * T5 증분 집계가 기대하는 것(설계보고 §2 (가′)):
 *
 *   · **판 하나는 batch 하나에 통째로** 들어간다(그래서 relinkedAt 도 판마다 하나). 예전처럼
 *     `__name__` 순 500건 조각으로 옮기면 자동 id 가 흩어 놓은 판의 46건이 여러 조각에 걸친다. 조각
 *     사이에 발표가 돌면 이미 옮겨진 앞 조각(isGuest:false · 라운드 5 포함)만으로 판을 세고, 뒤
 *     조각이 옮겨진 구간에서 그 판을 한 번 더 센다. 판 단위 batch 면 반쯤 옮겨진 판을 볼 수 없다.
 *   · `relinkedAt` 은 **지금 `isGuest === true` 인 기록에만** 찍는다. 게스트 기록은 그동안 세지
 *     않았으므로 옮긴 시각이 처음으로 셀 수 있게 된 시각이다. 이미 센 기록(칸 없는 옛 기록 ·
 *     `isGuest: false`)에 찍으면 그 판의 max(countableAt) 이 뒤 구간으로 옮겨가 판이 한 번 더 세어진다.
 *   · 충돌로 지우는 기록 중 `isGuest !== true`(옛 기록)는 이미 차트에 들어가 있다 — 증분은 지운 것을
 *     뺄 수 없으므로 다시 세기를 요청한다. 요청은 **그 지우기와 같은 batch** 에 싣는다(쓰기 상한에
 *     함께 센다) — 따로 쓰면 그 사이 시간 초과 · 실패로 요청만 영영 빠진다. 게스트 기록뿐이면 센 적이
 *     없으니 요청하지 않는다.
 *
 * 시각 표지는 batch 마다 하나를 만들어 그 batch 의 기록 · 요청에 같이 쓴다. `opts.serverTime` 은
 * 시험이 루트 firebase-admin 의 값을 넘기려고 연다(functions 쪽 FieldValue 는 그 db 가 못 쓴다).
 * `opts.docs` 는 PASS 1 이 이미 읽은 기록(없으면 여기서 읽는다) · `opts.writeLimit` · `opts.afterCommit`
 * 은 시험이 batch 경계를 작게 만들고 batch 사이에 발표를 끼우려고 연다.
 */
export async function relinkGuestVotes(
  db: Firestore,
  anonUid: string,
  googleUid: string,
  conflictTids: Set<string>,
  opts: {
    docs?: QueryDocumentSnapshot[];
    writeLimit?: number;
    serverTime?: ServerTime;
    afterCommit?: (info: { index: number; voteIds: string[]; writes: number }) => Promise<void> | void;
  } = {},
): Promise<{ linked: number; legacyDeletedTids: string[] }> {
  const serverTime = opts.serverTime ?? (() => FieldValue.serverTimestamp());
  const docs = opts.docs ?? (await readAnonVotes(db, anonUid));
  // 계획을 다 세운 뒤에 쓴다 — 상한을 넘는 판이 있으면 아무것도 쓰기 전에 멈춘다.
  const plan = packRuns(groupByRun(docs, conflictTids), opts.writeLimit ?? RELINK_WRITE_LIMIT);
  let linked = 0;
  const legacyDeleted = new Set<string>();
  for (let index = 0; index < plan.length; index++) {
    const { groups, requestTids } = plan[index];
    const batch = db.batch();
    const stamp = serverTime();
    const voteIds: string[] = [];
    let reparented = 0;
    for (const g of groups) {
      for (const d of g.docs) {
        voteIds.push(d.id);
        const data = d.data() as VoteFields;
        const tid = data.tournamentId;
        if (tid && conflictTids.has(tid)) {
          batch.delete(d.ref); // conflict → discard the guest vote
        } else {
          // 회차 도입 전의 게스트 표에는 runIndex 필드가 없다. 필드가 없으면 회차
          // 필터(`where runIndex == 1`)에 안 걸려 로그인 직후 그 판의 진행이
          // 통째로 사라진다. 이미 이 문서를 쓰고 있으므로 여기서 채운다 —
          // 일괄 변환 스크립트가 아니라(§5 DON'T 3) 이관 중의 한 필드다.
          const hasRunIndex = typeof data.runIndex === "number";
          batch.update(d.ref, {
            userId: googleUid,
            // v2.1 (§16 5): 로그인 계정으로 옮겨온 선택은 더 이상 게스트의 것이 아니다.
            // "로그인하면 내 선택이 랭킹에 반영된다"가 실제로 성립하려면 필수다 — 이 줄이
            // 없으면 이관된 선택이 PR 3의 필터에 계속 걸려 랭킹에서 빠진다.
            isGuest: false,
            // 회차 필드가 없는 문서는 회차 도입 전의 1회차다(§3.0 B안). "게스트는 1판"이
            // 아니라 "옛 문서가 곧 1회차 문서"라는 사실이다.
            ...(hasRunIndex ? {} : { runIndex: 1 }),
            // T5: 게스트였던 기록만 — 이 시각에 처음 셀 수 있게 된다(위 주석).
            ...(data.isGuest === true ? { relinkedAt: stamp } : {}),
          });
          reparented += 1;
        }
      }
    }
    // 지우기와 같은 batch — 둘 다 되거나 둘 다 안 된다. 같은 대회가 다음 batch 에도 나오면 그 batch 가
    // 요청을 다시 쓴다(merge · 더 늦은 시각) — 그 사이 시작한 다시 세기가 요청을 지우지 않게.
    for (const tid of requestTids) {
      addRecountRequestToBatch(db, batch, tid, "relink-conflict", () => stamp);
      legacyDeleted.add(tid);
    }
    await batch.commit();
    linked += reparented;
    if (opts.afterCommit) {
      await opts.afterCommit({ index, voteIds, writes: voteIds.length + requestTids.length });
    }
  }
  return { linked, legacyDeletedTids: Array.from(legacyDeleted) };
}

export const linkSessionVote = onCall<LinkSessionVoteRequest>(
  {
    timeoutSeconds: TIMEOUT_SECONDS,
    cors: ALLOWED_ORIGINS,
  },
  async (req): Promise<LinkSessionVoteResponse> => {
    const googleUid = req.auth?.uid;
    if (!googleUid) {
      throw new HttpsError("unauthenticated", "Sign-in required.");
    }

    const anonUid = req.data?.anonUid;
    if (!anonUid || typeof anonUid !== "string") {
      throw new HttpsError("invalid-argument", "anonUid is required.");
    }
    if (anonUid === googleUid) {
      throw new HttpsError(
        "failed-precondition",
        "anonUid must differ from the caller's uid.",
      );
    }

    // Defensive: only let through accounts that ARE anonymous. Otherwise
    // a caller could pass a real Google uid and trick us into deleting it.
    let anonRecord;
    try {
      anonRecord = await adminAuth.getUser(anonUid);
    } catch {
      throw new HttpsError("not-found", "anonUid does not exist.");
    }
    if (anonRecord.providerData.length !== 0) {
      throw new HttpsError(
        "failed-precondition",
        "anonUid is not an anonymous account.",
      );
    }

    // HF-3.1 — PASS 1 (read-only): collect the tournamentIds the guest voted in
    // WITHOUT moving anything yet. The conflict judgement (which tournaments the
    // Google uid already finished) must be settled BEFORE we touch a single vote,
    // otherwise a re-parented vote on a conflicting Tournament would let one
    // account vote twice and skew that Match's Vote Rate (§8 Edge #1 flaw).
    // T5: 읽은 문서를 PASS 2 가 그대로 판 단위 batch 로 옮긴다(두 번 읽지 않는다).
    const anonDocs = await readAnonVotes(adminDb, anonUid);
    const tournamentIds = new Set<string>();
    for (const d of anonDocs) {
      const tid = (d.data() as { tournamentId?: string }).tournamentId;
      if (tid) tournamentIds.add(tid);
    }

    const tids = distinctTournamentIds(
      [...tournamentIds].map((tournamentId) => ({ tournamentId })),
    );

    // Read the roundProgress facts ONCE and settle the conflict set. A tid is a
    // CONFLICT (case 2) when the Google uid already owns a roundProgress for it;
    // the guest's votes there are DELETED, everything else is re-parented (case 1
    // — the whole run migrates, per the acceptance table; NEVER discard case 1).
    const facts = await fetchRoundProgressFacts(anonUid, googleUid, tids);
    const conflictTids = new Set(conflictTournamentIds(facts));

    // PASS 2 (writes): re-parent non-conflict votes, DELETE conflict votes.
    // `linked` counts only re-parented rows — deleted conflict votes are excluded.
    const { linked } = await relinkGuestVotes(adminDb, anonUid, googleUid, conflictTids, { docs: anonDocs });

    // §8 Edge #1 — carry the per-Voter bracket seed (ADR-0007) from the anon
    // uid to the new uid. The bracket depends only on the seed VALUE, so copying
    // it verbatim keeps the SAME bracket; skipping this lets the new uid mint a
    // fresh seed → the bracket reshuffles → an already-won Contestant reappears
    // downstream → duplicate winners → the round transition breaks. create-once
    // makes conflict tids a no-op (the Google uid already owns its seed).
    // v2.1: 씨앗은 판마다 다르다(AC 3). 회차별로 옮기지 않으면 2판째가 로그인 후 새 씨앗을
    // 뽑아 대진표가 다시 섞이고, 이미 이긴 Contestant가 되살아난다.
    const anonSeeds: AnonSeed[] = (
      await Promise.all(
        tids.map(async (tid) => {
          const runs = await guestRunCount(anonUid, tid);
          return Promise.all(
            Array.from({ length: runs }, (_, i) => i + 1).map(async (runIndex) => {
              const s = await adminDb
                .doc(`bracket_seeds/${runDocId(anonUid, tid, runIndex)}`)
                .get();
              return s.exists
                ? { tournamentId: tid, runIndex, seed: (s.data() as { seed: number }).seed }
                : null;
            }),
          );
        }),
      )
    ).flat();
    for (const w of planSeedTransfer(googleUid, anonSeeds)) {
      try {
        // create-once: preserves the seed's immutability. An already-present
        // target (idempotent re-link) means the seed is already carried.
        await adminDb.doc(`bracket_seeds/${w.docId}`).create({
          seed: w.seed,
          createdAt: FieldValue.serverTimestamp(),
        });
      } catch {
        console.warn("[linkSessionVote] bracket seed already present:", w.docId);
      }
    }

    // Transfer roundProgress (+ re-fire the Crown Card for a completed run) and
    // merge the daily participation quota. `tournaments` tells the client where
    // to land: a `complete` entry with source `guest` (the run just completed) is
    // preferred over a `complete` `existing` entry (the conflict card + banner).
    // Reuses the facts read in PASS 1 — no second roundProgress read.
    const tournaments = await executeRoundProgressPlan(anonUid, googleUid, facts);
    // 충돌로 버려진 Tournament는 빠진다 — 옮겨온 판이 없으면 한도도 안 쓴다.
    await mergeTournamentRuns(
      googleUid,
      anonUid,
      tids.filter((tid) => !conflictTids.has(tid)),
    );

    // Tidy up the orphaned anon account. Failing here is non-fatal — the
    // votes are already linked; the leftover anon record is harmless. We delete
    // even if some tournaments were SKIPped (Google data won) — the guest data
    // is intentionally discarded (§8 Edge #1, Phase 3.5).
    try {
      await adminAuth.deleteUser(anonUid);
    } catch (err) {
      console.warn("[linkSessionVote] failed to delete anon uid:", err);
    }

    return { ok: true, linked, tournaments };
  },
);
