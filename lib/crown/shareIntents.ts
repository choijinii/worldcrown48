/**
 * C-2 Crown Card · share intents — pure share-target helpers.
 *
 * Ported from the wireframe shareX (line 1359-1366) and the Web Share feature
 * detect in nativeShare (line 1347-1358). Kept pure (no DOM, no navigator
 * captured at module scope) so the X-intent string and the share-capability
 * branch are unit-testable (handoff §11.2 — AC-7, AC-8).
 *
 * UTM 자동 부착(2026-08-29 대표 확정, marketing-instrumentation-kick.md 묶음②):
 * 크라운 카드에서 나가는 모든 공유 링크에 utm_medium=share·utm_campaign=crown_card를
 * 붙이고, utm_source만 채널별로 갈아끼운다(X="x", 네이티브 공유 시트="share_sheet").
 * EVENT_SPEC.md "유입 출처 비중 = utm_medium share/owned 비중" 요건과 정합.
 * 화면에 보이는 카드 이미지(QR·"WorldCrown48.com" 문구)는 건드리지 않는다 — 그건
 * 별도 소킥(딥링크화)의 몫이라 지금은 손대지 않는다.
 */

/** Campaign hashtag appended to every Champion tweet. */
export const TWEET_HASHTAG = "#WorldCrown48";

/** utm_medium/utm_campaign shared by every Crown Card share channel — only utm_source varies. */
export const CROWN_SHARE_UTM = { medium: "share", campaign: "crown_card" } as const;

/**
 * Append the Crown Card share campaign's UTM parameters to `hostUrl` (a bare
 * host like "worldcrown48.com", no protocol) so GA can attribute traffic to
 * the channel it came from. `source` identifies the channel (e.g. "x" for the
 * X intent, "share_sheet" for the native Web Share sheet).
 */
export function withShareUtm(hostUrl: string, source: string): string {
  const url = new URL(`https://${hostUrl}`);
  url.searchParams.set("utm_source", source);
  url.searchParams.set("utm_medium", CROWN_SHARE_UTM.medium);
  url.searchParams.set("utm_campaign", CROWN_SHARE_UTM.campaign);
  return url.toString();
}

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
    url: withShareUtm(hostUrl, "x"),
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
