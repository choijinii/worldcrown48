"use client";

/**
 * 홈(PITCH-2) 작은 부품 — 차트 그림 · 발표 시각 알약 · 기사 그림 · "기사 없음" 모양 · 뉴스 카드.
 */
import Link from "next/link";
import { useEffect, useState } from "react";
import type { HomeArticle } from "@/lib/pitch/home";
import type { NamedLike } from "@/lib/contestantName";
import { localizedName } from "@/lib/contestantName";
import { useT } from "@/lib/i18n/useT";
import { avatarGlyph } from "@/lib/ranking/rateFormatter";
import { lastRankingUpdate } from "@/lib/ranking/lastRankingUpdate";
import { articleTitle, formatNewsDate } from "@/lib/arenaHome/arenaPicks";

const CROWN = "/brand/wc48-crown-circle-outline.svg";

/** 차트 등수 그림 — 차트 화면 아바타와 같은 주소(avatarUrl) · 없거나 깨지면 이름 첫 글자 칸. */
export function ChartAvatar({
  entry,
  rank,
  className,
}: {
  entry: NamedLike & { avatar: string };
  rank?: number;
  className: string;
}): JSX.Element {
  const { lang } = useT();
  const [broken, setBroken] = useState(false);
  useEffect(() => setBroken(false), [entry.avatar]);
  return (
    <span className={`chart-avatar ${className}`}>
      {entry.avatar && !broken ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={entry.avatar} alt="" onError={() => setBroken(true)} />
      ) : (
        <span className="chart-glyph">{avatarGlyph(localizedName(entry, lang))}</span>
      )}
      {rank !== undefined && <span className="rank-badge">{rank}</span>}
    </span>
  );
}

/** 발표 시각 알약 — 차트 화면 머리의 기존 문구 그대로(ranking.updated.*). */
export function ChartUpdated({ generatedAtMs, className }: { generatedAtMs: number; className?: string }): JSX.Element | null {
  const { t } = useT();
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => setNow(Date.now()), []);
  if (!generatedAtMs || now === null) return null;
  const u = lastRankingUpdate(generatedAtMs, now);
  return <span className={`chart-updated ${className ?? ""}`}>{t(`ranking.updated.${u.day}`, { time: u.time, date: u.date })}</span>;
}

export function NewsThumb({ src, className }: { src: string | null; className: string }): JSX.Element {
  const [broken, setBroken] = useState(false);
  return (
    <span className={`news-thumb ${className}`}>
      {src && !broken ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" onError={() => setBroken(true)} />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={CROWN} alt="" className="news-thumb-icon" />
      )}
    </span>
  );
}

/** "기사 없음" 모양 — 6절 3번(첫 줄) · 4번(둘째 줄 · compact 에서는 뺀다). */
export function NoArticles({ compact, testId }: { compact?: boolean; testId: string }): JSX.Element {
  const { t } = useT();
  return (
    <div className={compact ? "no-articles no-articles-compact" : "no-articles"} data-testid={testId}>
      <span className="no-articles-tag">NO ARTICLES</span>
      <span className="no-articles-title">{t("pitch.home.news.empty.title")}</span>
      {!compact && <span className="no-articles-body">{t("pitch.home.news.empty.body")}</span>}
    </div>
  );
}

/**
 * NEWS ROOM 카드 — 그림 96 + (매체 이름) + 제목 + 요약 + 날짜. 누르면 같은 탭에서 `/news/{slug}`.
 * WORLD PRESS 열은 `media`(= "TIOZ" · 금색 작은 글자)를 넘긴다(추가 지시 ①).
 */
export function NewsCard({ article, media, testId }: { article: HomeArticle; media?: string; testId: string }): JSX.Element {
  const { lang } = useT();
  return (
    <Link href={`/news/${encodeURIComponent(article.slug)}`} className="news-card" data-testid={testId} data-slug={article.slug}>
      <NewsThumb src={article.thumb} className="news-card-img" />
      <span className="news-card-text">
        {media && <span className="news-card-media">{media}</span>}
        <span className="news-card-title">{articleTitle(article.title, lang)}</span>
        <span className="news-card-sum">{articleTitle(article.subhead, lang)}</span>
        <span className="news-date news-card-date">{formatNewsDate(article.publishedAtMs)}</span>
      </span>
    </Link>
  );
}
