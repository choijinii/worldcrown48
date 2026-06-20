/**
 * Admin gate decision (Domain 2 · The Lab).
 *
 * Pure mapping from auth state → what the AdminAuthGuard should render. Keeps
 * the security decision node-env testable; the component is then a thin switch
 * over these four states (spinner / LoginModal / redirect / children).
 *
 * Anonymous users are treated as not-signed-in, matching the /account guard
 * (`user && !user.isAnonymous`). Fail-closed: an unconfigured adminUid yields
 * "forbidden" for everyone (delegates to isAdmin — trap #2).
 */
import { isAdmin } from "@/lib/lab/isAdmin";

export type AdminGateState =
  | "loading"
  | "needs-signin"
  | "forbidden"
  | "allowed";

export interface AdminGateInput {
  loading: boolean;
  uid: string | null | undefined;
  isAnonymous: boolean;
  adminUid: string | undefined;
}

export function adminGateState(input: AdminGateInput): AdminGateState {
  if (input.loading) return "loading";
  if (!input.uid || input.isAnonymous) return "needs-signin";
  return isAdmin(input.uid, input.adminUid) ? "allowed" : "forbidden";
}

/**
 * True for `/admin` and any path beneath it (boundary-aware: `/administrator`
 * is NOT an admin path). Used by middleware to tag the subtree noindex.
 */
export function isAdminPath(pathname: string): boolean {
  return pathname === "/admin" || pathname.startsWith("/admin/");
}
