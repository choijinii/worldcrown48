/**
 * requireAdmin — the G-1 admin callables' server-side gate (handoff §5, §9 #5).
 *
 * Defense-in-depth: a Voter can call the callable URL directly from devtools, so
 * the client AdminAuthGuardLight is NEVER the security boundary. Every admin
 * callable's first line is `requireAdmin(req.auth?.uid, ADMIN_UID)`.
 *
 * FAIL-CLOSED (mirrors lib/lab/isAdmin): an unset/empty adminUid denies everyone
 * — an unconfigured env var must never become "everyone is admin".
 */
import { HttpsError } from "firebase-functions/v2/https";

export function requireAdmin(
  callerUid: string | null | undefined,
  adminUid: string | null | undefined,
): void {
  if (!callerUid) {
    throw new HttpsError("unauthenticated", "로그인이 필요합니다.");
  }
  if (!adminUid || callerUid !== adminUid) {
    throw new HttpsError("permission-denied", "운영자 권한이 필요합니다.");
  }
}
