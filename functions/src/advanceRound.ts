/**
 * advanceRound — Firestore trigger on vote creation (Domain 3 · The Arena).
 *
 * Per-Voter (ADR-0001): when this Voter completes the current round's matchCount,
 * write a per-Voter `roundProgress/{uid}_{tournamentId}` doc that the client
 * subscribes to via onSnapshot (Firestore-only — no RTDB). THE FINAL writes the
 * Champion onto the same doc. NEVER updates a global tournament round.
 *
 * Idempotent: re-runs (duplicate trigger) `set(..., {merge:true})` the same
 * values, so a redelivered event can't double-advance.
 */
import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "./admin";
import { advanceRoundDecision, nextRound } from "./core/advanceRoundCore";

export const advanceRound = onDocumentCreated(
  "votes/{voteId}",
  async (event) => {
    const data = event.data?.data() as
      | {
          userId?: string;
          tournamentId?: string;
          round?: number;
          contestantId?: string;
        }
      | undefined;
    if (!data?.userId || !data.tournamentId || !data.round) return;

    const { userId, tournamentId, round, contestantId } = data;

    const snap = await adminDb
      .collection("votes")
      .where("userId", "==", userId)
      .where("tournamentId", "==", tournamentId)
      .where("round", "==", round)
      .get();

    const decision = advanceRoundDecision(round, snap.size);
    if (decision === "noop") return;

    const ref = adminDb
      .collection("roundProgress")
      .doc(`${userId}_${tournamentId}`);

    if (decision === "champion") {
      await ref.set(
        {
          userId,
          tournamentId,
          complete: true,
          championId: contestantId ?? null,
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
    } else {
      await ref.set(
        {
          userId,
          tournamentId,
          fromRound: round,
          toRound: nextRound(round),
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
    }
  },
);
