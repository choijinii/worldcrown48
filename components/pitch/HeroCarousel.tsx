"use client";

/**
 * 히어로 — 왼쪽 큰 칸(16:9) · 5장(홍보 영상 1 + 최신 대회 1 + 참여 많은 대회 3 · 추가 지시 ② 6절) ·
 * 10초 자동 넘김 · 넘김 600ms · 마우스를 올리면 멈춤 · 점 8px · 좌우 화살표 44px(마우스가 올라갈 때만)
 * (PITCH-2 1절 2행 · D-81 바뀜 후보).
 *
 * B안 「살아 있는 포스터」 = VS 표지가 천천히 커지며 어긋나게 움직인다(pitch.css `hero-ken` · 휴대폰 끔).
 * 대회 장에서는 영상을 틀지 않는다. 대회 장의 표지는 카드와 같은 `useCoverPair` + `VSThumb` — 내린 엔트리가 있으면
 * 앞 번호 엔트리로 바뀐다(`mediaTakedownAt` 을 넘긴다 · D-35 · D-93).
 * 홍보 장 = 월크48이 직접 만든 영상 파일(우리 Storage `pitch/promo/` · 유튜브 아님)이 소리 없이 자동 반복 ·
 * 조작 단추 없음 · 휴대폰(480 이하)과 움직임 줄이기에서는 정지 그림만 · 장 전체 = 같은 탭 `/arena`(추가 지시 ② 1절).
 *
 * 장 위의 글자와 버튼(추가 지시 ② 7절 · 대표 2026-11-19 12:16 — 1절 · 6절보다 앞선다):
 *   첫 장 = 영상 + 작은 "WORLDCROWN48 · FILM" 글자 하나 · 제목도 버튼도 없다.
 *   대회 장 = 카테고리 칩 + 대회 제목 · 참가하기 버튼 없음(대표 2026-11-19 시안 P-1 대조 — 빼는 것은 버튼뿐). 장 전체가 링크 하나(`heroSlideHref`) — 키보드 Tab → Enter 로 열린다.
 *   화살표 · 점은 링크 밖에서 따로 눌린다. 휴대폰은 옆으로 밀면 장 넘기기, 가만히 누르면 이동(`heroSwipe`) —
 *   미는 중에 떼면 이동하지 않는다. 누를 수 있다는 표시 = 손가락 모양 + 장이 살짝 밝아짐(pitch.css · 새 색 없음).
 */
import { useEffect, useRef, useState, type MouseEvent, type PointerEvent } from "react";
import Link from "next/link";
import type { Tournament } from "@/lib/types/tournament";
import { heroSlideHref, heroSwipe, type HeroSlide } from "@/lib/pitch/home";
import { useT } from "@/lib/i18n/useT";
import { localizedTitle } from "@/lib/tournamentTitle";
import { VSThumb } from "@/components/thumbnail/VSThumb";
import { useCoverPair } from "@/components/thumbnail/useCoverPair";

export const HERO_INTERVAL_MS = 10_000;

function TournamentSlide({ t: tour, chip, active }: { t: Tournament; chip: string | null; active: boolean }) {
  const { lang } = useT();
  const cover = useCoverPair(tour.id, tour.thumbnailPair, tour.mediaTakedownAt);
  const title = localizedTitle(tour, lang);
  return (
    <Link
      href={heroSlideHref({ kind: "tournament", tournament: tour })}
      className="hero-slide"
      aria-label={title}
      tabIndex={active ? 0 : -1}
      draggable={false}
      data-cover-a={cover.aId ?? ""}
      data-cover-b={cover.bId ?? ""}
      data-testid={`pitch-hero-slide-${tour.id}`}
    >
      <span className="hero-ken">
        <VSThumb a={cover.a} b={cover.b} onBroken={cover.onBroken} testId={`hero-cover-${tour.id}`} />
      </span>
      <span className="hero-cap">
        {chip && (
          <span className="hero-chip" data-testid={`pitch-hero-chip-${tour.id}`}>
            {chip}
          </span>
        )}
        <span className="hero-title">{title}</span>
      </span>
    </Link>
  );
}

/** 휴대폰(폭 480 이하) · 움직임 줄이기 — 영상을 불러오지 않고 정지 그림만(추가 지시 ② 1절). */
export const PROMO_STILL_QUERY = "(max-width: 480px), (prefers-reduced-motion: reduce)";

