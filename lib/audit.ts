/**
 * GDPR audit_log helpers.
 *
 * `hashUid` produces the 64-char lowercase hex digest of a Firebase uid that
 * goes into `auditLog.uidHash`. Handoff §5 DON'T: storing the uid plaintext
 * in the audit log violates GDPR Art. 17 — the whole point of the audit
 * record is to prove the deletion happened without re-identifying the user.
 *
 * Implementation: Web Crypto's SubtleCrypto. Available in modern browsers
 * AND Node 18+ — the same module compiles for both the Next.js client and
 * any future server-side caller without a polyfill.
 */
export async function hashUid(uid: string): Promise<string> {
  const bytes = new TextEncoder().encode(uid);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
