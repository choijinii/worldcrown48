/**
 * onVote rate limit — C-3 strengthens the per-uid token bucket 10 → 5 (handoff §8).
 *
 * The bucket takes `now` as an explicit param, so the three §8.3 scenarios
 * (5 pass · 6th rejects · reset after the window) are deterministic without
 * fake timers, the onCall wrapper, or Firestore.
 */
import { beforeEach, describe, expect, it } from "vitest";
import {
  __resetRateBucketsForTest,
  checkRateLimit,
  RATE_LIMIT,
  RATE_WINDOW_MS,
} from "../onVote";

beforeEach(() => __resetRateBucketsForTest());

describe("onVote rate limit (C-3: 5 / uid / min)", () => {
  it("the constant is 5 (was 10)", () => {
    expect(RATE_LIMIT).toBe(5);
  });

  it("passes the first 5 calls within a window", () => {
    const now = 1_000_000;
    for (let i = 0; i < RATE_LIMIT; i++) {
      expect(checkRateLimit("u1", now)).toBe(true);
    }
  });

  it("rejects the 6th call in the same window", () => {
    const now = 1_000_000;
    for (let i = 0; i < RATE_LIMIT; i++) checkRateLimit("u1", now);
    expect(checkRateLimit("u1", now)).toBe(false);
  });

  it("resets the count once the 60s window elapses", () => {
    const now = 1_000_000;
    for (let i = 0; i < RATE_LIMIT; i++) checkRateLimit("u1", now);
    expect(checkRateLimit("u1", now)).toBe(false);
    expect(checkRateLimit("u1", now + RATE_WINDOW_MS)).toBe(true);
  });

  it("tracks uids independently (one flooder doesn't block others)", () => {
    const now = 1_000_000;
    for (let i = 0; i < RATE_LIMIT; i++) checkRateLimit("u1", now);
    expect(checkRateLimit("u1", now)).toBe(false);
    expect(checkRateLimit("u2", now)).toBe(true);
  });
});
