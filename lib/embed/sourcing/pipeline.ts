/**
 * pipeline — 자동 영상 소싱의 순수 오케스트레이션 (LAB-EV-2 §5 A).
 *
 * 네트워크·Firestore·모델은 전부 `SourcingDeps`로 주입된다. 그래서 모의 API만으로
 * 캐시 적중/미적중·쿼터 거부·3회 실패·중복 회피·0건(실존 의심) 전 경로를 덮는다.
 *
 * 순서가 곧 비용 설계다 (search 버킷이 하루 100콜뿐이다 — quota.ts 머리말):
 *   ① 캐시 조회      — 적중분은 search.list를 아예 부르지 않는다
 *   ② **쿼터 예약**   — R4 "할당량 가드는 실행 전에". API를 한 번도 부르기 전이다
 *   ③ 검색          — 미적중 슬롯만, 슬롯당 1콜, 후보 15개를 통째로 캐시에 넣는다
 *   ④ 관련성(규칙)   — 제목·채널만 보면 되므로 API 0콜
 *   ⑤ 관련성(AI)     — 규칙이 못 가른 것만 배치 1콜
 *   ⑥ 검증          — 상위 3후보만 모아 videos.list 배치(50개/콜, LAB-EV-1 재사용)
 *   ⑦ 배정          — 차단 아닌 첫 후보. 같은 배치·같은 토너먼트 중복은 건너뛴다
 *   ⑧ 정산          — 예약 상한과 실사용의 차이를 되돌린다(§7 Cloud Console 대조)
 *
 * R5: 실패는 **슬롯 단위로 격리**한다. 검색 하나가 죽어도 나머지 7개는 채워진다.
 */
import { MAX_VIDEOS_PER_CALL } from "../constants";
import { heuristicStartSec } from "../killingPart";
import type { LinkVerdict } from "../verdict";
import {
  buildSearchQuery,
  searchCacheKey,
  SEARCH_MAX_RESULTS,
} from "./searchQuery";
import { judgeRelevance, type AmbiguousItem } from "./relevance";
import {
  CANDIDATE_ATTEMPTS,
  estimateSourcingQuota,
  type QuotaEstimate,
} from "./quota";
import type {
  SearchCandidate,
  SourcingBatchSummary,
  SourcingFailureReason,
  SourcingResult,
  SourcingTarget,
} from "./types";

/**
 * 콜러블 1회가 받는 슬롯 수 상한 (R5 — 60s 타임아웃 안전).
 *
 * 예산: 검색 8콜 병렬(~1s) + videos.list 1콜(~0.4s) + 애매분 Haiku 1콜(~4s) ≈ 6s.
 * 클라이언트가 이 크기로 잘라 순차 호출하며 진행률을 그린다. 부분 실패는 배치
 * 단위로 격리되므로 8명을 잃어도 나머지 40명은 남는다.
 */
export const MAX_BATCH_TARGETS = 8;

/** 캐시에 새로 넣을 항목. */
export interface CacheWrite {
  key: string;
  /** 원본 검색어 — 해시 충돌 진단용(searchCacheKey 머리말). */
  query: string;
  candidates: SearchCandidate[];
}

export interface SourcingDeps {
  /** search.list — type=video&videoEmbeddable=true&videoSyndicated=true. */
  search(query: string, maxResults: number): Promise<SearchCandidate[]>;
  /** videos.list 배치 검증 — LAB-EV-1 inspectLinks를 그대로 쓴다(R3). */
  verify(videoIds: string[]): Promise<LinkVerdict[]>;
  /**
   * 신선한(TTL 이내) 후보 목록만 돌려준다. 만료는 미적중과 같다.
   * 시계는 파이프라인이 준다(`nowMs`) — 어댑터가 제 시계를 들면 테스트에서
   * TTL 경계를 못 민다.
   */
  readCache(keys: string[], nowMs: number): Promise<Map<string, SearchCandidate[]>>;
  writeCache(entries: CacheWrite[], nowMs: number): Promise<void>;
  /** 규칙이 못 가른 짝의 판정. 없으면 ambiguous는 전부 탈락 처리한다. */
  judgeAmbiguous?(items: AmbiguousItem[]): Promise<Map<string, boolean>>;
  /** 쿼터 예약 — 초과면 던진다(트랜잭션). 이 함수가 통과해야 API를 부른다. */
  reserveQuota(estimate: QuotaEstimate): Promise<void>;
  /** 예약분과 실사용의 차이를 되돌린다(음수 delta). 없으면 예약분이 그대로 남는다. */
  settleQuota?(delta: QuotaEstimate): Promise<void>;
  logInfo?(message: string): void;
}

export interface SourcingInput {
  targets: SourcingTarget[];
  /** STEP 1의 키워드 — 힌트가 빈 슬롯의 검색어 조립에만 쓴다. */
  categoryKeywords?: readonly string[];
  /** 이 토너먼트가 이미 쓰고 있는 videoId — 중복 회피(DoD). */
  excludeVideoIds?: readonly string[];
  /** [새 영상 찾기] — 캐시를 건너뛰고 새로 검색한다(DoD "캐시 우회 재검색 1회"). */
  bypassCache?: boolean;
  /** 캐시 신선도 판정 기준 시각. */
  nowMs: number;
}