/** 마운트 뒤에만 true — 첫 화면(서버 그림)에는 영상이 없고 정지 그림이 먼저 보인다. */
function usePromoVideoAllowed(): boolean {
  const [ok, setOk] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(PROMO_STILL_QUERY);
    const read = () => setOk(!mq.matches);
    read();
    mq.addEventListener("change", read);
    return () => mq.removeEventListener("change", read);
  }, []);
  return ok;
}

function PromoSlide({ videoUrl, posterUrl, active }: { videoUrl: string | null; posterUrl: string | null; active: boolean }) {
  const allowed = usePromoVideoAllowed();
  const [failed, setFailed] = useState(false);
  const [inView, setInView] = useState(false);
  const boxRef = useRef<HTMLAnchorElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const showVideo = Boolean(videoUrl) && allowed && !failed;

  useEffect(() => {
    const el = boxRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([e]) => setInView(Boolean(e?.isIntersecting)), { threshold: 0.25 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // 첫 장이 화면에 보일 때만 재생 · 다른 장으로 넘어가거나 화면 밖이면 멈춤.
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (active && inView) {
      v.muted = true;
      v.play().catch(() => undefined);
    } else {
      v.pause();
    }
  }, [active, inView, showVideo]);

  return (
    <Link
      ref={boxRef}
      href={heroSlideHref({ kind: "promo", videoUrl, posterUrl })}
      className="hero-slide hero-promo"
      aria-label="WorldCrown48"
      draggable={false}
      tabIndex={active ? 0 : -1}
      data-testid="pitch-hero-promo"
      data-promo-mode={showVideo ? "video" : "still"}
    >
      {posterUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img className="hero-poster" src={posterUrl} alt="" draggable={false} data-testid="pitch-hero-promo-poster" />
      )}
      {showVideo && (
        <video
          ref={(v) => {
            videoRef.current = v;
            if (v) {
              v.defaultMuted = true;
              v.muted = true;
            }
          }}
          className="hero-poster hero-promo-video"
          src={videoUrl as string}
          poster={posterUrl ?? undefined}
          muted
          autoPlay
          loop
          playsInline
          preload="auto"
          disablePictureInPicture
          disableRemotePlayback
          aria-hidden="true"
          tabIndex={-1}
          onError={() => setFailed(true)}
          data-testid="pitch-hero-promo-video"
        />
      )}
      <span className="hero-cap hero-cap-promo">
        <span className="hero-film">WORLDCROWN48 · FILM</span>
      </span>
    </Link>
  );
}

export function HeroCarousel({
  slides,
  chipOf,
}: {
  slides: HeroSlide<Tournament>[];
  chipOf: (category: string | undefined) => string | null;
}): JSX.Element {
  const { t } = useT();
  const [index, setIndex] = useState(0);
  const [hover, setHover] = useState(false);
  const count = slides.length;
  const cur = count ? index % count : 0;
  // 밀기(7절) — 누른 자리 · 이번 누름을 이동으로 치지 않을지.
  const press = useRef<{ x: number; y: number } | null>(null);
  const cancelTap = useRef(false);

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    cancelTap.current = false;
    // 화살표 · 점은 밀기 판정에서 뺀다(따로 눌린다).
    if (e.button !== 0 || (e.target as Element).closest(".hero-arrow, .hero-dots")) {
      press.current = null;
      return;
    }
    press.current = { x: e.clientX, y: e.clientY };
  };
  const onPointerUp = (e: PointerEvent<HTMLDivElement>) => {
    const p = press.current;
    press.current = null;
    if (!p) return;
    const r = heroSwipe(e.clientX - p.x, e.clientY - p.y);
    cancelTap.current = r.cancelTap;
    if (r.step && count > 1) setIndex((cur + r.step + count) % count);
  };
  // 밀다가 뗀 누름은 장 링크를 열지 않는다.
  const onClickCapture = (e: MouseEvent<HTMLDivElement>) => {
    if (!cancelTap.current) return;
    cancelTap.current = false;
    e.preventDefault();
    e.stopPropagation();
  };

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
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerCancel={() => {
        press.current = null;
      }}
      onClickCapture={onClickCapture}
    >
      <div className="hero-track" style={{ transform: `translateX(-${cur * 100}%)` }}>
        {slides.map((s, i) =>
          s.kind === "promo" ? (
            <PromoSlide key="promo" videoUrl={s.videoUrl} posterUrl={s.posterUrl} active={i === cur} />
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
