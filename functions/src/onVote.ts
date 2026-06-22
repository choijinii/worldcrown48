/**
 * onVote — callable Cloud Function (Domain 3 · The Arena, castVote).
 *
 * Thin adapter around the tested voteRecord core. Writes the vote inside a
 * Firestore TRANSACTION (B-1 transaction-safe pattern) so the dedupe (one vote
 * per match) and the daily-5 check are atomic against concurrent calls — no
 * double-vote race.
 *
 *   request.data: { tournamentId, round, matchId, contestantId }
 *   returns:      { ok: true }
 *
 * Anonymous uids are allowed (the guest's one free vote — D-1 linkSessionVote
 * re-parents it after sign-in). Per-uid in-memory rate limit (10/min) defuses
 * floods before any Firestore read (trap-style cost guard). `date` is the KST
 * day computed server-side — never trusted from the client.
 */
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "./admin";
import { ALLOWED_ORIGINS } from "./cors";
import { buildVoteDoc, kstDate, VoteValidationError } from "./core/voteRecord";

const DAILY_LIMIT = 5;

// Per-uid token bucket — 10 calls / uid / minute / instance (B-1 pattern).
const RATE_LIMIT = 10;
const RATE_WINDOW_MS = 60_000;
const uidBuckets = new Map<string, { count: number; windowStart: number }>();

function checkRateLimit(uid: string, now: number): boolean {
  const bucket = uidBuckets.get(uid);
  if (!bucket || now - bucket.windowStart >= RATE_WINDOW_MS) {
    uidBuckets.set(uid, { count: 1, windowStart: now });
    return true;
  }
  bucket.count += 1;
  return bucket.count <= RATE_LIMIT;
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
    await adminDb.runTransaction(async (tx) => {
      // Dedupe: one vote per (uid, matchId) — atomic against a double-click.
      const dupe = await tx.get(
        votes.where("userId", "==", uid).where("matchId", "==", doc.matchId).limit(1),
      );
      if (!dupe.empty) {
        throw new HttpsError("already-exists", "이미 투표한 매치입니다.");
      }
      // Daily limit: 5 votes / Tournament / KST day.
      const daily = await tx.get(
        votes
          .where("userId", "==", uid)
          .where("tournamentId", "==", doc.tournamentId)
          .where("date", "==", date),
      );
      if (daily.size >= DAILY_LIMIT) {
        throw new HttpsError(
          "resource-exhausted",
          "오늘의 투표를 모두 사용했어요 (5/5).",
        );
      }
      tx.set(votes.doc(), { ...doc, createdAt: FieldValue.serverTimestamp() });
    });

    return { ok: true };
  },
);
