"use client";

/**
 * SideNews — 각 구역 오른쪽 "관련 뉴스" 칸 (ARENA-2 PR 1 · 원장 D-69 · D-70 · 정본 D-6).
 *
 * PR 1 = 자리와 "뉴스 없음" 모양 + 300×250 광고 칸(공용 BannerSlot · 기본 공지).
 * 실제 기사 연결(같은 카테고리 최신 기사 자동 · D-70)은 PR 2.
 */
import type { MessageKey } from "@/lib/i18n/messages";
import { useT } from "@/lib/i18n/useT";
import { BannerSlot } from "@/components/layout/BannerSlot";
import type { BannerSlotName } from "@/lib/banner/bannerSlot";
import styles from "./arenaHome.module.css";

export function SideNews({
  titleKey,
  slot,
  testId,
}: {
  titleKey: MessageKey;
  slot: BannerSlotName;
  testId: string;
}): JSX.Element {
  const { t } = useT();
  return (
    <aside className={styles.box} data-testid={testId}>
      <div className={styles.boxHead}>
        <span className={styles.h3}>{t(titleKey)}</span>
        <span className={styles.mono}>NEWSROOM</span>
      </div>
      <div className={styles.newsEmpty} data-testid={`${testId}-empty`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/wc48-crown-circle-outline.svg" alt="" className={styles.newsEmptyIcon} />
        <span className={styles.newsEmptyTitle}>{t("arenaHome.news.empty.title")}</span>
        <span className={styles.newsEmptyBody}>{t("arenaHome.news.empty.body")}</span>
      </div>
      <div className={styles.sideAd}>
        <BannerSlot slot={slot} variant="rect" className={styles.slot} />
      </div>
    </aside>
  );
}
