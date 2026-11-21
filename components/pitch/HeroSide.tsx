"use client";

/**
 * 히어로 오른쪽 칸 — 차트 1줄 크게(1위 그림 132 + 대회 제목 + 1·2·3위 + 발표 시각 알약) + 뉴스 3줄(많이 본 순 ·
 * 그림 72 + 제목 2줄) (PITCH-2 1절 2′행). 태블릿 · 휴대폰은 히어로 아래로 내려간다(pitch.css).
 *
 * 칸 머리 글자 = 시안 그대로 "CROWN SCORE" · "NEWSROOM"(3언어 공통 영어 · 추가 지시 ② 3절).
 * 수치는 쓰지 않는다(등수 · 이름만 · 대진 흐름 #8).
 */
import Link from "next/link";
import type { ChartPickRow, HomeArticle } from "@/lib/pitch/home";
import { useT } from "@/lib/i18n/useT";
import { localizedTitle } from "@/lib/tournamentTitle";
import { localizedName } from "@/lib/contestantName";
import { chartHref } from "@/lib/records/chartList";
import { articleTitle, formatNewsDate } from "@/lib/arenaHome/arenaPicks";
import { ChartAvatar, ChartUpdated, NewsThumb, NoArticles } from "./homeParts";

export function HeroSide({ chart, news }: { chart: ChartPickRow | null; news: HomeArticle[] }): JSX.Element {
  const { t, lang } = useT();
  return (
    <aside className="hero-side" data-testid="pitch-hero-side">
      <div className="side-head">CROWN SCORE</div>
      {chart ? (
        <Link href={chartHref(chart.id)} className="side-chart" data-testid="pitch-side-chart">
          <ChartAvatar entry={chart.top[0]} rank={1} className="side-chart-img" />
          <span className="side-chart-text">
            <span className="side-chart-title">{localizedTitle(chart, lang)}</span>
            <span className="side-chart-n1">{localizedName(chart.top[0], lang)}</span>
            {chart.top.slice(1, 3).map((e, i) => (
              <span key={i} className="side-chart-rest">
                <span className="rank-n">{i + 2}</span>
                {localizedName(e, lang)}
              </span>
            ))}
            <ChartUpdated generatedAtMs={chart.generatedAtMs} className="side-chart-at" />
          </span>
        </Link>
      ) : (
        <div className="side-empty" data-testid="pitch-side-chart-empty">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/wc48-crown-circle-outline.svg" alt="" className="side-empty-icon" />
          <span>{t("pitch.home.charts.empty")}</span>
        </div>
      )}
      <div className="side-head side-head-news">NEWSROOM</div>
      {news.length ? (
        <ul className="side-news">
          {news.map((a) => (
            <li key={a.slug}>
              <Link href={`/news/${encodeURIComponent(a.slug)}`} className="side-news-item" data-testid="pitch-side-news-item">
                <NewsThumb src={a.thumb} className="side-news-img" />
                <span className="side-news-text">
                  <span className="side-news-title">{articleTitle(a.title, lang)}</span>
                  <span className="news-date">{formatNewsDate(a.publishedAtMs)}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <NoArticles compact testId="pitch-side-news-empty" />
      )}
    </aside>
  );
}
