/**
 * C-2 Crown Card · share intents — pure share-target helpers.
 *
 * Ported from the wireframe shareX (line 1359-1366) and the Web Share feature
 * detect in nativeShare (line 1347-1358). Kept pure (no DOM, no navigator
 * captured at module scope) so the X-intent string and the share-capability
 * branch are unit-testable (handoff §11.2 — AC-7, AC-8).
 *
 * UTM 자동 부착(2026-08-29 대표 확정, marketing-instrumentation-kick.md 묶음②):
 * 크라운 카드에서 나가는 모든 공유 링크에 utm_medium=share를 붙이고,
 * utm_source만 채널별로 갈아끼운다(X="x", 네이티브 공유 시트="share_sheet").
 * EVENT_SPEC.md "유입 출처 비중 = utm_medium share/owned 비중" 요건과 정합.
 *
 * UTM_RULES v1.0 반영(marketing/00_strategy/UTM_RULES_v1.0.md · 마케팅 2026-08-28,
 * 대표 승인 2026-08-31 A안): utm_campaign은 전 채널 고정값(crown_card)이 아니라
 * "어느 토너먼트에서 나온 공유인지"를 말하는 값이다 — 편집기에서 입력한 캠페인
 * 이름표(Tournament.campaignSlug, 예: best_stage_48), 없으면 대회 ID 정규화값,
 * 토너먼트 밖 공유는 "site". 값은 championLoader.toCrownData가 CrownData.campaign
 * 으로 한 번만 계산하고, 이 모듈은 받은 값을 그대로 붙인다(URL 문자열에서
 * 대회 ID를 다시 뽑지 않는다). utm_content=crown_card는 소재 구분용 신설 항목.
 */

/** Campaign hashtag appended to every Champion tweet. */
export const TWEET_HASHTAG = "#WorldCrown48";

/** utm_medium shared by every Crown Card share channel — only utm_source varies. */
export const CROWN_SHARE_UTM = { medium: "share" } as const;

/** utm_content — 소재 구분, 크라운 카드 공유는 전 채널 공통. */
const CROWN_SHARE_CONTENT = "crown_card";

/** utm_campaign for shares made outside any Tournament (UTM_RULES v1.0 §1). */
export const SITE_CAMPAIGN = "site";

/**
 * Append the Crown Card share UTM parameters to `hostUrl` (a bare host or
 * host+path like "worldcrown48.com/arena/{id}/champion", no protocol) so GA can
 * attribute traffic. `source` identifies the channel ("x" for the X intent,
 * "share_sheet" for the native Web Share sheet); `campaign` is the Tournament's
 * campaign value from CrownData.campaign — omit it only for 토너먼트 밖 공유.
 */
export function withShareUtm(hostUrl: string, source: string, campaign: string = SITE_CAMPAIGN): string {
  const url = new URL(`https://${hostUrl}`);
  url.searchParams.set("utm_source", source);
  url.searchParams.set("utm_medium", CROWN_SHARE_UTM.medium);
  url.searchParams.set("utm_campaign", campaign || SITE_CAMPAIGN);
  url.searchParams.set("utm_content", CROWN_SHARE_CONTENT);
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
export function buildTweetIntent(
  championName: string,
  hostUrl: string,
  campaign: string = SITE_CAMPAIGN,
): string {
  const params = new URLSearchParams({
    text: `${championName} is my Champion 👑 ${TWEET_HASHTAG}`,
    url: withShareUtm(hostUrl, "x", campaign),
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
