/**
 * lib/ranking/anomalyRules — T-1 / T-2 / T-3 / T-4 anomaly evaluation (handoff §7).
 *
 * Pure & total — operates only on {@link RankingSnapshot} arrays (no Timestamp,
 * no Firestore), so it is node-env vitest TDD'd and mirrored into
 * functions/src/_ranking for the cron.
 *
 *   T-1  #1 rate ≥ 60%                         (bot/organized-vote signal)
 *   T-2  #1−#2 rate gap ≥ 30%p                 (abnormal dominance)
 *   T-3  #1 voteCount +200% (×3) over 24h ago  (needs history24; null → skip)
 *   T-4  a top-2 contestant was rank ≥ 3 1h ago (needs history1; null → skip)
 *
 * Missing-history skips are INTENDED (handoff §9 trap #5) — a young Tournament
 * has no 24h / 1h baseline, so T-3/T-4 return false rather than false-positive.
 */
import type { AnomalyTag, RankingSnapshot } from "./rankingTypes";

const T1_RATE = 60;
const T2_GAP = 30;
const T3_GROWTH = 2.0;

export function checkT1(current: RankingSnapshot): boolean {
  if (current.rankings.length === 0) return false;
  return current.rankings[0].rate >= T1_RATE;
}

export function checkT2(current: RankingSnapshot): boolean {
  if (current.rankings.length < 2) return false;
  return current.rankings[0].rate - current.rankings[1].rate >= T2_GAP;
}

export function checkT3(
  current: RankingSnapshot,
  history24: RankingSnapshot | null,
): boolean {
  if (!history24 || current.rankings.length === 0) return false;
  const top = current.rankings[0];
  const old = history24.rankings.find((r) => r.contestantId === top.contestantId);
  if (!old || old.voteCount === 0) return false;
  const growth = (top.voteCount - old.voteCount) / old.voteCount;
  return growth >= T3_GROWTH;
}

export function checkT4(
  current: RankingSnapshot,
  history1: RankingSnapshot | null,
): boolean {
  if (!history1 || current.rankings.length < 2) return false;
  const top2 = current.rankings.slice(0, 2);
  for (const entry of top2) {
    const prev = history1.rankings.find((r) => r.contestantId === entry.contestantId);
    if (prev && prev.rank >= 3) return true;
  }
  return false;
}

export function evaluateAnomalies(
  current: RankingSnapshot,
  history1: RankingSnapshot | null,
  history24: RankingSnapshot | null,
): AnomalyTag[] {
  const tags: AnomalyTag[] = [];
  if (checkT1(current)) tags.push("T-1");
  if (checkT2(current)) tags.push("T-2");
  if (checkT3(current, history24)) tags.push("T-3");
  if (checkT4(current, history1)) tags.push("T-4");
  return tags;
}

/**
 * Human-readable detail for `admin_alerts.detail` — ADMIN-ONLY (W-2, ADR-0006
 * amendment). This NEVER reaches the Voter surface; ranking_cache no longer
 * carries an anomalyDetail. Assumes the tag's precondition already held (caller
 * fired it).
 */
export function buildAlertDetail(
  tag: AnomalyTag,
  current: RankingSnapshot,
  history1: RankingSnapshot | null,
  history24: RankingSnapshot | null,
): string {
  const top = current.rankings[0];
  switch (tag) {
    case "T-1":
      return `#1 ${top.name} at ${top.rate}% (≥60% threshold)`;
    case "T-2": {
      const gap = top.rate - current.rankings[1].rate;
      return `#1 lead margin ${gap.toFixed(1)}%p over #2`;
    }
    case "T-3": {
      const old = history24?.rankings.find((r) => r.contestantId === top.contestantId);
      const growth = old && old.voteCount > 0
        ? (top.voteCount - old.voteCount) / old.voteCount
        : 0;
      return `#1 ${top.name} +${(growth * 100).toFixed(0)}% in 24h`;
    }
    case "T-4": {
      const jumped = current.rankings.slice(0, 2).find((entry) => {
        const prev = history1?.rankings.find((r) => r.contestantId === entry.contestantId);
        return prev && prev.rank >= 3;
      });
      const prev = history1?.rankings.find((r) => r.contestantId === jumped?.contestantId);
      return `${jumped?.name ?? "#?"} jumped rank ${prev?.rank ?? "?"}→${jumped?.rank ?? "?"}`;
    }
  }
}
