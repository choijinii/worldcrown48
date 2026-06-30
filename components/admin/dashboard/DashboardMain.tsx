/**
 * DashboardMain — the right-hand column (handoff §6.1).
 *
 * Header (crumb + sync indicator + manual ↻) + KPICards + two-col
 * (VoteSpeedChart · AlertList). Owns the data hooks (useKpis / useAlerts) and
 * threads their state down. VoteSpeedChart is dynamically imported with
 * { ssr: false } so Recharts never touches `window` during SSR (trap #6).
 *
 * Sync indicator is a neutral "Synced" dot — NOT a "LIVE" badge and NOT
 * "Realtime DB" (handoff §5 DON'T + lite-spec correction ⑤).
 */
"use client";

import dynamic from "next/dynamic";
import { useI18n } from "@/lib/i18n";
import type { Lang } from "@/lib/cookieConsent";
import { useKpis } from "@/lib/admin/dashboard/useKpis";
import { useAlerts } from "@/lib/admin/dashboard/useAlerts";
import { KPICards } from "./KPICards";
import { AlertList } from "./AlertList";

const VoteSpeedChart = dynamic(
  () => import("./VoteSpeedChart").then((m) => m.VoteSpeedChart),
  {
    ssr: false,
    loading: () => (
      <div className="panel">
        <div className="chart-loading">
          <div className="chart-spinner" aria-hidden="true" />
        </div>
      </div>
    ),
  },
);

function strings(lang: Lang) {
  return lang === "ko"
    ? { crumb1: "Admin", crumb2: "대시보드", h1: "라이브 Tournament 관제.", synced: "동기화됨", stale: "동기화 지연", refresh: "새로고침" }
    : { crumb1: "Admin", crumb2: "Dashboard", h1: "Live tournament control.", synced: "Synced", stale: "Sync delayed", refresh: "Refresh" };
}

export function DashboardMain(): JSX.Element {
  const { lang } = useI18n();
  const t = strings(lang);
  const { data, status, refresh } = useKpis();
  const { alerts, dismissLocally } = useAlerts();

  const loading = status === "loading";
  const stale = status === "stale";

  return (
    <main className="main">
      <header className="main-top">
        <div>
          <div className="crumb">{t.crumb1} / <b>{t.crumb2}</b></div>
          <h1>{t.h1}</h1>
        </div>
        <div className="main-actions">
          <span className="live">
            <span className="dot" aria-hidden="true" /> {stale ? t.stale : t.synced}
          </span>
          <button
            className="refresh-btn"
            type="button"
            onClick={refresh}
            aria-label={t.refresh}
            aria-busy={loading}
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M21 12a9 9 0 1 1-2.64-6.36" /><polyline points="21 3 21 9 15 9" />
            </svg>
          </button>
        </div>
      </header>

      <KPICards data={data} stale={stale} loading={loading} />

      <div className="two-col">
        <VoteSpeedChart chart={data?.chart ?? null} />
        <AlertList alerts={alerts} onDismiss={dismissLocally} />
      </div>
    </main>
  );
}
