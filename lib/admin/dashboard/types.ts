/**
 * G-1 Admin Dashboard — client/wire type contract (handoff §3).
 *
 * The two callables (getAdminKpis · listAdminAlerts) return JSON, so timestamps
 * cross the wire as plain `...Ms` numbers. `KpiSnapshot` here MUST be kept
 * structurally identical to `functions/src/core/buildAdminKpis.ts` BY HAND — the
 * two packages can't share an import (separate tsconfig rootDirs, same reason
 * copy-ranking.mjs exists), so there is NO compile-time link: the client casts
 * the callable result via `httpsCallable<unknown, KpiSnapshot>`. A producer-side
 * rename therefore fails silently (a card reads `undefined`), so any change to
 * buildAdminKpis's output shape must be mirrored here in the same PR.
 *
 * NOTE on `AdminAlert`: the RAW Firestore doc shape already lives in
 * `lib/ranking/rankingTypes.ts` (written by C-3's scheduleRankingCache). We do
 * NOT redefine it (CLAUDE.md IMMUTABLE TERMINOLOGY). `AdminAlertView` below is
 * the DISTINCT UI projection — raw `type` (T-1..T-4) mapped to a display
 * `severity`, Timestamp flattened to `createdAtMs`, doc id attached.
 */

// ── KPI snapshot (getAdminKpis) — mirror of buildAdminKpis.ts ──────────────
export type DeltaDir = "up" | "down" | "flat";

export interface KpiMetric {
  value: number;
  deltaPct: number | null;
  deltaAbs: number | null;
  dir: DeltaDir;
}

export interface RoundDistribution {
  round: number;
  count: number;
}

export interface RoundStatus {
  activeCount: number;
  distribution: RoundDistribution[];
  nextDeadlineMs: number | null;
}

export interface ChartPoint {
  hourMs: number;
  votes: number;
}

export interface VoteChart {
  series: ChartPoint[];
  total24h: number;
  peakHourMs: number | null;
  peakVotes: number;
  nowRate: number;
}

export interface KpiSnapshot {
  totalVotes: KpiMetric;
  activeVoters: KpiMetric;
  voteSpeed: KpiMetric;
  abuseWarnings: KpiMetric;
  roundStatus: RoundStatus;
  chart: VoteChart;
  generatedAtMs: number;
}

// ── Alerts (listAdminAlerts) ───────────────────────────────────────────────
export type AlertSeverity = "high" | "medium" | "low" | "dismissed";

/**
 * Raw doc as it arrives over the wire from listAdminAlerts (Timestamp already
 * flattened to `createdAtMs`, doc `id` attached). `severity` is optional —
 * C-3's anomaly docs (T-1..T-4) don't carry one; the admin seed + future abuse
 * alerts may set it explicitly to override the type→severity default.
 */
export interface RawAdminAlert {
  id: string;
  type: string; // "T-1".."T-4" today; future abuse/rate-limit types later
  detail: string;
  tournamentId: string;
  createdAtMs: number;
  resolved: boolean;
  severity?: AlertSeverity;
}

/** The normalized, display-ready alert the AlertList renders. */
export interface AdminAlertView {
  id: string;
  type: string;
  severity: AlertSeverity;
  detail: string;
  tournamentId: string;
  createdAtMs: number;
}
