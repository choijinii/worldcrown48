/**
 * onVote rate limit — HF-1.5 relaxes the per-uid token bucket 5 → 20 (3초/표).
 *
 * The bucket takes `now` as an explicit param, so the three scenarios
 * (20 pass · 21st rejects · reset after the window) are deterministic without
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

describe("onVote rate limit (HF-1.5: 20 / uid / min)", () => {
  it("the constant is 20 (was 5)", () => {
    expect(RATE_LIMIT).toBe(20);
  });

  it("passes the first 20 calls within a window", () => {
    const now = 1_000_000;
    for (let i = 0; i < RATE_LIMIT; i++) {
      expect(checkRateLimit("u1", now)).toBe(true);
    }
  });

  it("rejects the 21st call in the same window", () => {
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
