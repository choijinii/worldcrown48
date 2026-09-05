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

/**
 * 게스트 판의 회차. 게스트는 하루 통틀어 1판이므로(§5 DO 3) 이관 대상은 정의상 1회차다.
 * 1회차는 접미사가 없어(§3.0 B안) 이관되는 문서 이름이 현행과 같다.
 */
const GUEST_RUN_INDEX = 1;

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
  return Promise.all(
    tids.map(async (tid) => {
      const [guestSnap, googleSnap] = await Promise.all([
        adminDb.doc(`roundProgress/${runDocId(anonUid, tid, GUEST_RUN_INDEX)}`).get(),
        adminDb.doc(`roundProgress/${runDocId(googleUid, tid, GUEST_RUN_INDEX)}`).get(),
      ]);
      return {
        tournamentId: tid,
        guestExists: guestSnap.exists,
        guestComplete: guestSnap.get("complete") === true,
        googleExists: googleSnap.exists,
        googleComplete: googleSnap.get("complete") === true,
      };
    }),
  );
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
    const guestSnap = await adminDb
      .doc(`roundProgress/${runDocId(anonUid, tid, GUEST_RUN_INDEX)}`)
      .get();
    const guestData = guestSnap.data() ?? {};
    const targetRef = adminDb.doc(
      `roundProgress/${runDocId(googleUid, tid, GUEST_RUN_INDEX)}`,
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
 * 곧 그 검사다) 회차는 1이 된다. 그래도 기존 값을 읽어 확인한다 — 예상은 확인이 아니다.
 * 실패는 비치명적이다: 표는 이미 옮겨졌고, 한도 한 판이 덜 세어지는 것이 로그인 직후
 * 전체 실패보다 낫다.
 */
async function mergeTournamentRuns(
  googleUid: string,
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
      const runsToday = effectiveRunsToday({
        lastRunDate: (stored.lastRunDate as string | undefined) ?? null,
        runsToday: Number(stored.runsToday ?? 0),
        todayKST: date,
      });
      await ref.set(
        {
          runIndex: GUEST_RUN_INDEX,
          runsToday: runsToday + 1,
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
              ...(hasRunIndex ? {} : { runIndex: GUEST_RUN_INDEX }),
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
    const anonSeeds: AnonSeed[] = await Promise.all(
      tids.map(async (tid) => {
        const s = await adminDb
          .doc(`bracket_seeds/${runDocId(anonUid, tid, GUEST_RUN_INDEX)}`)
          .get();
        return s.exists
          ? { tournamentId: tid, seed: (s.data() as { seed: number }).seed }
          : null;
      }),
    );
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
