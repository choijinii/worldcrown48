/**
 * KPICards — the five operator KPIs (handoff §4.2, §6.4, §6.5).
 *
 * Data comes from useKpis (60s poll). States: loaded · loading (shimmer
 * skeleton) · stale (STALE badge + muted). Vote Count is admin-internal only
 * (CLAUDE.md #8) — these values live solely on this operator-only surface.
 * Round Status shows round NAMES, never a Voter progress HUD (MENTAL_MODEL).
 */
"use client";

import { useI18n } from "@/lib/i18n";
import type { Lang } from "@/lib/cookieConsent";
import { deltaArrow, formatNumber } from "@/lib/admin/dashboard/formatKpi";
import type { KpiMetric, KpiSnapshot } from "@/lib/admin/dashboard/types";

const ROUND_NAMES: Record<number, string> = {
  1: "ROUND OF 48",
  2: "ROUND OF 24",
  3: "ROUND OF 12",
  4: "ROUND OF 6",
  5: "THE FINAL",
};

function strings(lang: Lang) {
  const ko = {
    totalVotes: "총 투표 수",
    activeVoters: "활성 Voter 수",
    voteSpeed: "투표 속도",
    abuseWarnings: "어뷰징 경고",
    roundStatus: "라운드 현황",
    totalDesc: "Vote Count는 운영자 전용 — Voter 화면에 절대 노출되지 않습니다.",
    activeDesc: "최근 1시간 내 투표한 유니크 Voter.",
    speedDesc: "60초 롤링 윈도우 · 데이터 동기화 중.",
    abuseDesc: "Rate-limit 발동 + 의심 계정 · 최근 1시간.",
    roundDesc: "진행 중인 Tournament의 라운드 분포.",
    vsYesterday: "어제 대비",
    vsHour: "1시간 대비",
    review: "즉시 검토",
    open: "건 미해결",
    stable: "안정",
    active: "active",
    perMin: "회/분",
    deadline: "마감",
    none: "—",
  };
  const en = {
    totalVotes: "Total Votes",
    activeVoters: "Active Voters",
    voteSpeed: "Vote Speed",
    abuseWarnings: "Abuse Warnings",
    roundStatus: "Round Status",
    totalDesc: "Vote Count is admin-internal only — never surfaced to Voters.",
    activeDesc: "Unique Voters who cast a Vote in the last 1 hour.",
    speedDesc: "60-second rolling window · syncing data.",
    abuseDesc: "Rate-limit hits + suspicious accounts · last 1 hour.",
    roundDesc: "Round distribution across active Tournaments.",
    vsYesterday: "vs yesterday",
    vsHour: "vs 1h",
    review: "review now",
    open: "open",
    stable: "stable",
    active: "active",
    perMin: "votes/min",
    deadline: "Deadline",
    none: "—",
  };
  return lang === "ko" ? ko : en;
}

function pctDelta(m: KpiMetric, suffix: string): JSX.Element {
  const pct = m.deltaPct;
  const text = pct === null ? "—" : `${deltaArrow(m.dir)} ${Math.abs(pct)}%`;
  return <span className={`kpi-delta ${m.dir}`}>{text} · {suffix}</span>;
}

interface KPICardsProps {
  data: KpiSnapshot | null;
  stale: boolean;
  loading: boolean;
}

export function KPICards({ data, stale, loading }: KPICardsProps): JSX.Element {
  const { lang } = useI18n();
  const t = strings(lang);
  const cls = `kpi${loading ? " is-loading" : ""}${stale ? " is-stale" : ""}`;
  const n = (v: number) => formatNumber(v, lang);

  const round = data?.roundStatus;
  const roundDist = round
    ? round.distribution
        .map((d) => `${d.count}× ${ROUND_NAMES[d.round] ?? `R${d.round}`}`)
        .join(" · ")
    : "";
  const deadline = round?.nextDeadlineMs
    ? new Date(round.nextDeadlineMs).toISOString().slice(0, 10).replace(/-/g, "·")
    : t.none;

  return (
    <div className="kpi-grid" data-testid="kpi-grid">
      {/* Total Votes */}
      <div className={cls} data-kpi="total_votes">
        <div className="kpi-label">
          <svg className="lk-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 13l4 4 10-10" /></svg>
          {t.totalVotes}
        </div>
        <div className="kpi-value">{data ? n(data.totalVotes.value) : "0"}</div>
        <div className="kpi-desc">{t.totalDesc}</div>
        {data && pctDelta(data.totalVotes, t.vsYesterday)}
      </div>

      {/* Active Voters */}
      <div className={cls} data-kpi="active_voters">
        <div className="kpi-label">
          <svg className="lk-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="9" cy="8" r="3" /><path d="M3 21v-1a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v1" /></svg>
          {t.activeVoters}
        </div>
        <div className="kpi-value">{data ? n(data.activeVoters.value) : "0"}</div>
        <div className="kpi-desc">{t.activeDesc}</div>
        {data && pctDelta(data.activeVoters, t.vsHour)}
      </div>

      {/* Vote Speed */}
      <div className={cls} data-kpi="vote_speed">
        <div className="kpi-label">
          <svg className="lk-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="3 12 8 12 11 5 14 19 17 12 22 12" /></svg>
          {t.voteSpeed}
        </div>
        <div className="kpi-value">
          {data ? n(data.voteSpeed.value) : "0"} <span className="kv-unit">{t.perMin}</span>
        </div>
        <div className="kpi-desc">{t.speedDesc}</div>
        {data && pctDelta(data.voteSpeed, t.stable)}
      </div>

      {/* Abuse Warnings — bad-polarity: a rise is crimson */}
      <div className={cls} data-kpi="abuse_warnings">
        <div className="kpi-label">
          <svg className="lk-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 3l9 16H3z" /><line x1="12" y1="10" x2="12" y2="14" /><circle cx="12" cy="17" r="0.8" fill="currentColor" /></svg>
          {t.abuseWarnings}
        </div>
        <div className="kpi-value">{data ? n(data.abuseWarnings.value) : "0"}</div>
        <div className="kpi-desc">{t.abuseDesc}</div>
        {data && (
          <span className={`kpi-delta ${data.abuseWarnings.dir}`}>
            {(data.abuseWarnings.deltaAbs ?? 0) > 0
              ? `▲ ${data.abuseWarnings.deltaAbs} · ${t.review}`
              : data.abuseWarnings.value > 0
                ? `${data.abuseWarnings.value} ${t.open}`
                : `▬ 0`}
          </span>
        )}
      </div>

      {/* Round Status */}
      <div className={cls} data-kpi="round_status">
        <div className="kpi-label">
          <svg className="lk-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9" /><polyline points="12 7 12 12 15 14" /></svg>
          {t.roundStatus}
        </div>
        <div className="kpi-value">
          {data ? data.roundStatus.activeCount : 0} <span className="kv-unit">{t.active}</span>
        </div>
        <div className="kpi-desc">{data && roundDist ? roundDist : t.roundDesc}</div>
        {data && <span className="kpi-delta flat">{t.deadline} · {deadline}</span>}
      </div>
    </div>
  );
}
