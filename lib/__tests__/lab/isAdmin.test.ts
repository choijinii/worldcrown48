import { describe, it, expect } from "vitest";
import { isAdmin } from "@/lib/lab/isAdmin";

describe("isAdmin", () => {
  it("grants when the signed-in uid matches the configured admin uid", () => {
    expect(isAdmin("abc123", "abc123")).toBe(true);
  });

  it("denies when uids differ", () => {
    expect(isAdmin("voter999", "abc123")).toBe(false);
  });

  it("denies when there is no signed-in user", () => {
    expect(isAdmin(undefined, "abc123")).toBe(false);
    expect(isAdmin(null, "abc123")).toBe(false);
  });

  // trap #2: if NEXT_PUBLIC_ADMIN_UID is unset the guard MUST fail closed,
  // never grant. Otherwise every visitor becomes admin.
  it("denies (fail-closed) when the admin uid is not configured", () => {
    expect(isAdmin("abc123", undefined)).toBe(false);
    expect(isAdmin("abc123", "")).toBe(false);
    expect(isAdmin(undefined, undefined)).toBe(false);
  });

  it("never treats two empty strings as a match", () => {
    expect(isAdmin("", "")).toBe(false);
  });
});
