/**
 * LAB-EV-1 — per-uid 토큰 버킷 (§8 쿼터 방어).
 */
import { describe, expect, it } from "vitest";
import { createUidRateLimiter } from "../core/uidRateLimit";

describe("createUidRateLimiter", () => {
  it("한도까지는 통과, 넘으면 막는다", () => {
    const limiter = createUidRateLimiter(2, 60_000);
    expect(limiter.check("u1", 0)).toBe(true);
    expect(limiter.check("u1", 10)).toBe(true);
    expect(limiter.check("u1", 20)).toBe(false);
  });

  it("창이 지나면 리셋된다", () => {
    const limiter = createUidRateLimiter(1, 60_000);
    expect(limiter.check("u1", 0)).toBe(true);
    expect(limiter.check("u1", 100)).toBe(false);
    expect(limiter.check("u1", 60_000)).toBe(true);
  });

  it("uid마다 따로 센다", () => {
    const limiter = createUidRateLimiter(1, 60_000);
    expect(limiter.check("u1", 0)).toBe(true);
    expect(limiter.check("u2", 0)).toBe(true);
    expect(limiter.check("u1", 0)).toBe(false);
  });
});
