/**
 * onVote — callable Cloud Function (Domain 3 · The Arena, castVote).
 *
 * Thin adapter around the tested `_run` decision cores. The vote is written in a
 * Firestore TRANSACTION (B-1 transaction-safe pattern) so the dedupe and the
 * Daily Run Limit check are atomic against concurrent calls.
 *
 *   request.data: { tournamentId, round, matchId, contestantId }
 *   returns:      { ok: true }
 *
 * RUN-1 (참가 규칙 v2.0): 한 Voter가 하나의 Tournament를 하루(KST) 최대 5판까지 완주할 수
 * 있다. **회차(runIndex)는 클라이언트가 보내지 않는다** — 서버가 `tournament_runs` 와
 * `roundProgress` 를 읽어 스스로 정한다. 클라이언트 게이트(`lib/voteGate`)는 UX용이고,
 * 같은 순수 함수(`_run/decideRun`)를 돌려 같은 답에 도달한다(§9 함정 5: 두 게이트가
 * 어긋나면 P0다).
 *
 * ✅ 2026-09-09: Tournament Deadline 강제를 **되살렸다**(PR 2). 09-06에 끈 이유는 강제만
 * 있고 그것을 설명하는 화면·문구가 없어 팬에게 고장으로 보였기 때문이다 — 이제 §8
 * `arena.run.deadlinePassed` 문구와 첫 진입 안내(AC 16)가 같은 PR에 있고, 배포 전 0단계에서
 * 노출 중인 Tournament 4개가 전부 마감이 남도록 정리했다.
 *
 * 익명 uid는 허용된다(게스트는 하루 **통틀어 3판** — v2.1 · D-1 linkSessionVote가 로그인 후
 * 재부모화한다). 게스트 한도는 Tournament를 가로지르므로 `guest_runs/{uid}` 로 따로 센다
 * (§5 DO 3). vote 문서에는 `isGuest` 를 서버가 판정해 적는다 — PR 3의 랭킹 제외가 읽는다.
 * uid별 인메모리 속도 제한은 Firestore를 읽기 전에 홍수를 막는다. `date` 는 서버가 KST로
 * 계산한다 — 클라이언트를 믿지 않는다.
 */
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "./admin";
import { ALLOWED_ORIGINS } from "./cors";
import { buildVoteDoc, kstDate, VoteValidationError } from "./core/voteRecord";
import { decideRun, effectiveRunsToday, normalizeRunIndex } from "./_run/decideRun";
import { decideGuestRun } from "./_run/guestRun";
import { runDocId, tournamentRunsDocId } from "./_run/runDocId";
import { isDeadlinePassed, toDeadlineMs } from "./_run/deadline";
import { planRunWrite } from "./core/planRunWrite";
import { VOTE_ERROR_CODES } from "./core/voteErrorCodes";

