/**
 * requireAdmin — server-side admin gate for the G-1 callables (handoff §5, §9
 * trap #5). Defense-in-depth: the client AdminAuthGuardLight is NOT trusted —
 * every admin callable re-verifies here, fail-closed.
 */
import { describe, expect, it } from "vitest";
import { HttpsError } from "firebase-functions/v2/https";
import { requireAdmin } from "../core/requireAdmin";

function codeOf(fn: () => void): string {
  try {
    fn();
  } catch (e) {
    if (e instanceof HttpsError) return e.code;
    throw e;
  }
  return "(did-not-throw)";
}

describe("requireAdmin", () => {
  const ADMIN = "admin-uid-123";

  it("returns silently for the configured admin", () => {
    expect(() => requireAdmin(ADMIN, ADMIN)).not.toThrow();
  });

  it("unauthenticated when there is no caller uid", () => {
    expect(codeOf(() => requireAdmin(undefined, ADMIN))).toBe("unauthenticated");
    expect(codeOf(() => requireAdmin(null, ADMIN))).toBe("unauthenticated");
  });

  it("permission-denied when the caller is not the admin", () => {
    expect(codeOf(() => requireAdmin("some-voter", ADMIN))).toBe("permission-denied");
  });

  it("fail-closed: permission-denied when ADMIN_UID is unset (nobody is admin)", () => {
    expect(codeOf(() => requireAdmin("anyone", undefined))).toBe("permission-denied");
    expect(codeOf(() => requireAdmin("anyone", ""))).toBe("permission-denied");
  });
});
