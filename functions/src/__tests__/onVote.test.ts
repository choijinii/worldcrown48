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

describe("onVote rate limit (RUN-1: 40 / uid / min)", () => {
  it("상수는 40이다 (HF-1.5의 20 → RUN-1에서 40, 2026-09-03 대표 확정)", () => {
    // 5판 = 선택 230번. 분당 20이면 규칙이 최소 11.5분을 강제해 "판을 늘려 결과물을
    // 늘린다"는 v2.0 설계와 정면으로 충돌한다. 40이면 1.5초에 한 번까지 허용된다.
    expect(RATE_LIMIT).toBe(40);
  });

  it("한 창에서 40번까지 통과한다 (AC 13)", () => {
    const now = 1_000_000;
    for (let i = 0; i < RATE_LIMIT; i++) {
      expect(checkRateLimit("u1", now)).toBe(true);
    }
  });

  it("41번째에 막는다 (AC 13)", () => {
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
