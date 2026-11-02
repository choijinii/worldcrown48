"use client";

/**
 * SideNews — 각 구역 오른쪽 "관련 뉴스" 칸 (ARENA-2 · 원장 D-69 · D-70 · 정본 D-1 · D-6).
 *
 * 기사 = 공개 기사 중 그 구역에 맞는 최신 3건(규칙 lib/arenaHome/arenaPicks · 고르는 일은 부모).
 * 한 줄 = 그림(본문 hero, 없으면 왕관 자리표시) · 제목(지금 언어) · 발행 날짜 → `/news/{slug}`.
 * 맞는 기사가 없으면 "뉴스 없음" 모양(D-6). 칸 아래 300×250 광고 칸(공용 BannerSlot · 기본 공지).
 */
import Link from "next/link";
import type { MessageKey } from "@/lib/i18n/messages";
import { useT } from "@/lib/i18n/useT";
import { BannerSlot } from "@/components/layout/BannerSlot";
import type { BannerSlotName } from "@/lib/banner/bannerSlot";
import { articleTitle, formatNewsDate, type ArenaArticle } from "@/lib/arenaHome/arenaPicks";
import styles from "./arenaHome.module.css";

export function SideNews({
  titleKey,
  slot,
  testId,
  articles,
}: {
  titleKey: MessageKey;
  slot: BannerSlotName;
  testId: string;
  articles: ArenaArticle[];
}): JSX.Element {
  const { t, lang } = useT();
  return (
    <aside className={styles.box} data-testid={testId}>
      <div className={styles.boxHead}>
        <span className={styles.h3}>{t(titleKey)}</span>
        <span className={styles.mono}>NEWSROOM</span>
      </div>
      {articles.length > 0 ? (
        <ul className={styles.newsList}>
          {articles.map((a) => (
            <li key={a.slug}>
              <Link href={`/news/${encodeURIComponent(a.slug)}`} className={styles.newsItem} data-testid={`${testId}-item`} data-slug={a.slug}>
                {a.thumb ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={a.thumb} alt="" className={styles.newsThumb} />
                ) : (
                  <span className={styles.newsThumb} aria-hidden="true">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/brand/wc48-crown-circle-outline.svg" alt="" className={styles.newsThumbIcon} />
                  </span>
                )}
                <span className={styles.newsText}>
                  <span className={styles.newsTitle}>{articleTitle(a.title, lang)}</span>
                  <span className={styles.mono}>{formatNewsDate(a.publishedAtMs)}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <div className={styles.newsEmpty} data-testid={`${testId}-empty`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/wc48-crown-circle-outline.svg" alt="" className={styles.newsEmptyIcon} />
          <span className={styles.newsEmptyTitle}>{t("arenaHome.news.empty.title")}</span>
          <span className={styles.newsEmptyBody}>{t("arenaHome.news.empty.body")}</span>
        </div>
      )}
      <div className={styles.sideAd}>
        <BannerSlot slot={slot} variant="rect" className={styles.slot} />
      </div>
    </aside>
  );
}
