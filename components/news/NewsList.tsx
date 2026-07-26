/**
 * NewsList — /news 목록 (ND-1 §3 #9). Live feed of PUBLISHED articles, newest
 * first, each linking to its /news/[slug] page. Language from the i18n Context;
 * empty title/subhead fall back to the source slot (resolveArticleView).
 */
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n";
import { useT } from "@/lib/i18n/useT";
import { LanguageToggle } from "@/components/i18n/LanguageToggle";
import {
  subscribePublishedArticles,
  type ArticleRecord,
} from "@/lib/news/newsClient";
import { resolveArticleView } from "@/lib/news/renderArticle";
import styles from "./news.module.css";

const TEMPLATE_CRUMB: Record<string, string> = {
  open: "TOURNAMENT OPEN",
  result: "RESULT",
  weekly: "WEEKLY RANKING",
  column: "COLUMN",
};

export function NewsList(): JSX.Element {
  const { lang } = useI18n();
  const { t } = useT();
  const [articles, setArticles] = useState<ArticleRecord[]>([]);

  useEffect(() => subscribePublishedArticles(setArticles, () => setArticles([])), []);

  return (
    <div className={styles.page}>
      <div className={styles.topbar}>
        <LanguageToggle />
      </div>
      <div className={styles.listWrap}>
        <h1 className={styles.listHead}>{t("news.list.title")}</h1>
        {articles.length === 0 ? (
          <div className={styles.listEmpty} data-testid="news-list-empty">
            {t("news.list.empty")}
          </div>
        ) : (
          articles.map((a) => {
            const view = resolveArticleView(a, lang);
            return (
              <Link key={a.slug} href={`/news/${a.slug}`} className={styles.listItem} data-testid="news-list-item">
                <div className={styles.listItemBody}>
                  <div className={styles.listTag}>{TEMPLATE_CRUMB[a.template] ?? "NEWS"}</div>
                  <div className={styles.listTitle}>{view.title}</div>
                  {view.subhead ? <div className={styles.listSub}>{view.subhead}</div> : null}
                </div>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}
