/**
 * rankingWindow — 크론이 어느 Tournament를 집계할지 정하는 시각 창 (RUN-1 PR 3).
 *
 * ## 왜 마감된 대회까지 보는가
 *
 * 두 사실이 어긋나 있었다:
 *   · 크론은 **마감 전** 대회만 집계했다 (`tournamentDeadline > now`)
 *   · 팬은 W-7 때문에 **마감 후에만** 랭킹을 본다 (`firestore.rules` · `deriveState`)
 *
 * 그래서 팬이 보는 최종 랭킹은 **"마감 직전 마지막 크론 사진"** 이다. 60분 주기에서는 최대
 * 1시간이 빠져 드러나지 않았는데, 발표가 하루 두 번이 되면 **마감 직전 최대 12시간의 선택이
 * 최종 랭킹에서 통째로 빠진다.** 주기를 12배로 늘린 PR이 그 구멍도 12배로 키우므로 같은 PR에서
 * 함께 막는다.
 *
 * 틀어지는 곳이 화면만이 아니다 — `onChampionForNews.ts` 가 이 캐시의 #1으로 **기사에 실릴
 * Champion** 을 정한다. 낡은 캐시는 틀린 챔피언 기사를 만든다.
 *
 * ## 무엇을 바꾸지 않는가
 *
 * 넓히는 것은 **조회 대상뿐**이다. 마감된 대회가 한 번 더 집계돼도 랭킹 값 계산 로직은 그대로다
 * (§5 DON'T 2 유지 — `isGuest` 필터 외 집계 변경 금지). 재집계로 `admin_alerts` 가 한 번 더
 * 도는 것은 관리자 전용이라 무방하다.
 */

/**
 * 발표 간격(시간) — 크론식 `"0 9,21 * * *"` 의 두 발표 사이 간격.
 * 값을 바꾸면 `scheduleRankingCache` 의 크론식도 함께 바꿔야 한다
 * (크론식 자체는 `__tests__/scheduleRankingCacheSchedule.test.ts` 가 고정한다).
 */
export const PUBLISH_INTERVAL_HOURS = 12;

/**
 * 마감 이후에도 계속 집계하는 유예(시간).
 *
 * ⚠️ **반드시 `PUBLISH_INTERVAL_HOURS` 보다 길어야 한다.** 같거나 짧으면 마감 직후의 대회가
 * 다음 발표가 오기 전에 창에서 빠져나가, 마감 후 단 한 번도 재집계되지 않는다 — 고치려던 구멍이
 * 그대로 남는다. 길게 잡아도 유예가 지난 대회는 자연히 빠지므로 비용은 사실상 그대로다
 * (대회 하나가 추가로 집계되는 횟수는 많아야 두 번이다).
 */
export const CLOSED_GRACE_HOURS = 13;

const HOUR_MS = 3_600_000;

/** 이 시각 기준으로 집계 대상의 하한(마감이 이보다 뒤인 대회만 본다). */
export function rankingWindowStartMs(nowMs: number): number {
  return nowMs - CLOSED_GRACE_HOURS * HOUR_MS;
}

/**
 * 이 마감 시각을 가진 Tournament를 지금 집계하는가.
 *
 * Firestore 쿼리(`where("tournamentDeadline", ">", cutoff)`)와 **같은 초과 비교**다 —
 * 두 판정이 갈리면 테스트가 지키는 경계와 실제로 도는 경계가 달라진다.
 */
export function isInRankingWindow(deadlineMs: number, nowMs: number): boolean {
  return deadlineMs > rankingWindowStartMs(nowMs);
}