interface Plan {
  target: SourcingTarget;
  query: string;
  cacheKey: string;
  candidates: SearchCandidate[];
  cacheHit: boolean;
  /** 검색 자체가 실패한 슬롯 — 후보 없이 바로 manual로 간다. */
  failed?: SourcingFailureReason;
  /** 규칙 통과 + AI 통과 후보를 검색 순서대로 (최대 CANDIDATE_ATTEMPTS). */
  attempts: SearchCandidate[];
  ambiguous: number;
}

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

function failure(
  target: SourcingTarget,
  reason: SourcingFailureReason,
  extra: { attempted?: number; cacheHit?: boolean; ambiguous?: number } = {},
): SourcingResult {
  return {
    index: target.index,
    // 검색 0건은 "영상이 없다"가 아니라 대개 "그런 인물이 없다"다(§1 결정 ⑤).
    status: reason === "no-results" ? "unknown-person" : "manual",
    reason,
    attempted: extra.attempted ?? 0,
    cacheHit: extra.cacheHit ?? false,
    ambiguous: extra.ambiguous ?? 0,
  };
}

/**
 * 배치 1회. 콜러블이 ≤8명씩 잘라 부르고(R5 · 60s 타임아웃 안전), 클라이언트가
 * 순차 호출하며 진행률을 그린다.
 */
