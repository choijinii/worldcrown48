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
import { FieldValue } from "firebase-admin/firestore";
import * as crypto from "node:crypto";
import { adminAuth, adminDb } from "./admin";

const BATCH_LIMIT = 500;
const DELETE_TIMEOUT_SECONDS = 60;

function sha256Hex(input: string): string {
  return crypto.createHash("sha256").update(input).digest("hex");
}

export const onUserDelete = onCall(
  {
    timeoutSeconds: DELETE_TIMEOUT_SECONDS,
    cors: [
      /^https:\/\/worldcrown48\.com$/,
      /^https:\/\/.*\.vercel\.app$/,
      /^http:\/\/localhost:\d+$/,
    ],
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
    let deletedVotes = 0;
    for (;;) {
      const snap = await adminDb
        .collection("votes")
        .where("userId", "==", uid)
        .limit(BATCH_LIMIT)
        .get();
      if (snap.empty) break;
      const batch = adminDb.batch();
      snap.docs.forEach((d) => batch.delete(d.ref));
      await batch.commit();
      deletedVotes += snap.size;
      if (snap.size < BATCH_LIMIT) break;
    }

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
