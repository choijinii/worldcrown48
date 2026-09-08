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
import { FieldValue } from "firebase-admin/firestore";
import { adminAuth, adminDb } from "./admin";
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

const BATCH_LIMIT = 500;
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
    const tournamentIds = new Set<string>();
    {
      let cursor: FirebaseFirestore.QueryDocumentSnapshot | undefined;
      for (;;) {
        let q = adminDb
          .collection("votes")
          .where("userId", "==", anonUid)
          .orderBy("__name__")
          .limit(BATCH_LIMIT);
        if (cursor) q = q.startAfter(cursor);
        const snap = await q.get();
        if (snap.empty) break;
        snap.docs.forEach((d) => {
          const tid = (d.data() as { tournamentId?: string }).tournamentId;
          if (tid) tournamentIds.add(tid);
        });
        cursor = snap.docs[snap.docs.length - 1];
        if (snap.size < BATCH_LIMIT) break;
      }
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
    let linked = 0;
    {
      let cursor: FirebaseFirestore.QueryDocumentSnapshot | undefined;
      for (;;) {
        let q = adminDb
          .collection("votes")
          .where("userId", "==", anonUid)
          .orderBy("__name__")
          .limit(BATCH_LIMIT);
        if (cursor) q = q.startAfter(cursor);
        const snap = await q.get();
        if (snap.empty) break;
        const batch = adminDb.batch();
        let reparentedInPage = 0;
        snap.docs.forEach((d) => {
          const tid = (d.data() as { tournamentId?: string }).tournamentId;
          if (tid && conflictTids.has(tid)) {
            batch.delete(d.ref); // conflict → discard the guest vote
          } else {
            // 회차 도입 전의 게스트 표에는 runIndex 필드가 없다. 필드가 없으면 회차
            // 필터(`where runIndex == 1`)에 안 걸려 로그인 직후 그 판의 진행이
            // 통째로 사라진다. 이미 이 문서를 쓰고 있으므로 여기서 채운다 —
            // 일괄 변환 스크립트가 아니라(§5 DON'T 3) 이관 중의 한 필드다.
            const hasRunIndex =
              typeof (d.data() as { runIndex?: unknown }).runIndex === "number";
            batch.update(d.ref, {
              userId: googleUid,
              // v2.1 (§16 5): 로그인 계정으로 옮겨온 선택은 더 이상 게스트의 것이 아니다.
              // "로그인하면 내 선택이 랭킹에 반영된다"가 실제로 성립하려면 필수다 — 이 줄이
              // 없으면 이관된 선택이 PR 3의 필터에 계속 걸려 랭킹에서 빠진다.
              isGuest: false,
              // 회차 필드가 없는 문서는 회차 도입 전의 1회차다(§3.0 B안). "게스트는 1판"이
              // 아니라 "옛 문서가 곧 1회차 문서"라는 사실이다.
              ...(hasRunIndex ? {} : { runIndex: 1 }),
            });
            reparentedInPage += 1;
          }
        });
        await batch.commit();
        linked += reparentedInPage;
        cursor = snap.docs[snap.docs.length - 1];
        if (snap.size < BATCH_LIMIT) break;
      }
    }

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
