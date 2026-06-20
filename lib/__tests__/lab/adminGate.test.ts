import { describe, it, expect } from "vitest";
import { adminGateState, isAdminPath } from "@/lib/lab/adminGate";

const ADMIN = "admin-uid-1";

describe("adminGateState", () => {
  it("is loading while auth has not settled", () => {
    expect(
      adminGateState({
        loading: true,
        uid: ADMIN,
        isAnonymous: false,
        adminUid: ADMIN,
      }),
    ).toBe("loading");
  });

  it("needs sign-in when there is no user", () => {
    expect(
      adminGateState({
        loading: false,
        uid: null,
        isAnonymous: false,
        adminUid: ADMIN,
      }),
    ).toBe("needs-signin");
  });

  it("treats an anonymous user as needing sign-in (not an admin)", () => {
    expect(
      adminGateState({
        loading: false,
        uid: "anon-123",
        isAnonymous: true,
        adminUid: ADMIN,
      }),
    ).toBe("needs-signin");
  });

  it("allows the configured admin", () => {
    expect(
      adminGateState({
        loading: false,
        uid: ADMIN,
        isAnonymous: false,
        adminUid: ADMIN,
      }),
    ).toBe("allowed");
  });

  it("forbids a signed-in non-admin (Voter)", () => {
    expect(
      adminGateState({
        loading: false,
        uid: "voter-9",
        isAnonymous: false,
        adminUid: ADMIN,
      }),
    ).toBe("forbidden");
  });

  it("forbids everyone when admin uid is unconfigured (fail-closed, trap #2)", () => {
    expect(
      adminGateState({
        loading: false,
        uid: ADMIN,
        isAnonymous: false,
        adminUid: undefined,
      }),
    ).toBe("forbidden");
  });
});

describe("isAdminPath", () => {
  it("matches /admin and everything under it", () => {
    expect(isAdminPath("/admin")).toBe(true);
    expect(isAdminPath("/admin/lab")).toBe(true);
    expect(isAdminPath("/admin/lab/anything")).toBe(true);
  });

  it("does not match non-admin paths or look-alikes", () => {
    expect(isAdminPath("/")).toBe(false);
    expect(isAdminPath("/account")).toBe(false);
    expect(isAdminPath("/administrator")).toBe(false); // boundary, not prefix
  });
});
