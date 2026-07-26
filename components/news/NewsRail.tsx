/**
 * NewsRail — 우측 뉴스뷰 (ND-1 §3 #11). 독립·자기완결: 자체적으로 published 기사를
 * fetch하고, 섬네일+제목을 건수 제한 없이(스크롤되는 만큼) 렌더한다.
 *
 * 임시 마운트(대표 확정 2026-07-26): The Pitch 데스크톱(≥1024px) 우측 고정 + 모바일
 * 하단 인라인. `docked`=true면 데스크톱 우측 레일 스타일을 켠다. 상설 프레임 이사 시
 * 이 컴포넌트를 그대로 옮긴다.
 */
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n";
import { useT } from "@/lib/i18n/useT";
import {
  subscribePublishedArticles,
  type ArticleRecord,
} from "@/lib/news/newsClient";
import { resolveArticleView } from "@/lib/news/renderArticle";
import styles from "./NewsRail.module.css";

const TEMPLATE_CRUMB: Record<string, string> = {
  open: "TOURNAMENT OPEN",
  result: "RESULT",
  weekly: "WEEKLY",
  column: "COLUMN",
};

/** Hero image of an article, if it carries one (source-lang body). */
function heroThumb(a: ArticleRecord): string | null {
  for (const l of ["ko", "en", "es"] as const) {
    const hero = a.body[l]?.find((b) => b.type === "hero");
    if (hero && hero.type === "hero" && hero.imageUrl) return hero.imageUrl;
  }
  return null;
}

export function NewsRail({ docked = false }: { docked?: boolean }): JSX.Element | null {
  const { lang } = useI18n();
  const { t } = useT();
  const [articles, setArticles] = useState<ArticleRecord[]>([]);

  useEffect(() => subscribePublishedArticles(setArticles, () => setArticles([])), []);

  return (
    <aside
      className={`${styles.rail} ${docked ? styles.docked : ""}`}
      aria-label="Newsroom"
      data-testid="news-rail"
    >
      <div className={styles.head}>{t("news.rail.label")}</div>
      {articles.length === 0 ? (
        <div className={styles.empty}>{t("news.list.empty")}</div>
      ) : (
        <div className={styles.list}>
          {articles.map((a) => {
            const view = resolveArticleView(a, lang);
            const thumb = heroThumb(a);
            return (
              <Link key={a.slug} href={`/news/${a.slug}`} className={styles.item} data-testid="news-rail-item">
                {thumb ? (
                  <img className={styles.thumb} src={thumb} alt="" />
                ) : (
                  <span className={styles.thumb} aria-hidden="true" />
                )}
                <div>
                  <p className={styles.title}>{view.title}</p>
                  <div className={styles.meta}>{TEMPLATE_CRUMB[a.template] ?? "NEWS"}</div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </aside>
  );
}
