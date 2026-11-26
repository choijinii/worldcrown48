"use client";

/**
 * 홈(PITCH-2) 구역 — Trending · Create 띠 · NEWS ROOM · CHARTS · TIOZ.AI 띠 (지시서 1절 4 · 6 · 7 · 9행 · 7절).
 * 구역 이름은 승인된 영어 그대로(3언어 공통 · 6절). 탭은 아레나 홈 CategoryTabs 재사용(검색 칸 없음).
 */
import type { Tournament } from "@/lib/types/tournament";
import type { CategoryDoc } from "@/lib/taxonomy/category";
import type { ChartPickRow, HomeArticle } from "@/lib/pitch/home";
import { useT } from "@/lib/i18n/useT";
import { localizedTitle } from "@/lib/tournamentTitle";
import { localizedName } from "@/lib/contestantName";
import { chartHref } from "@/lib/records/chartList";
import { pageWindow } from "@/lib/arenaHome/arenaHome";
import { WORLD_PRESS_MEDIA_NAME } from "@/lib/pitch/worldPress";
import { TIOZ_BAND_ENABLED } from "@/lib/pitch/tiozBand";
import { CategoryTabs } from "@/components/arenaHome/CategoryTabs";
import Link from "next/link";
import { TournamentCard } from "./TournamentCard";
import { ChartAvatar, ChartUpdated, NewsCard, NoArticles } from "./homeParts";

function SectionHead({
  title,
  testId,
  categories,
  cat,
  onCat,
  hrefFor,
}: {
  title: string;
  testId: string;
  categories: CategoryDoc[];
  cat: string | null;
  onCat: (id: string | null) => void;
  hrefFor: (id: string | null) => string;
}) {
  return (
    <div className="sec-head">
      <h2 className="sec-title">{title}</h2>
      <CategoryTabs
        categories={categories}
        selected={cat}
        onChoose={onCat}
        hrefFor={hrefFor}
        testIdPrefix={`${testId}-tab`}
        navTestId={`${testId}-tabs`}
        pill
      />
    </div>
  );
}

export function TrendingSection(props: {
  categories: CategoryDoc[];
  cat: string | null;
  onCat: (id: string | null) => void;
  hrefFor: (id: string | null) => string;
  items: Tournament[];
  page: number;
  pageCount: number;
  onPage: (n: number) => void;
  total: number;
}): JSX.Element {
  const { t } = useT();
  return (
    <section className="sec" id="trending" data-testid="pitch-trending">
      <SectionHead title="Trending Tournaments" testId="pitch-trending" {...props} />
      {props.total === 0 ? (
        <div className="sec-empty" data-testid="pitch-trending-empty">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/wc48-crown-circle-outline.svg" alt="" className="sec-empty-icon" />
          <span className="sec-empty-title">{t("pitch.home.trending.empty.title")}</span>
          <span className="sec-empty-body">{t("pitch.home.trending.empty.body")}</span>
        </div>
      ) : (
        <>
          <div className="card-grid" data-testid="pitch-trending-grid">
            {props.items.map((tour, i) => (
              <TournamentCard key={tour.id} tournament={tour} position={(props.page - 1) * 6 + i} />
            ))}
          </div>
          {props.pageCount > 1 && (
            <nav className="pager" data-testid="pitch-trending-pager">
              <button
                type="button"
                className="page-btn"
                disabled={props.page <= 1}
                aria-label={t("arenaHome.page.prev")}
                onClick={() => props.onPage(props.page - 1)}
              >
                ‹
              </button>
              {pageWindow(props.page, props.pageCount).map((n) => (
                <button
                  key={n}
                  type="button"
                  className="page-btn"
                  aria-current={n === props.page ? "page" : undefined}
                  aria-label={t("arenaHome.page.n", { n })}
                  onClick={() => props.onPage(n)}
                  data-testid={`pitch-trending-page-${n}`}
                >
                  {n}
                </button>
              ))}
              <button
                type="button"
                className="page-btn"
                disabled={props.page >= props.pageCount}
                aria-label={t("arenaHome.page.next")}
                onClick={() => props.onPage(props.page + 1)}
                data-testid="pitch-trending-next"
              >
                ›
              </button>
            </nav>
          )}
        </>
      )}
    </section>
  );
}

/** Create Tournament 띠 — 누르는 곳 없음(관리자는 메뉴로 The Lab). */
export function CreateBand(): JSX.Element {
  const { t } = useT();
  return (
    <div className="create-band" data-testid="pitch-create-band">
      <span className="create-left">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/wc48-crown-filled.svg" alt="" className="create-crown" />
        <span className="create-text">
          <span className="create-title">Create Tournament</span>
          <span className="create-line">{t("pitch.home.create.line")}</span>
        </span>
      </span>
      <span className="create-soon">COMING SOON</span>
    </div>
  );
}

