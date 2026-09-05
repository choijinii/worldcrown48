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
 *
 * RUN-1 (§9 함정 9): 라운드 완료 판정이 `(userId, tournamentId, round)` 로만 세고 있었다.
 * 하루 5판이 되면 2판째의 첫 선택이 1판째의 24건과 합산돼 **즉시 라운드가 넘어간다.**
 * 회차 필터가 반드시 있어야 한다. 회차는 vote 문서의 **필드**에서 읽는다 — 문서 id를
 * 잘라 쓰지 않는다(§9 함정 2: 실제 슬러그가 `gen4_idol_48` 처럼 '_'를 포함한다).
 */
import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "./admin";
import { advanceRoundDecision, nextRound } from "./core/advanceRoundCore";
import { runDocId } from "./_run/runDocId";

export const advanceRound = onDocumentCreated(
  "votes/{voteId}",
  async (event) => {
    const data = event.data?.data() as
      | {
          userId?: string;
          tournamentId?: string;
          round?: number;
          contestantId?: string;
          runIndex?: number;
        }
      | undefined;
    if (!data?.userId || !data.tournamentId || !data.round) return;

    const { userId, tournamentId, round, contestantId } = data;
    // 회차 도입 전의 옛 vote 문서에는 필드가 없다 → 1회차로 읽는다 (AC 11).
    const runIndex = Number(data.runIndex ?? 1);

    const snap = await adminDb
      .collection("votes")
      .where("userId", "==", userId)
      .where("tournamentId", "==", tournamentId)
      .where("round", "==", round)
      .where("runIndex", "==", runIndex)
      .get();

    const decision = advanceRoundDecision(round, snap.size);
    if (decision === "noop") return;

    // 1회차는 접미사가 없어 옛 화면이 구독하던 문서 이름 그대로다 (§3.0 B안).
    const ref = adminDb
      .collection("roundProgress")
      .doc(runDocId(userId, tournamentId, runIndex));

    if (decision === "champion") {
      await ref.set(
        {
          userId,
          tournamentId,
          runIndex,
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
          runIndex,
          fromRound: round,
          toRound: nextRound(round),
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
    }
  },
);
