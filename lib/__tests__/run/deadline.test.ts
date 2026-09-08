/**
 * 마감(Tournament Deadline) 판정 — AC 9·16.
 *
 * §9 함정 12: `tournamentDeadline` 은 랭킹·Pitch 등 7개 파일에서 쓰이지만 Arena 진입과
 * onVote 에는 없었다. 마감 강제는 신규 구현이고, 2026-09-06 P0의 원인은 그 강제를 설명하는
 * 화면이 없었던 것이다(§14) — 판정 자체는 여기서 단순해야 한다.
 *
 * 값이 없으면 "마감 아님"이다. 0단계에서 마감 없는 대회를 전부 숨겼지만 코드는 방어한다.
 */
import { describe, expect, it } from "vitest";
import { isDeadlinePassed, toDeadlineMs } from "@/lib/run/deadline";

const NOW = Date.UTC(2026, 8, 9, 3, 0, 0); // 2026-09-09 12:00 KST

describe("toDeadlineMs — 세 가지 표현을 하나로 좁힌다", () => {
  it("Firestore Timestamp(admin·web 공통 toMillis)를 읽는다", () => {
    expect(toDeadlineMs({ toMillis: () => 1234 })).toBe(1234);
  });

  it("Date 를 읽는다", () => {
    expect(toDeadlineMs(new Date(NOW))).toBe(NOW);
  });

  it("숫자를 그대로 읽는다", () => {
    expect(toDeadlineMs(NOW)).toBe(NOW);
  });

  it("없거나 모르는 값은 null — 마감 없음으로 읽힌다", () => {
    expect(toDeadlineMs(null)).toBeNull();
    expect(toDeadlineMs(undefined)).toBeNull();
    expect(toDeadlineMs("2026-11-30")).toBeNull();
    expect(toDeadlineMs({})).toBeNull();
  });

  it("깨진 Date·NaN 은 null — 마감으로 오독하지 않는다", () => {
    expect(toDeadlineMs(new Date("nope"))).toBeNull();
    expect(toDeadlineMs(Number.NaN)).toBeNull();
  });
});

describe("isDeadlinePassed", () => {
  it("마감이 지났으면 true", () => {
    expect(isDeadlinePassed(NOW - 1, NOW)).toBe(true);
  });

  it("마감이 남았으면 false", () => {
    expect(isDeadlinePassed(NOW + 1, NOW)).toBe(false);
  });

  it("정확히 같은 순간은 아직 마감이 아니다 — 경계는 열려 있다", () => {
    expect(isDeadlinePassed(NOW, NOW)).toBe(false);
  });

  it("마감이 없으면(null) 절대 막지 않는다", () => {
    // 0단계에서 마감 없는 대회를 숨겼지만, 코드가 데이터를 믿고 막으면 그게 다음 P0다.
    expect(isDeadlinePassed(null, NOW)).toBe(false);
  });
});
