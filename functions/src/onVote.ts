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
 * re-parents it after sign-in). Per-uid in-memory rate limit (5/min) defuses
 * floods before any Firestore read (trap-style cost guard). `date` is the KST
 * day computed server-side — never trusted from the client.
 */
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "./admin";
import { ALLOWED_ORIGINS } from "./cors";
import { buildVoteDoc, kstDate, VoteValidationError } from "./core/voteRecord";
import { decideParticipation, participationDocId } from "./core/participation";

// Per-uid token bucket — 5 calls / uid / minute / instance (C-3 anti-abuse 강화).
// 12초당 1회 — 정상 voter의 Match 풀이 흐름(선택→Round 전환 애니→다음 Match)과 일치.
// Same algorithm as before (handoff §8.1: token bucket 패턴 유지) — only the
// limit moved 10 → 5. Exported below for unit testing (handoff §8.3) without
// invoking the onCall wrapper / Firestore.
export const RATE_LIMIT = 5;
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
