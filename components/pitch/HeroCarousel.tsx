"use client";

/**
 * 히어로 — 왼쪽 큰 칸(16:9) · 5장(홍보 장 1 + 참여 많은 순 4) · 10초 자동 넘김 · 넘김 600ms ·
 * 마우스를 올리면 멈춤 · 점 8px · 좌우 화살표 44px(마우스가 올라갈 때만) (PITCH-2 1절 2행 · D-81 후보).
 *
 * B안 「살아 있는 포스터」 = VS 표지가 천천히 커지며 어긋나게 움직인다(pitch.css `hero-ken` · 휴대폰 끔).
 * 영상은 틀지 않는다. 대회 장의 표지는 카드와 같은 `useCoverPair` + `VSThumb` — 내린 엔트리가 있으면
 * 앞 번호 엔트리로 바뀐다(`mediaTakedownAt` 을 넘긴다 · D-35 · D-93).
 * 홍보 장 = 런칭 홍보 영상의 표지 그림 · 누르면 런칭 전 `/launch`, 런칭 뒤 유튜브 새 탭.
 */
import { useEffect, useState } from "react";
import Link from "next/link";
import type { Tournament } from "@/lib/types/tournament";
import type { HeroSlide } from "@/lib/pitch/home";
import { useT } from "@/lib/i18n/useT";
import { localizedTitle } from "@/lib/tournamentTitle";
import { arenaHomeHref } from "@/lib/arenaHome/arenaHome";
import { buildThumbnailUrl, buildWatchUrl } from "@/lib/embed/loopRange";
import { VSThumb } from "@/components/thumbnail/VSThumb";
import { useCoverPair } from "@/components/thumbnail/useCoverPair";

export const HERO_INTERVAL_MS = 10_000;

function TournamentSlide({ t: tour, chip, active }: { t: Tournament; chip: string | null; active: boolean }) {
  const { t, lang } = useT();
  const cover = useCoverPair(tour.id, tour.thumbnailPair, tour.mediaTakedownAt);
  const title = localizedTitle(tour, lang);
  return (
    <div className="hero-slide" data-cover-a={cover.aId ?? ""} data-cover-b={cover.bId ?? ""} data-testid={`pitch-hero-slide-${tour.id}`}>
      <div className="hero-ken">
        <VSThumb a={cover.a} b={cover.b} onBroken={cover.onBroken} testId={`hero-cover-${tour.id}`} />
      </div>
      <div className="hero-cap">
        {chip && <span className="hero-chip">{chip}</span>}
        <span className="hero-title">{title}</span>
        <Link
          href={arenaHomeHref({ t: tour.id })}
          className="hero-cta"
          tabIndex={active ? 0 : -1}
          data-testid={`pitch-hero-cta-${tour.id}`}
        >
          {t("pitch.card.cta")}
        </Link>
      </div>
    </div>
  );
}

function PromoSlide({ videoId, prelaunch, active }: { videoId: string; prelaunch: boolean; active: boolean }) {
  const { t } = useT();
  const title = t("pitch.home.promo.title");
  const inner = (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="hero-poster" src={buildThumbnailUrl(videoId)} alt="" />
      <span className="hero-play" aria-hidden="true">
        <span className="hero-play-tri" />
      </span>
      <span className="hero-cap hero-cap-promo">
        <span className="hero-title">{title}</span>
      </span>
    </>
  );
  return prelaunch ? (
    <Link href="/launch" className="hero-slide hero-promo" aria-label={title} tabIndex={active ? 0 : -1} data-testid="pitch-hero-promo">
      {inner}
    </Link>
  ) : (
    <a
      href={buildWatchUrl(videoId)}
      target="_blank"
      rel="noopener noreferrer"
      className="hero-slide hero-promo"
      aria-label={title}
      tabIndex={active ? 0 : -1}
      data-testid="pitch-hero-promo"
    >
      {inner}
    </a>
  );
}

export function HeroCarousel({
  slides,
  chipOf,
  prelaunch,
}: {
  slides: HeroSlide<Tournament>[];
  chipOf: (category: string | undefined) => string | null;
  prelaunch: boolean;
}): JSX.Element {
  const { t } = useT();
  const [index, setIndex] = useState(0);
  const [hover, setHover] = useState(false);
  const count = slides.length;
  const cur = count ? index % count : 0;

  useEffect(() => {
    if (hover || count < 2) return;
    const timer = setInterval(() => setIndex((i) => (i + 1) % count), HERO_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [hover, count]);

  return (
    <div
      className="hero-box"
      data-testid="pitch-hero"
      data-slide={cur}
      data-hover={hover ? "true" : "false"}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <div className="hero-track" style={{ transform: `translateX(-${cur * 100}%)` }}>
        {slides.map((s, i) =>
          s.kind === "promo" ? (
            <PromoSlide key="promo" videoId={s.videoId} prelaunch={prelaunch} active={i === cur} />
          ) : (
            <TournamentSlide key={s.tournament.id} t={s.tournament} chip={chipOf(s.tournament.category)} active={i === cur} />
          ),
        )}
      </div>
      {count > 1 && (
        <>
          <button
            type="button"
            className="hero-arrow hero-arrow-prev"
            aria-label={t("arenaHome.page.prev")}
            onClick={() => setIndex((cur - 1 + count) % count)}
            data-testid="pitch-hero-prev"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
              <path d="m15 18-6-6 6-6" />
            </svg>
          </button>
          <button
            type="button"
            className="hero-arrow hero-arrow-next"
            aria-label={t("arenaHome.page.next")}
            onClick={() => setIndex((cur + 1) % count)}
            data-testid="pitch-hero-next"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
              <path d="m9 18 6-6-6-6" />
            </svg>
          </button>
          <div className="hero-dots" data-testid="pitch-hero-dots">
            {slides.map((s, i) => (
              <button
                key={s.kind === "promo" ? "promo" : s.tournament.id}
                type="button"
                className="hero-dot"
                aria-label={String(i + 1)}
                aria-current={i === cur ? "true" : undefined}
                onClick={() => setIndex(i)}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
