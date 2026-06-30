/**
 * AlertList — abuse/anomaly feed (handoff §4.4, §6.6).
 *
 * Data from useAlerts (60s poll → normalizeAlerts). Severity tints high/medium/
 * low/dismissed. Dismiss is UI-only this PR (handoff §5 DON'T — backend write
 * callable is a later PR); it flips the row to dismissed locally + emits the
 * analytics event. Empty → "All clear". "Mark all read" is a stub.
 */
"use client";

import { track } from "@/lib/analytics";
import { useI18n } from "@/lib/i18n";
import type { Lang } from "@/lib/cookieConsent";
import { relativeAge, type RelativeAge } from "@/lib/admin/dashboard/formatKpi";
import type { AdminAlertView, AlertSeverity } from "@/lib/admin/dashboard/types";

function strings(lang: Lang) {
  const ko = {
    title: "어뷰징 알림",
    side: "admin_alerts",
    markAll: "모두 읽음",
    investigate: "조사",
    dismiss: "무시",
    emptyTitle: "이상 없음",
    emptySub: "활성 알림이 없습니다",
    sev: { high: "높음", medium: "중간", low: "낮음", dismissed: "처리됨" } as Record<AlertSeverity, string>,
    typeLabel: "랭킹 이상 징후",
    ago: (a: RelativeAge) =>
      a.unit === "now" ? "방금 전"
        : a.unit === "minute" ? `${a.value}분 전`
        : a.unit === "hour" ? `${a.value}시간 전`
        : `${a.value}일 전`,
  };
  const en = {
    title: "Abuse alerts",
    side: "admin_alerts",
    markAll: "Mark all read",
    investigate: "Investigate",
    dismiss: "Dismiss",
    emptyTitle: "All clear",
    emptySub: "No active alerts",
    sev: { high: "HIGH", medium: "MEDIUM", low: "LOW", dismissed: "DISMISSED" } as Record<AlertSeverity, string>,
    typeLabel: "Ranking anomaly",
    ago: (a: RelativeAge) =>
      a.unit === "now" ? "just now"
        : a.unit === "minute" ? `${a.value} min ago`
        : a.unit === "hour" ? `${a.value} h ago`
        : `${a.value} d ago`,
  };
  return lang === "ko" ? ko : en;
}

interface AlertListProps {
  alerts: AdminAlertView[];
  onDismiss: (id: string) => void;
}

export function AlertList({ alerts, onDismiss }: AlertListProps): JSX.Element {
  const { lang } = useI18n();
  const t = strings(lang);
  const now = Date.now();
  const isEmpty = alerts.length === 0;

  function handleDismiss(id: string) {
    onDismiss(id);
    void track("admin_alert_action", { alertId: id, action: "dismiss" });
  }
  function handleInvestigate(id: string) {
    void track("admin_alert_action", { alertId: id, action: "investigate" });
  }

  return (
    <div className="panel" data-alerts={isEmpty ? "none" : "mixed"}>
      <div className="panel-head">
        <h2>
          {t.title} <span className="h-side">{t.side}</span>
        </h2>
        <button className="ph-btn" type="button">{t.markAll}</button>
      </div>

      {isEmpty ? (
        <div className="alerts-empty">
          <div className="ae-ok" aria-hidden="true">✓</div>
          <div className="ae-title">{t.emptyTitle}</div>
          <div className="ae-sub">{t.emptySub}</div>
        </div>
      ) : (
        <div className="alerts-stack">
          {alerts.map((a) => (
            <article className="alert" data-sev={a.severity} key={a.id}>
              <div className="alert-ico" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 3l9 16H3z" /><line x1="12" y1="10" x2="12" y2="14" /><circle cx="12" cy="17" r="0.8" fill="currentColor" />
                </svg>
              </div>
              <div className="alert-body">
                <div className="alert-key">
                  <span className="ak-sev">{t.sev[a.severity]}</span> · {a.type} · {t.ago(relativeAge(a.createdAtMs, now))}
                </div>
                <div className="alert-title">{t.typeLabel}</div>
                <div className="alert-desc">{a.detail}</div>
              </div>
              {a.severity !== "dismissed" && (
                <div className="alert-actions">
                  <button className="alert-btn primary" type="button" onClick={() => handleInvestigate(a.id)}>
                    {t.investigate}
                  </button>
                  <button className="alert-btn" type="button" onClick={() => handleDismiss(a.id)}>
                    {t.dismiss}
                  </button>
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
