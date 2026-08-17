/**
 * quota — YouTube Data API v3 할당량 사실과 실행 전 판정 (LAB-EV-2 §4 R4·R8).
 *
 * ⚠ **킥 §1의 기재는 낡았다.** 2026-08-17 Google 문서 실측(R8 "추측 금지"):
 *   출처 ① developers.google.com/youtube/v3/determine_quota_cost
 *        ② developers.google.com/youtube/v3/getting-started
 *
 *   킥 문면:  search.list = 100유닛/회 · 하루 10,000유닛 공용 풀
 *   문서 현행: "Projects that enable the YouTube Data API have a default quota
 *              allocation of 100 search.list calls, 100 videos.insert calls, and
 *              10,000 units per day combined for all other endpoints."
 *              "The search.list and videos.insert methods have their own quota
 *              buckets. Each of these methods has a default daily limit of 100."
 *
 * 즉 search.list는 **자체 버킷(100콜/일, 콜당 1유닛)**이고, videos.list 같은 나머지
 * 엔드포인트가 10,000유닛을 나눠 쓴다. 실효 천장(48명 소싱 ×2 ≈ 하루 2개 토너먼트)은
 * 킥의 계산과 우연히 같지만, **가드가 세어야 할 대상이 "유닛"이 아니라 "search 콜"**
 * 이다. 유닛만 세면 10,000 풀은 텅 빈 채로 search 100콜을 넘겨 quotaExceeded가 난다.
 *
 * 그래서 카운터를 두 버킷으로 나누고, 문서 id는 **태평양시 날짜**로 잡는다 —
 * "Daily quotas reset at midnight Pacific Time (PT)". KST 날짜로 세면 하루에 두 번
 * 어긋나는 구간이 생겨 카운터가 Google 실사용량과 벌어진다(§6 Auto-STOP 5번).
 */

/** search.list 전용 버킷 — 하루 100콜. 이게 48명 소싱의 진짜 천장이다. */
export const SEARCH_CALLS_PER_DAY = 100;

/** search.list 외 모든 엔드포인트가 나눠 쓰는 공용 풀. */
export const UNITS_PER_DAY = 10_000;

/** search.list 콜당 유닛 (자체 버킷과 별개로 유닛도 1 든다). */
export const SEARCH_CALL_UNITS = 1;

/** videos.list 콜당 유닛 — id 개수 무관(≤50). LAB-EV-1 inspectCore와 같은 사실. */
export const VIDEOS_LIST_UNITS = 1;

/** 한 슬롯에서 최대 몇 개 후보까지 시도하는가 (§3 "재시도 루프 최대 3후보"). */
export const CANDIDATE_ATTEMPTS = 3;

export interface QuotaUsage {
  /** 오늘 쓴 search.list 콜 수. */
  searchCalls: number;
  /** 오늘 쓴 공용 풀 유닛. */
  units: number;
}

export interface QuotaEstimate {
  searchCalls: number;
  units: number;
}

export type QuotaBucket = "search" | "units";

export type QuotaDecision =
  | { status: "allowed" }
  | {
      status: "denied";
      bucket: QuotaBucket;
      /** 남은 양 (콜 또는 유닛). */
      remaining: number;
      /** 이번 실행에 필요한 양. */
      needed: number;
    };

/** 오늘 남은 양. 음수는 0으로 눌러 UI가 "-3 남음"을 그리지 않게 한다. */
export function remainingQuota(usage: QuotaUsage): QuotaUsage {
  return {
    searchCalls: Math.max(0, SEARCH_CALLS_PER_DAY - usage.searchCalls),
    units: Math.max(0, UNITS_PER_DAY - usage.units),
  };
}

/**
 * 이번 실행의 **상한** 추정 (R4 — 실행 전에 계산해야 하므로 검색 결과를 보기 전이다).
 *
 * · 캐시 적중분은 search.list를 부르지 않으므로 `searchesNeeded`에서 빠진다
 *   (DoD "캐시 적중분은 차감 없음" — search 버킷 기준).
 * · 검증은 videos.list 배치라 콜 수 = ceil(검증할 id 수 / 50).
 *
 * 실제 소비가 이보다 적으면 실행 후 `settle`로 되돌린다 — 카운터가 Cloud Console
 * 실사용량과 벌어지면 §7 대조가 무의미해진다.
 */
export function estimateSourcingQuota(input: {
  /** 캐시 미적중 슬롯 수 = 새로 부를 search.list 콜 수. */
  searchesNeeded: number;
  /** 검증(videos.list)에 넘길 id 수의 상한. */
  verifyIdCount: number;
  /** videos.list 1콜이 받는 id 상한 (lib/embed/constants MAX_VIDEOS_PER_CALL). */
  maxIdsPerVerifyCall: number;
}): QuotaEstimate {
  const searchCalls = Math.max(0, Math.trunc(input.searchesNeeded));
  const verifyCalls =
    input.verifyIdCount > 0 && input.maxIdsPerVerifyCall > 0
      ? Math.ceil(input.verifyIdCount / input.maxIdsPerVerifyCall)
      : 0;
  return {
    searchCalls,
    units: searchCalls * SEARCH_CALL_UNITS + verifyCalls * VIDEOS_LIST_UNITS,
  };
}

/**
 * 실행 허용 판정. **먼저 걸리는 버킷을 알려준다** — 운영자에게 "search 콜이 12개
 * 남아 8명만 됩니다"라고 말할 수 있어야 안내가 쓸모 있다.
 */
export function decideQuota(usage: QuotaUsage, estimate: QuotaEstimate): QuotaDecision {
  const left = remainingQuota(usage);
  if (estimate.searchCalls > left.searchCalls) {
    return {
      status: "denied",
      bucket: "search",
      remaining: left.searchCalls,
      needed: estimate.searchCalls,
    };
  }
  if (estimate.units > left.units) {
    return { status: "denied", bucket: "units", remaining: left.units, needed: estimate.units };
  }
  return { status: "allowed" };
}

/**
 * 남은 search 콜로 몇 개 슬롯까지 소싱할 수 있는가 — 확인 다이얼로그의 안내용.
 * 캐시 적중 슬롯은 검색을 안 쓰므로 언제나 처리 가능하다.
 */
export function affordableSlots(usage: QuotaUsage, cachedSlots: number): number {
  return remainingQuota(usage).searchCalls + Math.max(0, cachedSlots);
}

/**
 * 쿼터 카운터 문서 id — **태평양시** 날짜(YYYY-MM-DD).
 * Google 리셋 기준이 PT라, KST(kstDate)를 쓰면 매일 16~17시간 어긋난다.
 */
export function ptDate(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Los_Angeles",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}
