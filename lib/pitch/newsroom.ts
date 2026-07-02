/**
 * A-1 NewsroomFeed merge logic (Domain 1 · The Pitch).
 *
 * The Pitch newsroom blends two streams into one recency-ordered feed:
 *   - keyword news (GNews wires in production; bilingual stand-ins for MVP1)
 *   - WC48 Fan Intelligence "AI-Report" items (operator-authored, MVP1.5)
 *
 * AI-vs-keyword is decided in ONE place — `isAiReport` (handoff §5). The
 * component uses it to add the gold left-border + `✦ AI-Report` footer
 * (v2.4 Footer-Only Lock — the card byline `● AI-Report` is forbidden,
 * handoff §1.2 ⑤ / §9 trap 4).
 */

export interface NewsItem {
  id: string;
  source: string;
  title: string;
  /** Relative-time input for the `pitch.news.hoursAgo` catalog key (e.g. 2 → "2h ago" in en). */
  hoursAgo: number;
  imageUrl: string;
  /** Epoch ms used only for ordering the merged feed. */
  publishedAt: number;
}

/** The merged feed shows at most this many items before the "See more" CTA. */
export const NEWS_FEED_LIMIT = 6;

/**
 * An item is a Fan Intelligence AI-Report iff its source names it. This is the
 * single source of truth for the AI branch — never re-derived elsewhere.
 */
export function isAiReport(source: string): boolean {
  return source.includes("Fan Intelligence");
}

/**
 * Merge the AI-Report and keyword streams into one feed, newest first, capped
 * at NEWS_FEED_LIMIT. Recency ordering is what naturally interleaves the two
 * streams (wireframe line 693 shows the resulting 2-AI / 4-keyword shape).
 */
export function mergeNewsFeed(ai: NewsItem[], keyword: NewsItem[]): NewsItem[] {
  return [...ai, ...keyword]
    .slice()
    .sort((a, b) => b.publishedAt - a.publishedAt)
    .slice(0, NEWS_FEED_LIMIT);
}
