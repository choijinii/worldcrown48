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
  type RoundProgressFacts,
} from "./core/linkRoundProgress";
import { kstDate } from "./core/voteRecord";

const BATCH_LIMIT = 500;
const TIMEOUT_SECONDS = 30;

interface LinkSessionVoteRequest {
  anonUid: string;
}

interface LinkSessionVoteResponse {
  ok: true;
  linked: number;
  /** One entry per tournament the guest run touched; `complete` drives the
   * client landing (W6 → /arena/{tid}/champion for a completed run). */
  tournaments: Array<{ tournamentId: string; complete: boolean }>;
}

/**
 * Transfer the guest's per-Voter roundProgress to the Google uid (HF-3 W4,
 * Phase 3.3). Returns the response payload (one entry per tournament). See
 * linkRoundProgress.ts for the decision table; the completed-run REFIRE path
 * writes in TWO separate commits so onChampionConfirmed (onDocumentUpdated) sees
 * the false→true edge and regenerates the Crown Card under the new uid.
 */
async function transferRoundProgress(
  anonUid: string,
  googleUid: string,
  tids: string[],
): Promise<Array<{ tournamentId: string; complete: boolean }>> {
  const facts: RoundProgressFacts[] = await Promise.all(
    tids.map(async (tid) => {
      const [guestSnap, googleSnap] = await Promise.all([
        adminDb.doc(`roundProgress/${anonUid}_${tid}`).get(),
        adminDb.doc(`roundProgress/${googleUid}_${tid}`).get(),
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

  const plan = planRoundProgressTransfer(facts);

  for (const decision of plan) {
    if (decision.action === "skip") continue;
    const tid = decision.tournamentId;
    const guestSnap = await adminDb.doc(`roundProgress/${anonUid}_${tid}`).get();
    const guestData = guestSnap.data() ?? {};
    const targetRef = adminDb.doc(`roundProgress/${googleUid}_${tid}`);

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
 * Merge the guest's TODAY (KST) Daily Participation into the Google uid's
 * (대표 확정, §8 Edge #5): prevents "guest-run then sign in" from laundering the
 * HF-1 daily new-Tournament quota. Already-joined Tournaments stay unlimited, so
 * arrayUnion never blocks continued voting. Non-fatal on failure.
 */
async function mergeDailyParticipation(
  anonUid: string,
  googleUid: string,
): Promise<void> {
  try {
    const date = kstDate();
    const guestSnap = await adminDb.doc(`daily_participation/${anonUid}_${date}`).get();
    const guestTids: string[] = guestSnap.exists
      ? (guestSnap.data()?.tournamentIds ?? [])
      : [];
    if (guestTids.length === 0) return;
    await adminDb.doc(`daily_participation/${googleUid}_${date}`).set(
      {
        tournamentIds: FieldValue.arrayUnion(...guestTids),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
  } catch (err) {
    console.warn("[linkSessionVote] daily_participation merge failed:", err);
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

    // Re-parent vote rows. Chunked to stay under the 500-write batch cap;
    // the loop terminates the moment a partial page returns. We also collect
    // the tournamentIds the guest voted in so we can carry their bracket seeds.
    let linked = 0;
    const tournamentIds = new Set<string>();
    for (;;) {
      const snap = await adminDb
        .collection("votes")
        .where("userId", "==", anonUid)
        .limit(BATCH_LIMIT)
        .get();
      if (snap.empty) break;
      const batch = adminDb.batch();
      snap.docs.forEach((d) => {
        batch.update(d.ref, { userId: googleUid });
        const tid = (d.data() as { tournamentId?: string }).tournamentId;
        if (tid) tournamentIds.add(tid);
      });
      await batch.commit();
      linked += snap.size;
      if (snap.size < BATCH_LIMIT) break;
    }

    // §8 Edge #1 — carry the per-Voter bracket seed (ADR-0007) from the anon
    // uid to the new uid. The bracket depends only on the seed VALUE, so copying
    // it verbatim keeps the SAME bracket; skipping this lets the new uid mint a
    // fresh seed → the bracket reshuffles → an already-won Contestant reappears
    // downstream → duplicate winners → the round transition breaks.
    const tids = distinctTournamentIds(
      [...tournamentIds].map((tournamentId) => ({ tournamentId })),
    );
    const anonSeeds: AnonSeed[] = await Promise.all(
      tids.map(async (tid) => {
        const s = await adminDb.doc(`bracket_seeds/${anonUid}_${tid}`).get();
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
    // to land (a `complete: true` entry → the Champion page, W6).
    const tournaments = await transferRoundProgress(anonUid, googleUid, tids);
    await mergeDailyParticipation(anonUid, googleUid);

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
