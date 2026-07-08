/**
 * onVote — callable Cloud Function (Domain 3 · The Arena, castVote).
 *
 * Thin adapter around the tested voteRecord + participation cores. Writes the
 * vote inside a Firestore TRANSACTION (B-1 transaction-safe pattern) so the
 * dedupe (one vote per match) and the Daily Participation Limit check are atomic
 * against concurrent calls — no double-vote race, no 5-tournament overshoot.
 *
 *   request.data: { tournamentId, round, matchId, contestantId }
 *   returns:      { ok: true }
 *
 * Anonymous uids are allowed (the guest's one free vote — D-1 linkSessionVote
 * re-parents it after sign-in). Per-uid in-memory rate limit (20/min) defuses
 * floods before any Firestore read (trap-style cost guard). `date` is the KST
 * day computed server-side — never trusted from the client.
 */
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { FieldValue, FieldPath } from "firebase-admin/firestore";
import { adminDb } from "./admin";
import { ALLOWED_ORIGINS } from "./cors";
import { buildVoteDoc, kstDate, VoteValidationError } from "./core/voteRecord";
import { decideParticipation, participationDocId } from "./core/participation";
import { decideGuestVoteGuard, type GuestVoteFacts } from "./core/guestVoteGuard";

/**
 * Guest Run server guard (HF-3 W3, AC7). For an anonymous caller, gather the two
 * facts the pure guard needs — with the admin SDK, which bypasses the
 * doc-id-prefix `list` denial that blocked the client (§확인 필요 1). Fail-open on
 * a transient read error (never break a legit 46-vote run on a dropped read; the
 * client gate + rules remain) — the deny path only fires on a confirmed fact.
 */
async function fetchGuestVoteFacts(
  uid: string,
  tournamentId: string,
): Promise<GuestVoteFacts> {
  try {
    const progressRef = adminDb.doc(`roundProgress/${uid}_${tournamentId}`);
    const lo = `${uid}_`;
    const hi = `${uid}_`;
    const [progressSnap, seedsSnap] = await Promise.all([
      progressRef.get(),
      adminDb
        .collection("bracket_seeds")
        .where(FieldPath.documentId(), ">=", lo)
        .where(FieldPath.documentId(), "<", hi)
        .get(),
    ]);
    const completedCurrentTournament = progressSnap.get("complete") === true;
    const enteredOtherTournament = seedsSnap.docs.some(
      (d) => d.id !== `${uid}_${tournamentId}`,
    );
    return { isAnonymous: true, completedCurrentTournament, enteredOtherTournament };
  } catch (err) {
    console.warn("[onVote] guest guard fact fetch failed (fail-open):", err);
    return {
      isAnonymous: true,
      completedCurrentTournament: false,
      enteredOtherTournament: false,
    };
  }
}

// Per-uid token bucket — 20 calls / uid / minute / instance (HF-1.5 완화).
// 3초당 1회 — 46표 완주하는 정상 voter가 12초/표 제한에 반복 차단되던 UX 결함 해소.
// Same algorithm as before (handoff §8.1: token bucket 패턴 유지) — only the
// limit moved 5 → 20. Exported below for unit testing (handoff §8.3) without
// invoking the onCall wrapper / Firestore.
export const RATE_LIMIT = 20;
export const RATE_WINDOW_MS = 60_000;
const uidBuckets = new Map<string, { count: number; windowStart: number }>();

export function checkRateLimit(uid: string, now: number): boolean {
  const bucket = uidBuckets.get(uid);
  if (!bucket || now - bucket.windowStart >= RATE_WINDOW_MS) {
    uidBuckets.set(uid, { count: 1, windowStart: now });
    return true;
  }
  bucket.count += 1;
  return bucket.count <= RATE_LIMIT;
}

/** Test-only — clears the per-instance buckets between cases. */
export function __resetRateBucketsForTest(): void {
  uidBuckets.clear();
}

export const onVote = onCall(
  { cors: ALLOWED_ORIGINS },
  async (req): Promise<{ ok: true }> => {
    const uid = req.auth?.uid;
    if (!uid) {
      throw new HttpsError("unauthenticated", "로그인이 필요합니다.");
    }
    if (!checkRateLimit(uid, Date.now())) {
      throw new HttpsError(
        "resource-exhausted",
        "요청이 너무 많습니다. 잠시 후 다시 시도해주세요.",
      );
    }

    const data = (req.data ?? {}) as {
      tournamentId?: string;
      round?: number;
      matchId?: string;
      contestantId?: string;
    };
    const date = kstDate();

    let doc;
    try {
      doc = buildVoteDoc({
        userId: uid,
        tournamentId: data.tournamentId ?? "",
        round: data.round ?? 0,
        matchId: data.matchId ?? "",
        contestantId: data.contestantId ?? "",
        date,
      });
    } catch (e) {
      if (e instanceof VoteValidationError) {
        throw new HttpsError("invalid-argument", e.message);
      }
      throw e;
    }

    // Guest Run server guard (HF-3 W3, AC7). Only anonymous callers are guarded
    // — detected off the Firebase sign-in provider, not a client-supplied flag.
    const isAnonymous =
      req.auth?.token?.firebase?.sign_in_provider === "anonymous";
    if (isAnonymous) {
      const decision = decideGuestVoteGuard(
        await fetchGuestVoteFacts(uid, doc.tournamentId),
      );
      if (decision.status === "deny") {
        throw new HttpsError("permission-denied", decision.reason);
      }
    }

    const votes = adminDb.collection("votes");
    const partRef = adminDb
      .collection("daily_participation")
      .doc(participationDocId(uid, date));
    await adminDb.runTransaction(async (tx) => {
      // Reads first (Firestore requires all reads before any write in a tx).
      // Dedupe: one vote per (uid, matchId) — atomic against a double-click.
      const dupe = await tx.get(
        votes.where("userId", "==", uid).where("matchId", "==", doc.matchId).limit(1),
      );
      if (!dupe.empty) {
        throw new HttpsError("already-exists", "이미 투표한 매치입니다.");
      }
      // Daily Participation Limit: at most 5 NEW Tournaments joined / KST day.
      // Voting inside an already-joined Tournament costs no quota (46-vote path).
      const partSnap = await tx.get(partRef);
      const participatedTournamentIds: string[] = partSnap.exists
        ? (partSnap.data()?.tournamentIds ?? [])
        : [];
      const decision = decideParticipation({
        participatedTournamentIds,
        tournamentId: doc.tournamentId,
      });
      if (decision.status === "limit_reached") {
        throw new HttpsError(
          "resource-exhausted",
          "오늘 참가할 수 있는 Tournament를 모두 사용했어요 (5/5)",
        );
      }
      // Writes: record the participation slot only when joining a NEW Tournament.
      if (decision.consumesQuota) {
        tx.set(
          partRef,
          {
            tournamentIds: FieldValue.arrayUnion(doc.tournamentId),
            updatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true },
        );
      }
      tx.set(votes.doc(), { ...doc, createdAt: FieldValue.serverTimestamp() });
    });

    return { ok: true };
  },
);
