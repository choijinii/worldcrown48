"use client";

/**
 * The Pitch(홈) — PITCH-2 PR A · 배치 11단(지시서 v1.1a 1절 · 시안 v2 `docs/design/claude-design/PITCH-2_2026-11-05/`).
 *
 *   제목 줄 → 히어로(5장) + 오른쪽 칸(차트 1줄 · 뉴스 3줄) → TIOZ.AI 띠(꺼짐) → Trending → 배너 ① `pitch-between` →
 *   Create 띠 → NEWS ROOM → 배너 ② `pitch-news-below` → CHARTS → 배너 ③ `pitch-charts-below` → (공용 바닥 띠 · root layout)
 *
 * 테마 = 화이트(D-40 · `data-theme="light"`). 대회 목록은 실시간 구독(pitchStore — 내리기 1분 안 반영 · D-93),
 * 나머지(카테고리 · 홍보 장 · 차트 캐시 · 기사 · 조회 칸)는 한 번 읽는다(lib/pitch/homeData).
 * 공개 규칙은 `isPublicTournament`(D-66 · 숨김 D-86) · 히어로와 Trending 은 마감 시각 전 대회만(0′절 3).
 * 탭은 구역마다 따로 — Trending 탭만 주소(`?cat=` · `?page=`)에 남는다(1절 4행).
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { track } from "@/lib/analytics";
import { currentDeployEnv } from "@/lib/deployEnv";
import { toMs } from "@/lib/news/articleRecord";
import { todayKST } from "@/lib/run/kstReset";
import { isBeforeLaunch } from "@/lib/launch/launchAt";
import { categoryChip } from "@/lib/records/chartList";
import { usePitchStore } from "@/lib/pitch/pitchStore";
import {
  chartPicks,
  chartRows,
  heroNews,
  heroSlides,
  newsColumns,
  openTournaments,
  pitchHref,
  readPitchParams,
  trendingPage,
  type HomeArticle,
} from "@/lib/pitch/home";
import { loadHomeCaches, loadPitchHome, type HomeCache, type PitchHomeData } from "@/lib/pitch/homeData";
import { loadWorldPress } from "@/lib/pitch/worldPress";
import type { Tournament } from "@/lib/types/tournament";
import { BannerSlot } from "@/components/layout/BannerSlot";
import { usePageBannerVariant } from "@/components/layout/useBannerVariant";
import { HeroCarousel } from "./HeroCarousel";
import { HeroSide } from "./HeroSide";
import { ChartsSection, CreateBand, NewsRoomSection, TiozBand, TrendingSection } from "./HomeSections";
import "./pitch.css";

type HomeTournament = Tournament & { deadlineMs: number | null; createdAtMs: number | null };

const EMPTY: PitchHomeData = { categories: [], promoVideoId: "", articles: [], viewsBySlug: {} };

export default function PitchPage() {
  const bannerVariant = usePageBannerVariant();
  const raw = usePitchStore((s) => s.tournaments);
  const subscribe = usePitchStore((s) => s.subscribeToTrending);
  const [home, setHome] = useState<PitchHomeData>(EMPTY);
  const [caches, setCaches] = useState<Record<string, HomeCache>>({});
  const [press, setPress] = useState<HomeArticle[]>([]);
  const [now, setNow] = useState(() => Date.now());
  const [catT, setCatT] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [catN, setCatN] = useState<string | null>(null);
  const [catC, setCatC] = useState<string | null>(null);
  const [urlLang, setUrlLang] = useState<string | null>(null);

  useEffect(() => {
    track("a1_pitch_view", {});
    setNow(Date.now());
  }, []);
  useEffect(() => subscribe(), [subscribe]);
  useEffect(() => {
    let alive = true;
    loadPitchHome()
      .then((d) => alive && setHome(d))
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);

  // 주소의 ?cat= · ?page= — 카테고리 목록이 온 뒤에 읽는다(모르는 값은 전체).
  useEffect(() => {
    const p = readPitchParams(window.location.search, home.categories.map((c) => c.id));
    setCatT(p.cat);
    setPage(p.page);
    setUrlLang(new URLSearchParams(window.location.search).get("lang"));
  }, [home.categories]);

  const tours: HomeTournament[] = useMemo(
    () => raw.map((t) => ({ ...t, deadlineMs: toMs(t.tournamentDeadline), createdAtMs: toMs(t.createdAt) })),
    [raw],
  );
  const env = currentDeployEnv();
  const idsKey = tours.map((t) => t.id).sort().join(",");
  useEffect(() => {
    if (!idsKey) return;
    let alive = true;
    loadHomeCaches(idsKey.split(","))
      .then((c) => alive && setCaches(c))
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [idsKey]);
  useEffect(() => {
    let alive = true;
    loadWorldPress(catN).then((l) => alive && setPress(l));
    return () => {
      alive = false;
    };
  }, [catN]);

  const open = useMemo(() => openTournaments(tours, now, env), [tours, now, env]);
  const runsTotalById = useMemo(
    () => Object.fromEntries(Object.entries(caches).map(([id, c]) => [id, c.runsTotal])),
    [caches],
  );
  const slides = useMemo(
    () => heroSlides({ promoVideoId: home.promoVideoId, open, runsTotalById }),
    [home.promoVideoId, open, runsTotalById],
  );
  const trending = trendingPage(open, catT, page);
  const categoryOf = useMemo(() => {
    const m: Record<string, string> = {};
    for (const t of tours) if (t.category) m[t.id] = t.category;
    return m;
  }, [tours]);
  const today = todayKST(new Date(now));
  const cols = newsColumns(home.articles, home.viewsBySlug, categoryOf, catN, today);
  const sideNews = heroNews(home.articles, home.viewsBySlug);
  const rows = useMemo(() => chartRows(tours, caches, now, env), [tours, caches, now, env]);
  const charts = chartPicks(rows, catC);
  const sideChart = chartPicks(rows, null).newest;
  const prelaunch = isBeforeLaunch(now);
  const chipOf = useCallback((c: string | undefined) => categoryChip(c, home.categories), [home.categories]);

  const trendingHref = useCallback(
    (cat: string | null, p = 1) => pitchHref({ cat, page: p, lang: urlLang }),
    [urlLang],
  );
  const goTrending = (cat: string | null, p: number) => {
    setCatT(cat);
    setPage(p);
    window.history.replaceState(window.history.state, "", trendingHref(cat, p));
  };
  // NEWS ROOM · CHARTS 탭은 주소를 바꾸지 않는다 — 링크는 그 구역 탭을 고른 홈(새 탭으로 열 때만 쓰임).
  const sameHref = useCallback(() => pitchHref({ cat: catT, page, lang: urlLang }), [catT, page, urlLang]);

  return (
    <main className="pitch" data-theme="light">
      <div className="pitch-inner">
        <div className="title-row">
          <h1 className="kicker">GLOBAL FAN ARENA</h1>
        </div>

        <div className="hero-row">
          <HeroCarousel slides={slides} chipOf={chipOf} prelaunch={prelaunch} />
          <HeroSide chart={sideChart} news={sideNews} />
        </div>

        <TiozBand prelaunch={prelaunch} />

        <TrendingSection
          categories={home.categories}
          cat={catT}
          onCat={(c) => goTrending(c, 1)}
          hrefFor={(c) => trendingHref(c, 1)}
          items={trending.items}
          page={trending.page}
          pageCount={trending.pageCount}
          onPage={(n) => goTrending(catT, n)}
          total={open.length}
        />

        {bannerVariant && (
          <div className="pitch-banner">
            <BannerSlot slot="pitch-between" variant={bannerVariant} className="pitch-banner-slot" />
          </div>
        )}

        <CreateBand />

        <NewsRoomSection
          categories={home.categories}
          cat={catN}
          onCat={setCatN}
          hrefFor={sameHref}
          latest={cols.latest}
          hot={cols.hot}
          press={press}
        />

        {bannerVariant && (
          <div className="pitch-banner">
            <BannerSlot slot="pitch-news-below" variant={bannerVariant} className="pitch-banner-slot" />
          </div>
        )}

        <ChartsSection
          categories={home.categories}
          cat={catC}
          onCat={setCatC}
          hrefFor={sameHref}
          main={charts.main}
          latest={charts.latest}
        />

        {bannerVariant && (
          <div className="pitch-banner">
            <BannerSlot slot="pitch-charts-below" variant={bannerVariant} className="pitch-banner-slot" />
          </div>
        )}
      </div>
    </main>
  );
}
