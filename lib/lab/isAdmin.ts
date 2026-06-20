/**
 * Admin identity check (Domain 2 · The Lab gate).
 *
 * FAIL-CLOSED by contract (handoff §9 trap #2): if the admin uid is not
 * configured (NEXT_PUBLIC_ADMIN_UID unset → undefined/empty), this returns
 * false for everyone. Never fall open — an unset env var becoming "everyone
 * is admin" is the single worst bug in this module.
 *
 * Both values must be non-empty strings AND equal. Two empty strings never
 * match (guards the undefined→"" coercion case).
 */
export function isAdmin(
  uid: string | null | undefined,
  adminUid: string | null | undefined,
): boolean {
  if (!uid || !adminUid) return false;
  return uid === adminUid;
}
