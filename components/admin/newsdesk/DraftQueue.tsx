/**
 * DraftQueue — 초안 대기함 (ND-1 §3 #8). Lists every article (draft/published/
 * archived) newest-first so the operator can pick one to review · edit · 발행/내리기.
 */
"use client";

import type { ArticleRecord } from "@/lib/news/newsClient";
import { firstFilledLang } from "@/lib/news/renderArticle";
import styles from "./newsdesk.module.css";

const STATUS_BADGE: Record<string, string> = {
  draft: styles.badgeDraft,
  published: styles.badgePublished,
  archived: styles.badgeArchived,
};

export function DraftQueue({
  articles,
  selectedSlug,
  onSelect,
}: {
  articles: ArticleRecord[];
  selectedSlug: string | null;
  onSelect: (slug: string) => void;
}): JSX.Element {
  return (
    <div className={styles.panel}>
      <div className={styles.panelLabel}>초안 대기함 · {articles.length}</div>
      {articles.length === 0 ? (
        <div className={styles.empty}>아직 기사가 없어요.</div>
      ) : (
        articles.map((a) => {
          const lang = firstFilledLang(a.title) ?? "ko";
          return (
            <button
              key={a.slug}
              type="button"
              className={`${styles.queueItem} ${
                a.slug === selectedSlug ? styles.queueItemActive : ""
              }`}
              onClick={() => onSelect(a.slug)}
              data-testid="draft-queue-item"
            >
              <div className={styles.queueTitle}>{a.title[lang] || "(제목 없음)"}</div>
              <div className={styles.queueMeta}>
                <span className={`${styles.badge} ${STATUS_BADGE[a.status] ?? ""}`}>
                  {a.status}
                </span>
                <span>{a.template}</span>
                <span>{a.origin}</span>
              </div>
            </button>
          );
        })
      )}
    </div>
  );
}
