/**
 * lib/ranking — type contract for the C-3 ranking cache + anomaly detection.
 *
 * IMPORT-FREE BY DESIGN: this module references neither the firebase client SDK
 * nor firebase-admin. The pure rank/anomaly logic is mirrored into
 * `functions/src/_ranking` by `functions/scripts/copy-ranking.mjs` at build time
 * (same single-source pattern as copy-crown — handoff §3 "중복 구현 금지"), and
 * the functions package cannot import the `firebase/firestore` client `Timestamp`.
 * So persisted timestamp fields use the structural {@link TimestampLike} below,
 * which BOTH the admin and client `Timestamp` satisfy structurally.
 *
 * Vote Count rule (CLAUDE.md 원칙 #8): `voteCount` is INTERNAL only. It feeds the
 * cron's rate math / T-3 growth / admin alert detail — it is NEVER rendered.
 */

export type AnomalyTag = "T-1" | "T-2" | "T-3" | "T-4";

/** A single contestant's ranking row (denormalized — no contestants join at UI). */
export interface RankingEntry {
  /** 1-based rank. Ties share a rank, the next rank is skipped (1·1·3). */
  rank: number;
  contestantId: string;
  /** Tournament-time denormalization so the UI needs no contestants read. */
  name: string;
  imageUrl: string | null;
  /**
   * INTERNAL ONLY — NEVER render (Vote Count 금지). Used by the cron for rate
   * math, T-3 growth, and admin_alerts detail.
   */
  voteCount: number;
  /** 1-decimal percent share of totalVotes. e.g. 33.3 → rendered "33.3%". */
  rate: number;
}

/**
 * Timestamp-free core shape consumed by the pure rank/anomaly functions.
 * `RankingCache` extends it with the persisted timestamps; the pure logic only
 * touches `rankings` / `generationSequence`, so it operates on this narrow type.
 */
export interface RankingSnapshot {
  tournamentId: string;
  /** 1위~N위. voteCount === 0 contestants are EXCLUDED. */
  rankings: RankingEntry[];
  /** INTERNAL ONLY — UI never renders. T-1/T-2 rate-share verification. */
  totalVotes: number;
  /** 0-based, +1 per cron run. T-24 compares (seq-24), T-1h compares (seq-1). */
  generationSequence: number;
}

/**
 * Structural timestamp — satisfied by firebase-admin AND firebase client
 * `Timestamp` alike. Keeps shared pure code free of any SDK import.
 */
export interface TimestampLike {
  toMillis(): number;
  toDate(): Date;
}

/**
 * Persisted `ranking_cache/{tournamentId}` document (UI subscribes via onSnapshot).
 *
 * PURE VOTER DATA ONLY (ADR-0006 amendment, 2026-06-26 / W-2): rankings + meta.
 * It carries NO anomaly signal — a legitimate ≥60% popular #1 must never read as
 * an "이상 징후" on the Voter surface. Anomaly tags/details live ONLY in the
 * admin-only `admin_alerts` collection ({@link AdminAlert}).
 */
export interface RankingCache extends RankingSnapshot {
  generatedAt: TimestampLike;
  /** Previous generation time. First run is null. */
  previousGeneratedAt: TimestampLike | null;
}

/** Per-contestant tally fed into {@link computeRankings} (one per >0-vote contestant). */
export interface ContestantTally {
  contestantId: string;
  name: string;
  imageUrl: string | null;
  voteCount: number;
}

/** `admin_alerts/{alertId}` — created by the cron when an anomaly fires. */
export interface AdminAlert {
  type: AnomalyTag;
  tournamentId: string;
  /** One-line for the Admin Dashboard — wireframe line 767 pattern. */
  detail: string;
  createdAt: TimestampLike;
  /** Set true once the operator handles it. */
  resolved: boolean;
}
