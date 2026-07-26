/**
 * ArticleNotFound — 내려갔거나(archived) 아직 발행되지 않은 slug 접근 시 안내
 * (ND-1 §8 — 404가 아닌 안내). 3언어 메시지 + /news 목록으로 돌아가는 링크.
 */
"use client";

import Link from "next/link";
import { useT } from "@/lib/i18n/useT";
import styles from "./news.module.css";

export function ArticleNotFound(): JSX.Element {
  const { t } = useT();
  return (
    <div className={styles.page}>
      <div className={styles.listWrap}>
        <div className={styles.listEmpty} data-testid="article-not-found">
          <p>{t("news.article.notFound")}</p>
          <p style={{ marginTop: 16 }}>
            <Link href="/news" className={styles.listTag}>
              ← {t("news.list.title")}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
