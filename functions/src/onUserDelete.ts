/**
 * onUserDelete — GDPR Article 17 erasure for the calling user.
 *
 * Auth: callable; the caller must be signed in. The uid we erase is
 * `req.auth.uid` — there is no override path for admins (those go through
 * a separate console-only tool not in MVP1 scope).
 *
 * What we delete (handoff §4-3, decision: collection names camelCase):
 *   - users/{uid}            (profile doc)
 *   - cookieConsents/{uid}   (E-1 consent record)
 *   - userPrefs/{uid}        (language / theme)
 *   - votes where userId==uid (chunked — Firestore batches cap at 500)
 *
 * What we preserve:
 *   - auditLog entry recording the deletion with SHA-256(uid). The hash
 *     proves the request happened without re-identifying the user, which
 *     is exactly what Art. 30 processing records require.
 *   - vote_stats (Realtime DB aggregates) — already anonymous, see §9 trap 10.
 *
 * Ordering: Firestore deletes (incl. audit log) first, then Auth account.
 * If the Auth call fails the visitor can retry — the second Firestore pass
 * is idempotent for already-deleted docs (it just no-ops). The trade-off
 * is a possible duplicate audit entry on retry, which is acceptable for
 * an append-only record.
 */
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { FieldValue, type Firestore } from "firebase-admin/firestore";
import * as crypto from "node:crypto";
import { adminAuth, adminDb } from "./admin";
import { ALLOWED_ORIGINS } from "./cors";
import { addRecountRequestToBatch, type ServerTime } from "./core/rankingAccumStore";

/**
 * 한 batch 에 지우는 기록 수. Firestore batch 상한은 500 쓰기인데, T5 부터는 같은 batch 에
 * 그 조각의 대회마다 다시 세기 요청을 하나씩 더 쓴다 → 요청 몫 50 을 남겨 450.
 * 한 조각에 대회가 50개를 넘으면 `deleteUserVotes` 가 상한 앞에서 조각을 끊는다.
 */
const BATCH_LIMIT = 450;
/** Firestore batch 한 번의 쓰기 상한. */
const WRITE_LIMIT = 500;
const DELETE_TIMEOUT_SECONDS = 60;

function sha256Hex(input: string): string {
  return crypto.createHash("sha256").update(input).digest("hex");
}

/**
 * Pass 2 몸통 — 이 계정의 기록을 조각으로 지운다. 에뮬레이터 시험이 직접 부르려고 꺼냈다.
 *
 * T5 증분 집계는 지워진 기록을 누적에서 뺄 수 없다(증분은 더하기만 한다). 그래서 조각마다 그
 * 조각에 나온 대회마다 다시 세기 요청을 **지우기와 같은 batch** 에 쓴다 — 지우기만 되고 요청이
 * 빠지는 일이 없다(둘 다 되거나 둘 다 안 된다). 같은 대회가 여러 조각에 나오면 요청 문서
 * 하나(merge)를 다시 쓸 뿐이다.
 *
 * `opts.serverTime` 은 시험이 루트 firebase-admin 의 값을 넘기려고 연다.
 */
export async function deleteUserVotes(
  db: Firestore,
  uid: string,
  opts: { pageSize?: number; serverTime?: ServerTime } = {},
): Promise<number> {
  const pageSize = opts.pageSize ?? BATCH_LIMIT;
  let deletedVotes = 0;
  for (;;) {
    const snap = await db
      .collection("votes")
      .where("userId", "==", uid)
      .limit(pageSize)
      .get();
    if (snap.empty) break;
    const batch = db.batch();
    const tids = new Set<string>();
    let taken = 0;
    for (const d of snap.docs) {
      const tid = (d.data() as { tournamentId?: unknown }).tournamentId;
      const newTid = typeof tid === "string" && tid !== "" && !tids.has(tid);
      // 지우기 + 요청이 batch 상한을 넘으려 하면 여기서 끊는다 — 남은 기록은 다음 조각이 다시 읽는다
      // (지운 기록은 쿼리에서 빠지므로 커서가 필요 없다). 대회가 아주 많은 계정의 안전판이다.
      if (taken + 1 + tids.size + (newTid ? 1 : 0) > WRITE_LIMIT) break;
      batch.delete(d.ref);
      if (newTid) tids.add(tid as string);
      taken += 1;
    }
    Array.from(tids).forEach((tid) =>
      addRecountRequestToBatch(db, batch, tid, "user-delete", opts.serverTime),
    );
    await batch.commit();
    deletedVotes += taken;
    if (snap.size < pageSize && taken === snap.size) break;
  }
  return deletedVotes;
}

export const onUserDelete = onCall(
  {
    timeoutSeconds: DELETE_TIMEOUT_SECONDS,
    cors: ALLOWED_ORIGINS,
  },
  async (req): Promise<{ ok: true; deletedVotes: number }> => {
    const uid = req.auth?.uid;
    if (!uid) {
      throw new HttpsError(
        "unauthenticated",
        "Sign-in required to delete your data.",
      );
    }

    const uidHash = sha256Hex(uid);

    // Pass 1: profile + consent + prefs + audit entry, atomically.
    const head = adminDb.batch();
    head.delete(adminDb.collection("users").doc(uid));
    head.delete(adminDb.collection("cookieConsents").doc(uid));
    head.delete(adminDb.collection("userPrefs").doc(uid));
    head.set(adminDb.collection("auditLog").doc(), {
      action: "GDPR_DELETE",
      uidHash,
      timestamp: FieldValue.serverTimestamp(),
    });
    await head.commit();

    // Pass 2: vote rows in chunks. Loop until the query returns fewer than
    // BATCH_LIMIT — that's the only termination signal that doesn't race
    // against eventual-consistency reads of just-deleted docs.
    const deletedVotes = await deleteUserVotes(adminDb, uid);

    // Pass 3: Auth account. If this fails, the Firestore state is already
    // erased; the caller can retry and the head batch will no-op the
    // already-deleted docs (it WILL write a second audit entry — acceptable).
    //
    // Handoff §9 trap 9 — never silent-fail this call. If the runtime SA
    // lacks `roles/firebaseauth.admin` we surface a proper HttpsError so
    // the client toast points the user at policy@. `auth/user-not-found`
    // is fine: someone else already removed the record (idempotent retry).
    try {
      await adminAuth.deleteUser(uid);
    } catch (err) {
      const code = (err as { code?: string; errorInfo?: { code?: string } })
        .errorInfo?.code ?? (err as { code?: string }).code;
      if (code === "auth/user-not-found") {
        return { ok: true, deletedVotes };
      }
      const message =
        err instanceof Error ? err.message : "Unknown deleteUser failure";
      throw new HttpsError("internal", `auth.deleteUser failed: ${message}`, {
        code,
      });
    }

    return { ok: true, deletedVotes };
  },
);
