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

const BATCH_LIMIT = 500;
const TIMEOUT_SECONDS = 30;

interface LinkSessionVoteRequest {
  anonUid: string;
}

interface LinkSessionVoteResponse {
  ok: true;
  linked: number;
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

    // Tidy up the orphaned anon account. Failing here is non-fatal — the
    // votes are already linked; the leftover anon record is harmless.
    try {
      await adminAuth.deleteUser(anonUid);
    } catch (err) {
      console.warn("[linkSessionVote] failed to delete anon uid:", err);
    }

    return { ok: true, linked };
  },
);
