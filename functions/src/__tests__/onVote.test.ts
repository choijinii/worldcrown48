/**
 * onVote rate limit — HF-1.5 relaxes the per-uid token bucket 5 → 20 (3초/표).
 *
 * The bucket takes `now` as an explicit param, so the three scenarios
 * (20 pass · 21st rejects · reset after the window) are deterministic without
 * fake timers, the onCall wrapper, or Firestore.
 */
import { decideRun } from "../_run/decideRun";
import { isDeadlinePassed, toDeadlineMs } from "../_run/deadline";
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

describe("마감 강제 (AC 9·16 · §14 복원)", () => {
  it("마감이 지난 대회의 새 판은 deadline_passed 를 낸다", () => {
    expect(
      decideRun({
        runIndex: 1,
        lastRunDate: null,
        runsToday: 0,
        todayKST: "2026-09-09",
        currentRunComplete: true,
        deadlinePassed: true,
      }),
    ).toEqual({ status: "deadline_passed" });
  });

  it("진행 중인 판은 마감돼도 이어간다 (AC 9)", () => {
    // 마감 직전에 시작한 팬을 중간에 끊지 않는다(2026-09-05 대표 확정).
    expect(
      decideRun({
        runIndex: 2,
        lastRunDate: "2026-09-09",
        runsToday: 1,
        todayKST: "2026-09-09",
        currentRunComplete: false,
        deadlinePassed: true,
      }),
    ).toEqual({ status: "continue", runIndex: 2 });
  });

  it("마감 필드가 없는 문서는 막지 않는다 — 코드가 데이터를 믿고 막으면 그게 다음 P0다", () => {
    expect(isDeadlinePassed(toDeadlineMs(undefined), Date.now())).toBe(false);
    expect(isDeadlinePassed(toDeadlineMs(null), Date.now())).toBe(false);
  });

  it("Firestore Timestamp 를 그대로 읽는다 — 서버는 admin SDK 타입을 넘긴다", () => {
    const past = { toMillis: () => Date.now() - 1000 };
    const future = { toMillis: () => Date.now() + 60_000 };
    expect(isDeadlinePassed(toDeadlineMs(past), Date.now())).toBe(true);
    expect(isDeadlinePassed(toDeadlineMs(future), Date.now())).toBe(false);
  });
});
