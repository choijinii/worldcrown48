/**
 * C-2 Crown Card · share intents — pure share-target helpers.
 *
 * Ported from the wireframe shareX (line 1359-1366) and the Web Share feature
 * detect in nativeShare (line 1347-1358). Kept pure (no DOM, no navigator
 * captured at module scope) so the X-intent string and the share-capability
 * branch are unit-testable (handoff §11.2 — AC-7, AC-8).
 */

/** Campaign hashtag appended to every Champion tweet. */
export const TWEET_HASHTAG = "#WorldCrown48";

/** Minimal slice of `navigator` this module reads. */
export interface ShareCapableNavigator {
  canShare?: (data: { files: unknown[] }) => boolean;
  share?: (data: unknown) => Promise<void>;
}

/**
 * Build the X (Twitter) web-intent URL for a Champion. Both params are
 * percent-encoded by URLSearchParams, so a name containing `&` or `#` can never
 * break out into another query parameter.
 */
export function buildTweetIntent(championName: string, hostUrl: string): string {
  const params = new URLSearchParams({
    text: `${championName} is my Champion 👑 ${TWEET_HASHTAG}`,
    url: `https://${hostUrl}`,
  });
  return `https://twitter.com/intent/tweet?${params.toString()}`;
}

/**
 * Feature-detect whether the browser can share image files via the Web Share
 * API. True only on browsers that implement `navigator.canShare({files})` and
 * accept this file (mobile Safari / Chrome). Desktop and older browsers → false,
 * so callers fall back to a download (AC-8). Never throws.
 */
export function canShareFiles(nav: ShareCapableNavigator | undefined, file: unknown): boolean {
  if (!nav || typeof nav.canShare !== "function") return false;
  try {
    return nav.canShare({ files: [file] });
  } catch {
    return false;
  }
}
