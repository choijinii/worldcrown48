/**
 * scheduleRankingCacheCore — the cron's PURE decision (handoff §6, §7, §9 trap #8).
 *
 * Given a Tournament's tallies + its previous cache (= 1h-ago snapshot, the T-4
 * baseline) + the 24-generations-ago cache (the T-3 baseline) + the set of
 * already-open unresolved persistent alerts, it produces the next cache fields
 * and the admin_alerts actions. All Firestore I/O and Timestamps live in the
 * thin wrapper (scheduleRankingCache.ts); this stays pure → node-env vitest.
 *
 * Dedup (trap #8): T-1/T-2 are STATE-like (a dominance level persists across
 * runs) → if one is already open & unresolved, refresh it instead of spamming a
 * new doc. T-3/T-4 are transient EVENTS (a spike / a jump happened this hour) →
 * always a fresh alert.
 */
import { computeRankings } from "../_ranking/computeRankings";
import { computeCrownRankings } from "../_ranking/crownRankings";
import type { RunsTally } from "../_ranking/tallyRuns";
import { buildAlertDetail, evaluateAnomalies } from "../_ranking/anomalyRules";
import type {
  AnomalyTag,
  ContestantTally,
  CrownRankingEntry,
  RankingSnapshot,
} from "../_ranking/rankingTypes";

/** Tags whose alerts are deduped while unresolved (state, not event). */
export const PERSISTENT_TAGS: readonly AnomalyTag[] = ["T-1", "T-2"];

export interface RankingUpdateInput {
  tournamentId: string;
  tallies: ContestantTally[];
  /**
   * 판 단위 집계 (Crown Score의 재료 · 정본 §2~§4). 크론이 같은 `votes` 한 번 읽은 것으로
   * `tallyRuns` 를 돌려 만든다 — 추가 읽기는 없다.
   */
  runs: RunsTally;
  /** Live ranking_cache doc before this run (null on first run). Also the T-4 baseline. */
  prevCache: RankingSnapshot | null;
  /** Cache from 24 generations ago (null when < 24 generations exist). T-3 baseline. */
  history24: RankingSnapshot | null;
  /** Persistent tags (T-1/T-2) already open & unresolved for this Tournament. */
  existingUnresolvedTags: AnomalyTag[];
}

export interface AlertAction {
  type: AnomalyTag;
  detail: string;
  /** true → create a new admin_alerts doc; false → refresh the open one (dedup). */
  create: boolean;
}

export interface RankingUpdate {
  /** 차트 목록 — **Crown Score 순** (정본 §0). 화면이 그대로 그린다. */
  rankings: CrownRankingEntry[];
  totalVotes: number;
  /** 대회 전체 완주 판수(게스트 판 제외) — 10판 기준이 읽는 값 (정본 §5). */
  runsTotal: number;
  generationSequence: number;
  /**
   * The cron's admin_alerts actions (W-2). Anomaly signal lives ONLY here, never
   * on the persisted ranking_cache — the Voter surface stays pure (ADR-0006
   * amendment). `alertActions.map(a => a.type)` is the set of tags that fired.
   */
  alertActions: AlertAction[];
}

/**
 * 이상 징후가 보는 목록 — **선택 수(rate) 순** (대표 2026-09-24).
 *
 * 차트가 Crown Score 순으로 바뀌어도 T-1~T-4의 "#1"은 예전 뜻(선택 수 비중 1위)을
 * 유지해야 한다. 그러지 않으면 정렬 기준을 바꾼 것만으로 관리자 경보의 발동 기준이
 * 조용히 달라진다.
 *
 * 저장된 캐시(직전 세대·24시간 전)도 같은 함수를 통과시킨다 — 기준선과 현재가 서로 다른
 * 정렬로 비교되면 T-4(`prev.rank >= 3`)가 뜻 없는 값을 읽는다. `rate`·`voteCount` 는
 * 모든 세대의 행에 그대로 실려 있으므로 저장된 문서만으로 다시 세울 수 있다.
 */
export function toRateOrdered(
  snapshot: RankingSnapshot | null,
): RankingSnapshot | null {
  if (!snapshot) return null;
  return {
    ...snapshot,
    rankings: computeRankings(
      snapshot.rankings.map((e) => ({
        contestantId: e.contestantId,
        name: e.name,
        videoId: e.videoId,
        voteCount: e.voteCount,
      })),
    ),
  };
}

export function buildRankingUpdate(input: RankingUpdateInput): RankingUpdate {
  // 차트 = Crown Score 순. 구성원은 옛 목록과 같다(voteCount 0 제외).
  const rankings = computeCrownRankings(input.tallies, input.runs);
  const totalVotes = rankings.reduce((sum, e) => sum + e.voteCount, 0);
  const generationSequence = input.prevCache
    ? input.prevCache.generationSequence + 1
    : 0;

  const current: RankingSnapshot = {
    tournamentId: input.tournamentId,
    rankings,
    totalVotes,
    generationSequence,
  };

  // Anomaly evaluation STILL runs (W-2) — but only to feed admin_alerts, never
  // the cache. history1 (T-4, 1h ago) IS the previous live cache — no extra read.
  // 판정 입력은 셋 다 rate 순으로 되돌린다 (위 toRateOrdered 주석).
  const rateCurrent = toRateOrdered(current)!;
  const ratePrev = toRateOrdered(input.prevCache);
  const rateHistory24 = toRateOrdered(input.history24);
  const anomalies = evaluateAnomalies(rateCurrent, ratePrev, rateHistory24);

  const open = new Set(input.existingUnresolvedTags);
  const alertActions: AlertAction[] = anomalies.map((tag) => {
    const detail = buildAlertDetail(tag, rateCurrent, ratePrev, rateHistory24);
    const isPersistent = PERSISTENT_TAGS.includes(tag);
    return { type: tag, detail, create: !(isPersistent && open.has(tag)) };
  });

  return {
    rankings,
    totalVotes,
    runsTotal: input.runs.runsTotal,
    generationSequence,
    alertActions,
  };
}
