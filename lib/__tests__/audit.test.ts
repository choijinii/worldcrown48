/**
 * lib/audit — hashUid invariants for the GDPR audit log.
 *
 * If hashUid ever stopped being a 64-char hex digest, the rules in §부록 B
 * that police `uidHash` would silently let arbitrary blobs through, and
 * the auditLog → uid re-identification protection would be gone.
 */
import { describe, expect, it } from "vitest";
import { hashUid } from "../audit";

describe("hashUid", () => {
  it("returns 64-char lowercase hex (SHA-256 digest)", async () => {
    const h = await hashUid("abc123");
    expect(h).toMatch(/^[0-9a-f]{64}$/);
  });

  it("is deterministic — same input gives same digest", async () => {
    const a = await hashUid("user-uid-XYZ");
    const b = await hashUid("user-uid-XYZ");
    expect(a).toBe(b);
  });

  it("differentiates distinct uids — no preimage collisions in practice", async () => {
    const a = await hashUid("user-A");
    const b = await hashUid("user-B");
    expect(a).not.toBe(b);
  });
});
