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
import { buildAlertDetail, evaluateAnomalies } from "../_ranking/anomalyRules";
import type {
  AnomalyTag,
  ContestantTally,
  RankingEntry,
  RankingSnapshot,
} from "../_ranking/rankingTypes";

/** Tags whose alerts are deduped while unresolved (state, not event). */
export const PERSISTENT_TAGS: readonly AnomalyTag[] = ["T-1", "T-2"];

export interface RankingUpdateInput {
  tournamentId: string;
  tallies: ContestantTally[];
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
  rankings: RankingEntry[];
  totalVotes: number;
  anomalies: AnomalyTag[];
  anomalyDetail: string | null;
  generationSequence: number;
  alertActions: AlertAction[];
}

export function buildRankingUpdate(input: RankingUpdateInput): RankingUpdate {
  const rankings = computeRankings(input.tallies);
  const totalVotes = rankings.reduce((sum, e) => sum + e.voteCount, 0);
  const generationSequence = input.prevCache
    ? input.prevCache.generationSequence + 1
    : 0;

  const current: RankingSnapshot = {
    tournamentId: input.tournamentId,
    rankings,
    totalVotes,
    anomalies: [],
    generationSequence,
  };

  // history1 (T-4, 1h ago) IS the previous live cache — no extra read.
  const anomalies = evaluateAnomalies(current, input.prevCache, input.history24);

  const open = new Set(input.existingUnresolvedTags);
  const alertActions: AlertAction[] = anomalies.map((tag) => {
    const detail = buildAlertDetail(tag, current, input.prevCache, input.history24);
    const isPersistent = PERSISTENT_TAGS.includes(tag);
    return { type: tag, detail, create: !(isPersistent && open.has(tag)) };
  });

  const anomalyDetail = anomalies.length
    ? buildAlertDetail(anomalies[0], current, input.prevCache, input.history24)
    : null;

  return {
    rankings,
    totalVotes,
    anomalies,
    anomalyDetail,
    generationSequence,
    alertActions,
  };
}
