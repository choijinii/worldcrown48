/**
 * RUN-1 PR 3 — 마감된 대회도 **마감 후 최소 한 번은** 집계된다.
 *
 * 왜 필요한가. 크론은 `tournamentDeadline > now` 인 대회만 집계하고(마감 전), 팬은 W-7 때문에
 * 마감 후에만 랭킹을 본다. 그래서 팬이 보는 **최종 랭킹은 "마감 직전 마지막 크론 사진"** 이다.
 * 60분 주기에서는 최대 1시간이 빠져 눈에 띄지 않았지만, 발표가 하루 두 번이 되면
 * **마감 직전 최대 12시간의 선택이 최종 랭킹에서 통째로 빠진다.** 이 PR이 그 구멍을 12배로
 * 키우므로 같은 PR에서 함께 막는다.
 *
 * 값이 틀어지는 곳이 화면만이 아니다 — `onChampionForNews.ts:63` 이 이 캐시의 #1으로 기사
 * 챔피언을 정한다. 캐시가 낡으면 **기사에 실리는 Champion이 틀린다.**
 */
import { describe, expect, it } from "vitest";
import {
  CLOSED_GRACE_HOURS,
  PUBLISH_INTERVAL_HOURS,
  isInRankingWindow,
  rankingWindowStartMs,
} from "../core/rankingWindow";

const H = 3_600_000;
const NOW = Date.UTC(2026, 8, 10, 12, 0, 0); // 임의 고정 시각

describe("유예 상수", () => {
  it("유예는 발표 주기보다 길다 — 이게 '마감 후 최소 한 번'을 보장한다", () => {
    // 같거나 짧으면 마감 직후 대회가 다음 발표 전에 창에서 빠져나가 영영 재집계되지 않는다.
    expect(CLOSED_GRACE_HOURS).toBeGreaterThan(PUBLISH_INTERVAL_HOURS);
  });
});

describe("rankingWindowStartMs", () => {
  it("지금으로부터 유예 시간만큼 이전을 하한으로 준다", () => {
    expect(rankingWindowStartMs(NOW)).toBe(NOW - CLOSED_GRACE_HOURS * H);
  });
});

describe("isInRankingWindow — 시각 경계", () => {
  it("마감이 미래면 집계한다 (기존 동작 그대로)", () => {
    expect(isInRankingWindow(NOW + H, NOW)).toBe(true);
  });

  it("마감이 지금 막 지났으면 집계한다", () => {
    expect(isInRankingWindow(NOW - 1, NOW)).toBe(true);
  });

  it("마감 12시간 뒤에도 집계한다 — 옛 조건이 놓치던 바로 그 구간", () => {
    expect(isInRankingWindow(NOW - 12 * H, NOW)).toBe(true);
  });

  it("경계: 마감 13시간 정각은 빠진다 (하한은 초과 비교)", () => {
    expect(isInRankingWindow(NOW - CLOSED_GRACE_HOURS * H, NOW)).toBe(false);
  });

  it("경계: 13시간에서 1ms 모자라면 들어온다", () => {
    expect(isInRankingWindow(NOW - CLOSED_GRACE_HOURS * H + 1, NOW)).toBe(true);
  });

  it("한참 전에 마감된 대회는 빠진다 — 비용이 늘지 않는 이유다", () => {
    expect(isInRankingWindow(NOW - 30 * 24 * H, NOW)).toBe(false);
  });

  it("마감 직후 대회는 다음 발표(12시간 뒤)까지 창 안에 남는다", () => {
    // 마감 = 어느 발표 직후. 그 다음 발표 시점에도 아직 창 안이어야 재집계가 실제로 일어난다.
    const closedAt = NOW;
    const nextPublish = NOW + PUBLISH_INTERVAL_HOURS * H;
    expect(isInRankingWindow(closedAt, nextPublish)).toBe(true);
  });
});