export async function sourceBatch(
  input: SourcingInput,
  deps: SourcingDeps,
): Promise<SourcingBatchSummary> {
  const nowMs = input.nowMs;
  const plans: Plan[] = input.targets.map((target) => ({
    target,
    query: buildSearchQuery(target, input.categoryKeywords ?? []),
    cacheKey: "",
    candidates: [],
    cacheHit: false,
    attempts: [],
    ambiguous: 0,
  }));
  for (const plan of plans) {
    plan.cacheKey = plan.query ? searchCacheKey(plan.query) : "";
  }

  // ① 캐시 — 적중분은 search 버킷을 건드리지 않는다.
  const searchable = plans.filter((p) => p.query !== "");
  if (!input.bypassCache && searchable.length > 0) {
    const cached = await deps.readCache(
      Array.from(new Set(searchable.map((p) => p.cacheKey))),
      nowMs,
    );
    for (const plan of searchable) {
      const hit = cached.get(plan.cacheKey);
      if (hit && hit.length > 0) {
        plan.candidates = hit;
        plan.cacheHit = true;
      }
    }
  }

  const misses = searchable.filter((p) => !p.cacheHit);

  // ② 쿼터 예약 — **API를 한 번도 부르기 전**(R4). 상한으로 잡고 ⑧에서 되돌린다.
  const reserved = estimateSourcingQuota({
    searchesNeeded: misses.length,
    verifyIdCount: searchable.length * CANDIDATE_ATTEMPTS,
    maxIdsPerVerifyCall: MAX_VIDEOS_PER_CALL,
  });
  await deps.reserveQuota(reserved);

  // ③ 검색 — 슬롯당 1콜. 실패는 그 슬롯에만 남긴다(R5).
  let searchCallsSpent = 0;
  if (misses.length > 0) {
    await Promise.all(
      misses.map(async (plan) => {
        // 실패해도 콜은 소비된다 — "All API requests, including invalid requests,
        // incur at least a one-point quota cost"(Google 문서). 그래서 먼저 센다.
        searchCallsSpent += 1;
        try {
          plan.candidates = await deps.search(plan.query, SEARCH_MAX_RESULTS);
        } catch {
          plan.failed = "search-failed";
          plan.candidates = [];
        }
      }),
    );
    const writes = misses
      .filter((p) => !p.failed && p.candidates.length > 0)
      .map((p) => ({ key: p.cacheKey, query: p.query, candidates: p.candidates }));
    if (writes.length > 0) await deps.writeCache(writes, nowMs);
  }

  // ④ 관련성(규칙) — API 0콜. 이미 쓰인 영상은 후보에서 미리 뺀다(중복 회피).
  const used = new Set(input.excludeVideoIds ?? []);
  const ambiguousItems: AmbiguousItem[] = [];
  const ambiguousByPlan = new Map<Plan, SearchCandidate[]>();

  for (const plan of plans) {
    if (plan.failed || plan.candidates.length === 0) continue;
    const fresh = plan.candidates.filter((c) => !used.has(c.videoId));
    const relevant: SearchCandidate[] = [];
    const maybe: SearchCandidate[] = [];

    for (const candidate of fresh) {
      if (relevant.length >= CANDIDATE_ATTEMPTS) break;
      const { verdict } = judgeRelevance(candidate, plan.target);
      if (verdict === "relevant") relevant.push(candidate);
      else if (verdict === "ambiguous" && maybe.length < CANDIDATE_ATTEMPTS) {
        maybe.push(candidate);
      }
    }

    plan.attempts = relevant;
    plan.ambiguous = maybe.length;
    // 규칙 통과분만으로 3후보가 안 차면 애매한 것들을 모델에 묻는다.
    if (relevant.length < CANDIDATE_ATTEMPTS && maybe.length > 0) {
      ambiguousByPlan.set(plan, maybe);
      for (const c of maybe) {
        ambiguousItems.push({
          key: `${plan.target.index}:${c.videoId}`,
          name: plan.target.name,
          searchHint: plan.target.searchHint ?? "",
          title: c.title,
          channelTitle: c.channelTitle,
        });
      }
    }
  }

  // ⑤ 관련성(AI) — 배치 1콜. 판정기가 없거나 실패하면 애매한 후보는 버린다(보수적).
  let aiJudged = 0;
  if (ambiguousItems.length > 0 && deps.judgeAmbiguous) {
    aiJudged = ambiguousItems.length;
    let judgments = new Map<string, boolean>();
    try {
      judgments = await deps.judgeAmbiguous(ambiguousItems);
    } catch {
      judgments = new Map();
    }
    for (const [plan, maybe] of Array.from(ambiguousByPlan.entries())) {
      for (const c of maybe) {
        if (plan.attempts.length >= CANDIDATE_ATTEMPTS) break;
        if (judgments.get(`${plan.target.index}:${c.videoId}`) === true) {
          plan.attempts.push(c);
        }
      }
    }
  }

  // ⑥ 검증 — 후보를 전부 모아 videos.list 배치(50개/콜). LAB-EV-1 재사용.
  const verifyIds = Array.from(
    new Set(plans.flatMap((p) => p.attempts.map((c) => c.videoId))),
  );
  const verdicts = new Map<string, LinkVerdict>();
  let verifyCallsSpent = 0;
  for (const batch of chunk(verifyIds, MAX_VIDEOS_PER_CALL)) {
    verifyCallsSpent += 1;
    for (const v of await deps.verify(batch)) verdicts.set(v.videoId, v);
  }

  // ⑦ 배정 — 차단 아닌 첫 후보. 앞선 슬롯이 가져간 영상은 건너뛴다.
  const results: SourcingResult[] = plans.map((plan) => {
    const { target } = plan;
    if (!plan.query) return failure(target, "no-results");
    if (plan.failed) return failure(target, plan.failed, { cacheHit: plan.cacheHit });
    if (plan.candidates.length === 0) {
      return failure(target, "no-results", { cacheHit: plan.cacheHit });
    }

    let attempted = 0;
    let skippedDuplicate = 0;
    for (const candidate of plan.attempts) {
      // 같은 배치의 앞선 슬롯이 이미 가져갔다 — 실패가 아니라 건너뛰기다.
      if (used.has(candidate.videoId)) {
        skippedDuplicate += 1;
        continue;
      }
      attempted += 1;
      const verdict = verdicts.get(candidate.videoId);
      if (!verdict || verdict.status === "blocked") continue;

      used.add(candidate.videoId);
      return {
        index: target.index,
        status: "suggested",
        verdict,
        // 정밀 킬링파트는 슬롯 미세조정에서 1클릭(LAB-EV-1 W2) — 여기서 48번 더
        // 부르면 commentThreads가 48유닛·48콜이고 60s 예산도 위태롭다.
        startSec: heuristicStartSec(verdict.durationSec),
        attempted,
        cacheHit: plan.cacheHit,
        ambiguous: plan.ambiguous,
      };
    }

    const reason: SourcingFailureReason =
      attempted > 0
        ? "all-blocked"
        : skippedDuplicate > 0
          ? "all-duplicate"
          : "not-relevant";
    return failure(target, reason, {
      attempted,
      cacheHit: plan.cacheHit,
      ambiguous: plan.ambiguous,
    });
  });

  // ⑧ 정산 — 상한으로 예약한 몫에서 안 쓴 만큼을 되돌린다.
  const spent = {
    searchCalls: searchCallsSpent,
    units: searchCallsSpent + verifyCallsSpent,
  };
  const delta: QuotaEstimate = {
    searchCalls: spent.searchCalls - reserved.searchCalls,
    units: spent.units - reserved.units,
  };
  if (deps.settleQuota && (delta.searchCalls !== 0 || delta.units !== 0)) {
    await deps.settleQuota(delta);
  }

  const cacheHits = plans.filter((p) => p.cacheHit).length;
  deps.logInfo?.(
    `sourceBatch: ${plans.length} slots → search.list ×${spent.searchCalls}` +
      ` (cache hit ${cacheHits}) · videos.list ×${verifyCallsSpent}` +
      ` · units ${spent.units} (reserved ${reserved.units}) · ai-judged ${aiJudged}`,
  );

  return { results, spent, reserved, cacheHits, aiJudged };
}
