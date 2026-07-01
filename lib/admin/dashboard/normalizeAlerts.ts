/**
 * normalizeAlerts — raw admin_alerts docs → display-ready AdminAlertView[].
 *
 * The wire docs come from two producers that will never fully agree:
 *   - C-3 scheduleRankingCache writes anomaly docs typed T-1..T-4, NO severity.
 *   - the admin seed (+ future abuse/rate-limit alerts) set `severity` directly.
 * So severity is derived: resolved always wins (→ dismissed), then an explicit
 * `severity`, then the anomaly-type default (handoff §6.6 — T-1/T-2 are ranking
 * margin = medium; T-3 a +200% spike = high; T-4 a mild rank jump = low).
 */
import type {
  AdminAlertView,
  AlertSeverity,
  RawAdminAlert,
} from "./types";

const DAY_MS = 24 * 60 * 60 * 1000;

/** Anomaly-tag → default severity (handoff §6.6). */
const TYPE_SEVERITY: Record<string, AlertSeverity> = {
  "T-1": "medium",
  "T-2": "medium",
  "T-3": "high",
  "T-4": "low",
};

const SEVERITY_ORDER: Record<AlertSeverity, number> = {
  high: 0,
  medium: 1,
  low: 2,
  dismissed: 3,
};

function severityOf(doc: RawAdminAlert): AlertSeverity {
  if (doc.resolved) return "dismissed";
  if (doc.severity) return doc.severity;
  return TYPE_SEVERITY[doc.type] ?? "medium";
}

export function normalizeAlerts(
  docs: RawAdminAlert[],
  now: number,
): AdminAlertView[] {
  const seen = new Set<string>();
  const views: AdminAlertView[] = [];

  for (const doc of docs) {
    if (seen.has(doc.id)) continue; // dedup by id — first wins
    seen.add(doc.id);

    const severity = severityOf(doc);
    // Dismissed alerts auto-hide after 24h (handoff §6.6).
    if (severity === "dismissed" && now - doc.createdAtMs > DAY_MS) continue;

    views.push({
      id: doc.id,
      type: doc.type,
      severity,
      detail: doc.detail,
      tournamentId: doc.tournamentId,
      createdAtMs: doc.createdAtMs,
    });
  }

  return views.sort((a, b) => {
    const bySev = SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity];
    return bySev !== 0 ? bySev : b.createdAtMs - a.createdAtMs; // newest first
  });
}
