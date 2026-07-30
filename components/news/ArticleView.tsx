/**
 * ArticleView — /news/[slug] 지면 렌더러 (ND-1 §3 #9). 기준본 v3와 시각 정합:
 * masthead · rail · headline · byline · hero · 드롭캡 lead · stats 타일 · matchups
 * VS · closer · ✦ AI-Report v2.5. Language is read from the i18n Context and the
 * displayed fields are chosen by resolveArticleView (미번역 언어 → 원문 fallback).
 */
"use client";

import Link from "next/link";
import { useI18n } from "@/lib/i18n";
import { useT } from "@/lib/i18n/useT";
import { resolveArticleView } from "@/lib/news/renderArticle";
import type { ArticleRecord } from "@/lib/news/articleRecord";
import type { ArticleBlock } from "@/lib/news/articleDoc";
import { MediaSlot } from "@/components/media/MediaSlot";
import { AiReport } from "./AiReport";
import styles from "./news.module.css";

const TEMPLATE_CRUMB: Record<string, string> = {
  open: "TOURNAMENT OPEN",
  result: "RESULT",
  weekly: "WEEKLY RANKING",
  column: "COLUMN",
};

const dateFmt = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Seoul",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  weekday: "short",
});

function fmtDate(ms: number | null): string {
  if (!ms) return "";
  return `${dateFmt.format(new Date(ms)).toUpperCase()} · KST`;
}

function Block({ block, sectionLabel }: { block: ArticleBlock; sectionLabel: string }): JSX.Element | null {
  switch (block.type) {
    case "hero":
      return (
        <figure className={styles.hero}>
          {block.embed?.videoId ? (
            <MediaSlot
              media={{ type: "embed", embed: block.embed }}
              imageUrl={block.imageUrl ?? ""}
              alt={block.title}
            />
          ) : block.imageUrl ? (
            <img className={styles.heroImg} src={block.imageUrl} alt={block.title} />
          ) : (
            <div className={styles.heroBox}>
              {block.kicker ? <div className={styles.heroKicker}>{block.kicker}</div> : null}
              <div className={styles.heroTitle}>{block.title}</div>
              {block.subtitle ? <div className={styles.heroSub}>{block.subtitle}</div> : null}
            </div>
          )}
        </figure>
      );
    case "lead":
      return <p className={`${styles.para} ${styles.drop}`}>{block.text}</p>;
    case "paragraph":
      return <p className={styles.para}>{block.text}</p>;
    case "stats":
      return (
        <div className={styles.stats}>
          {block.items.map((it, i) => (
            <div className={styles.stat} key={i}>
              <div className={styles.statN}>{it.n}</div>
              <div className={styles.statL}>{it.l}</div>
            </div>
          ))}
        </div>
      );
    case "matchups":
      return (
        <>
          <div className={styles.sectionLabel}>{sectionLabel}</div>
          <div className={styles.matchups}>
            {block.pairs.map((p, i) => (
              <div className={styles.mu} key={i}>
                <div className={`${styles.muSide} ${styles.muLeft}`}>
                  <div className={styles.muG}>{p.left.group}</div>
                  <div className={styles.muT}>{p.left.title}</div>
                </div>
                <div className={styles.muVs}>VS</div>
                <div className={`${styles.muSide} ${styles.muRight}`}>
                  <div className={styles.muG}>{p.right.group}</div>
                  <div className={styles.muT}>{p.right.title}</div>
                </div>
              </div>
            ))}
          </div>
          {block.note ? <p className={styles.muNote}>{block.note}</p> : null}
        </>
      );
    case "closer":
      return <p className={styles.closer}>{block.text}</p>;
    default:
      return null;
  }
}

export function ArticleView({ article }: { article: ArticleRecord }): JSX.Element {
  const { lang } = useI18n();
  const { t } = useT();
  const view = resolveArticleView(article, lang);
  const crumb = TEMPLATE_CRUMB[article.template] ?? "NEWS";

  return (
    <div className={styles.page}>
      {/* 언어 토글은 전역 Navbar가 제공(중복 방지) — §14 한/영 토글. */}
      <div className={styles.sheet}>
        <header className={styles.masthead}>
          <div className={styles.brand}>
            <svg width="26" height="20" viewBox="0 0 26 20" aria-hidden="true">
              <path
                d="M2 16 L4 5 L9 10 L13 2 L17 10 L22 5 L24 16 Z"
                fill="#FCD006"
                stroke="#1A1830"
                strokeWidth="1.2"
              />
              <rect x="3" y="16" width="20" height="2.5" fill="#1A1830" />
            </svg>
            <Link href="/news" className={styles.brandName}>
              World<em>Crown</em>48
            </Link>
          </div>
          <div className={styles.date}>{fmtDate(article.publishedAtMs ?? article.createdAtMs)}</div>
        </header>

        <div className={styles.rail}>
          <span className={styles.tag}>NEWS</span>
          <span className={styles.crumb}>{crumb}</span>
        </div>

        <article className={styles.article}>
          <h1 className={styles.headline}>{view.title}</h1>
          {view.subhead ? <p className={styles.subhead}>{view.subhead}</p> : null}

          <div className={styles.byline}>
            <span className={styles.who}>{t("news.article.byline")}</span>
            {article.evidence.asOf ? (
              <span className={styles.when}>
                {t("news.article.dataAsOf", { asOf: article.evidence.asOf })}
              </span>
            ) : null}
            {view.isFallback ? (
              <span className={styles.fallbackNote}>· original-language fallback</span>
            ) : null}
          </div>

          {view.body.map((block, i) => (
            <Block key={i} block={block} sectionLabel={crumb} />
          ))}
        </article>

        <AiReport asOf={article.evidence.asOf} />
      </div>
    </div>
  );
}
