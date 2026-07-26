/**
 * NewsDesk — the /admin/newsdesk 발행인 콘솔 shell (ND-1 §3 #8).
 *
 * Live-subscribes to ALL articles (any status), lets the operator generate a
 * draft, pick one from the 초안 대기함, edit it in 3 languages beside its evidence
 * snapshot, and 발행/내리기. Firestore glue only — decisions live in the tested
 * lib/news cores.
 */
"use client";

import { useEffect, useMemo, useState } from "react";
import { subscribeAllArticles, type ArticleRecord } from "@/lib/news/newsClient";
import { DraftQueue } from "./DraftQueue";
import { GeneratePanel } from "./GeneratePanel";
import { ArticleEditor } from "./ArticleEditor";
import styles from "./newsdesk.module.css";

export function NewsDesk(): JSX.Element {
  const [articles, setArticles] = useState<ArticleRecord[]>([]);
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return subscribeAllArticles(
      (list) => {
        setArticles(list);
        setError(null);
      },
      () => setError("기사를 불러오지 못했어요. 운영자 권한/네트워크를 확인하세요."),
    );
  }, []);

  const selected = useMemo(
    () => articles.find((a) => a.slug === selectedSlug) ?? null,
    [articles, selectedSlug],
  );

  return (
    <div className={styles.shell}>
      <header className={styles.head}>
        <div>
          <div className={styles.title}>
            News <em>Desk</em>
          </div>
          <div className={styles.sub}>승인제 뉴스 팩토리 · 자동 발행 없음</div>
        </div>
        <a className={`${styles.btn} ${styles.small}`} href="/news" target="_blank" rel="noreferrer">
          /news 보기 ↗
        </a>
      </header>

      <div className={styles.layout}>
        <div className={styles.col}>
          <GeneratePanel onCreated={setSelectedSlug} />
          <DraftQueue
            articles={articles}
            selectedSlug={selectedSlug}
            onSelect={setSelectedSlug}
          />
          {error ? <div className={styles.empty}>{error}</div> : null}
        </div>
        <div className={styles.col}>
          {selected ? (
            <ArticleEditor article={selected} onChanged={() => undefined} />
          ) : (
            <div className={styles.panel}>
              <div className={styles.empty}>
                왼쪽에서 초안을 생성하거나 대기함에서 기사를 선택하세요.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
