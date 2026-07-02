"use client";

/**
 * M5a · NewsFeedItem — thumb + source + 2-line title + date + ext-link.
 *
 * AI-Report branch (handoff §1.2 ⑤ / §9 trap 4): when isAiReport(source), the
 * card gets a gold left border (`.nfi.ai`) AND a FOOTER `✦ AI-Report` — never
 * the old top `REPORT` tag / `● AI-Report` byline (v2.4 Footer-Only Lock).
 */

import { isAiReport, type NewsItem } from "@/lib/pitch/newsroom";
import { track } from "@/lib/analytics";
import { useT } from "@/lib/i18n/useT";

function ExtIcon() {
  return (
    <span className="nfi-ext" aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 6h9v9M18 6l-12 12" />
      </svg>
    </span>
  );
}

export interface NewsFeedItemProps {
  item: NewsItem;
  position: number;
}

export function NewsFeedItem({ item, position }: NewsFeedItemProps) {
  const { t } = useT();
  const ai = isAiReport(item.source);
  return (
    <article
      className={`nfi${ai ? " ai" : ""}`}
      onClick={() =>
        track("a1_news_click", { source: item.source, isAiReport: ai, position })
      }
    >
      <img
        className="nfi-thumb"
        src={item.imageUrl}
        alt=""
        loading="lazy"
        referrerPolicy="no-referrer"
      />
      <div className="nfi-body">
        <div className="nfi-top">
          <span className="nfi-source">{item.source}</span>
        </div>
        <div className="nfi-title">{item.title}</div>
        <div className="nfi-date">{t("pitch.news.hoursAgo", { count: item.hoursAgo })}</div>
        {ai && <div className="nfi-report">✦ AI-Report</div>}
      </div>
      <ExtIcon />
    </article>
  );
}
