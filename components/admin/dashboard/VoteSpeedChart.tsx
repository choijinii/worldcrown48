/**
 * VoteSpeedChart — 24h votes/hr area chart (handoff §4.3, §6).
 *
 * Recharts uses `window` internally, so it MUST be loaded via next/dynamic
 * { ssr: false } (handoff §9 trap #6) — the dynamic boundary lives in
 * DashboardMain. Line/area stroke = Crown Gold --color-gold (불변 원칙 #2), area
 * gradient gold 0.32→0. 1H/24H/7D: only 24H works this PR; the rest are
 * disabled with a "later" tooltip.
 *
 * empty state when no votes in 24h. The loading copy says "syncing data"
 * (NOT "Realtime DB" — lite-spec correction ⑤; RTDB is never used).
 */
"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useI18n } from "@/lib/i18n";
import type { Lang } from "@/lib/cookieConsent";
import { formatNumber } from "@/lib/admin/dashboard/formatKpi";
import type { VoteChart } from "@/lib/admin/dashboard/types";

const GOLD = "#FCD006";

function strings(lang: Lang) {
  const ko = {
    title: "투표 속도 · 최근 24시간",
    side: "시간당 투표 수",
    laterTip: "다음 단계 예정",
    total24h: "24시간 합계",
    peak: "피크 시간",
    now: "현재",
    perHr: "/시간",
    emptyTitle: "아직 투표 데이터가 없어요",
    emptySub: "첫 투표가 들어오면 차트가 나타납니다",
    loading: "데이터 동기화 중…",
  };
  const en = {
    title: "Vote speed · last 24h",
    side: "votes per hour",
    laterTip: "Planned for a later phase",
    total24h: "24h Total",
    peak: "Peak hr",
    now: "Now",
    perHr: "/hr",
    emptyTitle: "No vote data yet",
    emptySub: "Chart will appear when the first Vote lands",
    loading: "Syncing data…",
  };
  return lang === "ko" ? ko : en;
}

function hhmm(ms: number): string {
  return new Date(ms).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

interface VoteSpeedChartProps {
  chart: VoteChart | null;
}

export function VoteSpeedChart({ chart }: VoteSpeedChartProps): JSX.Element {
  const { lang } = useI18n();
  const t = strings(lang);
  const n = (v: number) => formatNumber(v, lang);

  const isEmpty = !chart || chart.total24h === 0;

  return (
    <div className="panel" data-chart={isEmpty ? "empty" : "loaded"}>
      <div className="panel-head">
        <h2>
          {t.title} <span className="h-side">{t.side}</span>
        </h2>
        <div className="ph-actions">
          <button className="ph-btn" type="button" disabled title={t.laterTip} aria-pressed={false}>1H</button>
          <button className="ph-btn" type="button" aria-pressed={true}>24H</button>
          <button className="ph-btn" type="button" disabled title={t.laterTip} aria-pressed={false}>7D</button>
        </div>
      </div>

      {isEmpty ? (
        <div className="chart-empty">
          <div className="e-title">{t.emptyTitle}</div>
          <div className="e-sub">{t.emptySub}</div>
        </div>
      ) : (
        <>
          <div className="chart-wrap">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chart.series} margin={{ top: 8, right: 4, bottom: 0, left: 4 }}>
                <defs>
                  <linearGradient id="vs-grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={GOLD} stopOpacity={0.32} />
                    <stop offset="100%" stopColor={GOLD} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#E6EAF0" vertical={false} />
                <XAxis
                  dataKey="hourMs"
                  tickFormatter={hhmm}
                  tick={{ fontSize: 9, fill: "#8C99B3", fontFamily: "var(--font-mono)" }}
                  axisLine={false}
                  tickLine={false}
                  minTickGap={48}
                />
                <YAxis hide domain={[0, "auto"]} />
                <Tooltip
                  formatter={(value: number | string) => [`${n(Number(value))} ${t.perHr}`, t.side]}
                  labelFormatter={(label: number | string) => hhmm(Number(label))}
                  contentStyle={{ background: "var(--color-bg-default)", border: "none", borderRadius: 5, color: "var(--color-white)", fontFamily: "var(--font-mono)", fontSize: 11 }}
                />
                <Area type="monotone" dataKey="votes" stroke={GOLD} strokeWidth={2.5} fill="url(#vs-grad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="chart-stats">
            <div className="chart-stat">
              <div className="cs-label">{t.total24h}</div>
              <div className="cs-value">{n(chart.total24h)}</div>
            </div>
            <div className="chart-stat">
              <div className="cs-label">{t.peak}</div>
              <div className="cs-value">
                {n(chart.peakVotes)}
                {chart.peakHourMs !== null && (
                  <span style={{ fontFamily: "var(--font-sans)", fontSize: 11, fontWeight: 500, color: "var(--color-text-muted-light)" }}> @ {hhmm(chart.peakHourMs)}</span>
                )}
              </div>
            </div>
            <div className="chart-stat">
              <div className="cs-label">{t.now}</div>
              <div className="cs-value">
                {n(chart.nowRate)} <span style={{ fontFamily: "var(--font-sans)", fontSize: 11, fontWeight: 500, color: "var(--color-text-muted-light)" }}>{t.perHr}</span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
