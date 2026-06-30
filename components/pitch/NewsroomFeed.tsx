"use client";

/**
 * M5 · NewsroomFeed — "Around the Pitch" merged feed.
 *
 * Blends keyword wires + Fan Intelligence AI-Reports via mergeNewsFeed
 * (recency-ordered, capped at 6 — unit-tested). For MVP1 the items are
 * bilingual-static stand-ins verbatim from the wireframe (lines 656-665);
 * live GNews + operator-authored AI-Reports land in MVP1.5. `data-news`
 * reflects loaded/empty (loading/partial are operator/runtime states).
 */

import { mergeNewsFeed, type NewsItem } from "@/lib/pitch/newsroom";
import { track } from "@/lib/analytics";
import { NewsFeedItem } from "./NewsFeedItem";

/* publishedAt values are chosen so the recency merge reproduces the wireframe
   line 693 interleave: [ai0, kw0, kw1, ai1, kw2, kw3]. */
const KEYWORD_NEWS: NewsItem[] = [
  { id: "news-kw-1", source: "Reuters", title: "A new generation of forwards steps into the global spotlight this summer", date: "2시간 전", imageUrl: "https://picsum.photos/seed/wc48-news-kw1/176/144", publishedAt: 55 },
  { id: "news-kw-2", source: "ESPN", title: "Why fan-vote tournaments are reshaping how supporters engage with the game", date: "4시간 전", imageUrl: "https://picsum.photos/seed/wc48-news-kw2/176/144", publishedAt: 40 },
  { id: "news-kw-3", source: "The Athletic", title: "Tactical trends: the modern striker's evolving role across leagues", date: "6시간 전", imageUrl: "https://picsum.photos/seed/wc48-news-kw3/176/144", publishedAt: 20 },
  { id: "news-kw-4", source: "Goal", title: "Rising stars to watch as the season gets underway worldwide", date: "9시간 전", imageUrl: "https://picsum.photos/seed/wc48-news-kw4/176/144", publishedAt: 10 },
];

const AI_REPORTS: NewsItem[] = [
  { id: "news-ai-1", source: "WC48 · Fan Intelligence", title: "Top 5 strikers fans voted for — a global fan-vote report", date: "1시간 전", imageUrl: "https://picsum.photos/seed/wc48-news-ai1/176/144", publishedAt: 60 },
  { id: "news-ai-2", source: "WC48 · Fan Intelligence", title: "Upsets by vote share: late-stage ranking shifts, analyzed", date: "3시간 전", imageUrl: "https://picsum.photos/seed/wc48-news-ai2/176/144", publishedAt: 30 },
];

const SKELETON_KEYS = ["n1", "n2", "n3", "n4", "n5", "n6"];

export function NewsroomFeed() {
  const items = mergeNewsFeed(AI_REPORTS, KEYWORD_NEWS);
  const state = items.length > 0 ? "loaded" : "empty";

  return (
    <section className="newsroom" data-news={state} aria-label="Newsroom">
      <div className="sec-head">
        <div>
          <div className="sec-kicker">뉴스룸 · Newsroom</div>
          <h2 className="sec-title">Around the Pitch</h2>
        </div>
        <span className="sec-count">Powered by GNews</span>
      </div>

      <div className="news-feed">
        {items.map((item, i) => (
          <NewsFeedItem key={item.id} item={item} position={i} />
        ))}
      </div>

      <div className="news-skel" aria-hidden="true">
        {SKELETON_KEYS.map((k) => (
          <div className="nskel" key={k} />
        ))}
      </div>

      <div className="news-empty">
        <img src="/brand/wc48-crown-outline.svg" alt="" width={48} />
        <div className="et">곧 다채로운 뉴스가 도착합니다</div>
        <div className="es">Fresh news is on the way — check back soon.</div>
      </div>

      <button
        className="see-more"
        type="button"
        onClick={() => track("a1_see_more_click", { destination: "arena_newsroom" })}
      >
        더 보기 · See more in the Arena Newsroom
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="4" y1="12" x2="18" y2="12" />
          <polyline points="12 6 18 12 12 18" />
        </svg>
      </button>
    </section>
  );
}