export function NewsRoomSection(props: {
  categories: CategoryDoc[];
  cat: string | null;
  onCat: (id: string | null) => void;
  hrefFor: (id: string | null) => string;
  latest: HomeArticle[];
  hot: HomeArticle[];
  press: HomeArticle[];
}): JSX.Element {
  const cols: { label: string; key: string; items: HomeArticle[]; media?: string }[] = [
    { label: "LATEST", key: "latest", items: props.latest },
    { label: "HOT", key: "hot", items: props.hot },
    { label: "WORLD PRESS", key: "press", items: props.press, media: WORLD_PRESS_MEDIA_NAME },
  ];
  return (
    <section className="sec" data-testid="pitch-newsroom">
      <SectionHead title="News Room" testId="pitch-news" {...props} />
      {props.latest.length === 0 && props.press.length === 0 ? (
        <NoArticles testId="pitch-news-empty" />
      ) : (
        <div className="news-cols">
          {cols.map((c) => (
            <div key={c.key} className="news-col" data-testid={`pitch-news-col-${c.key}`}>
              <div className="news-col-head">{c.label}</div>
              {c.items.length ? (
                c.items.map((a) => <NewsCard key={a.slug} article={a} media={c.media} testId={`pitch-news-${c.key}-item`} />)
              ) : (
                <NoArticles testId={`pitch-news-col-${c.key}-empty`} />
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export function ChartsSection(props: {
  categories: CategoryDoc[];
  cat: string | null;
  onCat: (id: string | null) => void;
  hrefFor: (id: string | null) => string;
  main: ChartPickRow | null;
  latest: ChartPickRow[];
}): JSX.Element {
  const { t, lang } = useT();
  const { main } = props;
  return (
    <section className="sec" data-testid="pitch-charts">
      <SectionHead title="Charts" testId="pitch-charts" {...props} />
      {main ? (
        <div className="charts-box">
          {/* 오른쪽 작은 차트가 0개면 큰 차트가 가로 전체(빈 회색 칸을 남기지 않는다 · 대표 2026-11-21) */}
          <Link
            href={chartHref(main.id)}
            className={props.latest.length > 0 ? "chart-main" : "chart-main chart-main-solo"}
            data-testid="pitch-chart-main"
          >
            <span className="chart-main-col">
              <span className="chart-kicker">CROWN SCORE</span>
              <ChartAvatar entry={main.top[0]} rank={1} className="chart-main-img" />
            </span>
            <span className="chart-main-text">
              <ChartUpdated generatedAtMs={main.generatedAtMs} className="chart-pill" />
              <span className="chart-main-title">{localizedTitle(main, lang)}</span>
              <span className="chart-main-n1">{localizedName(main.top[0], lang)}</span>
              <span className="chart-main-rows">
                {main.top.slice(1, 5).map((e, i) => (
                  <span key={i} className="chart-main-row">
                    <span className="rank-n">{i + 2}</span>
                    {localizedName(e, lang)}
                  </span>
                ))}
              </span>
            </span>
          </Link>
          {props.latest.length > 0 && (
          <div className="chart-grid" data-testid="pitch-chart-grid">
            {props.latest.map((r) => (
              <Link key={r.id} href={chartHref(r.id)} className="chart-small" data-testid="pitch-chart-small">
                <ChartAvatar entry={r.top[0]} className="chart-small-img" />
                <span className="chart-small-text">
                  <span className="chart-small-title">{localizedTitle(r, lang)}</span>
                  <span className="chart-small-ranks">
                    {r.top.slice(0, 3).map((e, i) => (
                      <span key={i} className={i === 0 ? "chart-small-n1" : "chart-small-n"}>
                        <span className={i === 0 ? "rank-n rank-n-gold" : "rank-n"}>{i + 1}</span>
                        {localizedName(e, lang)}
                      </span>
                    ))}
                  </span>
                </span>
              </Link>
            ))}
          </div>
          )}
        </div>
      ) : (
        <div className="sec-empty sec-empty-sm" data-testid="pitch-charts-empty">
          <span className="chart-kicker chart-kicker-dim">CROWN SCORE</span>
          <span className="sec-empty-title">{t("pitch.home.charts.empty")}</span>
        </div>
      )}
    </section>
  );
}

/** TIOZ.AI 띠 — 글자만 · 링크 없음(TIOZ-BAND-ON) · 런칭 전에는 그리지 않는다(시안 P-6) · 끄면 DOM 에 없다. */
export function TiozBand({ prelaunch }: { prelaunch: boolean }): JSX.Element | null {
  if (!TIOZ_BAND_ENABLED || prelaunch) return null;
  return (
    <div className="tioz-band" data-testid="pitch-tioz-band">
      <span className="tioz-word">TIOZ.AI</span>
    </div>
  );
}