// Per-uid token bucket — 40 calls / uid / minute / instance.
// RUN-1 (2026-09-03 대표 확정): HF-1.5의 20 → 40. 5판 = 선택 230번인데 분당 20이면 규칙이
// 최소 11.5분을 강제해 "판을 늘려 결과물을 늘린다"는 v2.0 설계와 정면으로 충돌했다. 40이면
// 1.5초에 한 번까지 허용된다 — 사람이 고르는 속도는 넘지 않으면서 홍수는 막는다.
// Same algorithm as before (handoff §8.1: token bucket 패턴 유지). Exported below
// for unit testing (handoff §8.3) without invoking the onCall wrapper / Firestore.
export const RATE_LIMIT = 40;
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
      // #12: the message is a dev/log fallback — the client localizes off
      // details.code (rate_limited), never off this string.
      throw new HttpsError(
        "resource-exhausted",
        "요청이 너무 많습니다. 잠시 후 다시 시도해주세요.",
        { code: VOTE_ERROR_CODES.RATE_LIMITED },
      );
    }

    const data = (req.data ?? {}) as {
      tournamentId?: string;
      round?: number;
      matchId?: string;
      contestantId?: string;
    };
    const date = kstDate();

    // 회차를 정하려면 문서를 읽어야 하고, 문서를 읽으려면 tournamentId가 있어야 한다.
    // 전체 검증은 아래 buildVoteDoc이 하지만, 빈 id로 Firestore를 읽지 않기 위해 여기서 먼저 막는다.
    const tid = data.tournamentId ?? "";
    if (!tid) {
      throw new HttpsError("invalid-argument", "tournamentId가 필요합니다.");
    }

    // 익명 여부는 Firebase 로그인 제공자로 판정한다 — 클라이언트가 보낸 플래그가 아니다.
    const isAnonymous =
      req.auth?.token?.firebase?.sign_in_provider === "anonymous";

    const votes = adminDb.collection("votes");
    const runsRef = adminDb
      .collection("tournament_runs")
      .doc(tournamentRunsDocId(uid, tid));
    const guestRef = adminDb.collection("guest_runs").doc(uid);
    // 접미사 없는 옛 진행 문서 = 회차 도입 전의 1회차 판 (§3.0 B안 · AC 11).
    const legacyProgressRef = adminDb.doc(`roundProgress/${runDocId(uid, tid, 1)}`);
    // 마감은 트랜잭션 안에서 확인한다 — 판정과 쓰기 사이에 마감이 지나면 안 된다.
    const tournamentRef = adminDb.doc(`tournaments/${tid}`);

    await adminDb.runTransaction(async (tx) => {
      // ── 읽기 (Firestore는 모든 읽기가 쓰기보다 앞서야 한다) ──────────────
      const [runsSnap, guestSnap, legacySnap, tournamentSnap] = await Promise.all([
        tx.get(runsRef),
        tx.get(guestRef),
        tx.get(legacyProgressRef),
        tx.get(tournamentRef),
      ]);

      const stored = runsSnap.data() ?? {};
      const runIndex = normalizeRunIndex({
        runIndex: Number(stored.runIndex ?? 0),
        legacyRunExists: legacySnap.exists,
      });

      // 현재 회차의 판이 끝났는지 — 이어하기와 새 판을 가르는 유일한 사실.
      const currentRunComplete =
        runIndex === 0
          ? false
          : (await tx.get(adminDb.doc(`roundProgress/${runDocId(uid, tid, runIndex)}`)))
              .get("complete") === true;

      const runsTodayBefore = effectiveRunsToday({
        lastRunDate: (stored.lastRunDate as string | undefined) ?? null,
        runsToday: Number(stored.runsToday ?? 0),
        todayKST: date,
      });

      // ── 회차·한도·마감 판정이 먼저다 (클라이언트 게이트와 같은 함수) ────
      // v2.1: 게스트 게이트가 이 판정의 결과(이어하기 여부)를 입력으로 받는다. 게스트 한도는
      // 대회를 가로지르므로 "마지막 대회 하나"로는 이어하기를 판정할 수 없다(§16 실측 3).
      const decision = decideRun({
        runIndex,
        lastRunDate: (stored.lastRunDate as string | undefined) ?? null,
        runsToday: Number(stored.runsToday ?? 0),
        todayKST: date,
        currentRunComplete,
        // 🟢 2026-09-09 복원 (§14 · AC 9). PR 1에서 껐던 것을 **문구·화면과 같은 PR에서**
        // 되살린다 — 막는 것과 왜 막혔는지 알려주는 것은 한 쌍이다(2026-09-06 P0의 교훈).
        //
        // 이 값이 true 가 되려면 세 가지가 이미 있어야 하고, 전부 이 PR에 있다:
        //   ① §8 arena.run.deadlinePassed 문구 3언어
        //   ② 첫 진입 화면 안내(AC 16) + 완주 화면의 [다시 참여] 비활성 안내(AC 9)
        //   ③ 클라이언트가 details.code 로 그 문구를 고르는 경로(voteErrorMessageKey)
        //
        // 마감이 없는 문서는 "마감 아님"으로 읽는다(toDeadlineMs → null). 0단계에서 마감
        // 없는 대회를 전부 숨겼지만, 코드가 데이터를 믿고 막으면 그게 다음 P0다.
        //
        // 진행 중인 판은 decideRun 의 ① 분기가 먼저 잡아 이 값과 무관하게 이어진다(AC 9).
        deadlinePassed: isDeadlinePassed(
          toDeadlineMs(tournamentSnap.get("tournamentDeadline")),
          Date.now(),
        ),
      });

      // ── 게스트 한도 (§5 DO 3 · v2.1: 하루 통틀어 3판) ────────────────────
      const guest = guestSnap.data() ?? {};
      const guestRunsTodayBefore = effectiveRunsToday({
        lastRunDate: (guest.lastRunDate as string | undefined) ?? null,
        runsToday: Number(guest.runsToday ?? 0),
        todayKST: date,
      });
      if (isAnonymous) {
        const guestDecision = decideGuestRun({
          lastRunDate: (guest.lastRunDate as string | undefined) ?? null,
          runsToday: Number(guest.runsToday ?? 0),
          todayKST: date,
          // 이어하기는 한도를 쓰지 않는다 — A 미완주 → B → C(3판 소진) → A 이어하기 허용.
          isContinue: decision.status === "continue",
        });
        if (guestDecision.status === "login_required") {
          // 막히는 모든 경우가 같은 이유(오늘 3판을 다 썼다)라 화면 문구도 하나로 묶인다.
          // details.code 를 실어야 화면이 "계속하려면 로그인"이 아니라 login.guest_limit
          // 을 띄운다 — Google 버튼이 함께 뜨는 전환 지점이다 (AC 17).
          throw new HttpsError(
            "permission-denied",
            "Guest daily run limit reached — sign in to keep playing.",
            { code: VOTE_ERROR_CODES.GUEST_LIMIT },
          );
        }
      }

      if (decision.status === "limit_reached") {
        // #12: 하드코딩 한국어를 던지지 않는다 — 화면이 details.code로 3언어를 고른다.
        throw new HttpsError("resource-exhausted", "daily run limit reached", {
          code: VOTE_ERROR_CODES.DAILY_LIMIT,
        });
      }
      if (decision.status === "deadline_passed") {
        // 화면은 이 코드로 arena.run.deadlinePassed("이 Tournament는 마감됐어요. 다른
        // Tournament에 참여해 보세요.")를 고른다 — 일반 실패 배너가 아니다.
        throw new HttpsError("failed-precondition", "tournament deadline passed", {
          code: VOTE_ERROR_CODES.DEADLINE_PASSED,
        });
      }

      const plan = planRunWrite({
        decision,
        todayKST: date,
        runsTodayBefore,
        guestRunsTodayBefore,
      });

      let doc;
      try {
        doc = buildVoteDoc({
          userId: uid,
          tournamentId: tid,
          round: data.round ?? 0,
          matchId: data.matchId ?? "",
          contestantId: data.contestantId ?? "",
          date,
          runIndex: plan.runIndex,
          // 서버가 로그인 제공자로 판정한다 — 클라이언트가 보낸 플래그가 아니다(§16 실측 1).
          // PR 3의 랭킹 집계가 이 필드로 게스트의 선택을 건너뛴다.
          isGuest: isAnonymous,
        });
      } catch (e) {
        if (e instanceof VoteValidationError) {
          throw new HttpsError("invalid-argument", e.message);
        }
        throw e;
      }

      // 중복 방지: (uid, matchId, runIndex) — 같은 매치라도 판이 다르면 다른 선택이다.
      // 회차를 빼면 2판째의 첫 선택이 1판째와 중복으로 잡혀 아무것도 못 고르게 된다.
      const dupe = await tx.get(
        votes
          .where("userId", "==", uid)
          .where("matchId", "==", doc.matchId)
          .where("runIndex", "==", doc.runIndex)
          .limit(1),
      );
      if (!dupe.empty) {
        throw new HttpsError("already-exists", "이미 투표한 매치입니다.");
      }

      // ── 쓰기 ─────────────────────────────────────────────────────────────
      // 새 판일 때만 카운터가 움직인다. 이어하기는 아무것도 쓰지 않는다(AC 8).
      if (plan.tournamentRuns) {
        tx.set(
          runsRef,
          { ...plan.tournamentRuns, updatedAt: FieldValue.serverTimestamp() },
          { merge: true },
        );
        if (isAnonymous && plan.guestRuns) {
          tx.set(
            guestRef,
            { ...plan.guestRuns, updatedAt: FieldValue.serverTimestamp() },
            { merge: true },
          );
        }
      }
      tx.set(votes.doc(), { ...doc, createdAt: FieldValue.serverTimestamp() });
    });

    return { ok: true };
  },
);
