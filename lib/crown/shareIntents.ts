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
 * UTM_RULES v1.0 반영(2026-08-31 대표 확정, marketing/UTM_RULES_v1.0.md):
 * utm_campaign을 전 채널 고정값(crown_card)에서 "어느 토너먼트에서 나온
 * 공유인지" 구분되게 바꾼다. 마케팅 문서엔 4개 런칭 대회의 "슬러그" 이름이
 * 적혀 있지만, 그 이름들이 실제 Firestore 대회 문서 ID와 연결된 근거가
 * 코드·데이터 어디에도 없어(2026-08-31 티오 확인 — Tournament 타입 자체에
 * slug 필드가 없음) 지금은 대회 ID를 그대로 campaign 값으로 쓴다.
 * TOURNAMENT_SLUGS에 실제 "대회ID → 마케팅 슬러그" 매칭을 채워 넣으면 그
 * 값이 우선 적용된다 — 대표 확인 후 채워 넣을 자리(빈 채로 둬도 안전하게
 * 대회 ID로 폴백한다). utm_content=crown_card는 신설 항목.
 */

/** Campaign hashtag appended to every Champion tweet. */
export const TWEET_HASHTAG = "#WorldCrown48";

/** utm_medium shared by every Crown Card share channel — only utm_source varies. */
export const CROWN_SHARE_UTM = { medium: "share" } as const;

/** utm_content — 소재 구분, 크라운 카드 공유는 전 채널 공통. */
const CROWN_SHARE_CONTENT = "crown_card";

/**
 * 실제 대회 ID → 마케팅 확정 슬러그. 지금은 비어 있다 — 대표님이 확인해주신
 * "대회ID / 이름" 대응표를 채우면 그 값이 utm_campaign에 그대로 쓰인다.
 * 예: "AbCdEf123456": "best_stage_48",
 */
export const TOURNAMENT_SLUGS: Record<string, string> = {};

/**
 * `hostUrl`(예: "worldcrown48.com/arena/{tournamentId}/champion")에서
 * 대회 ID를 뽑아 utm_campaign 값을 만든다. 대회 경로가 아니면(토너먼트 밖
 * 공유) UTM_RULES v1.0 §1의 "site"로 떨어진다.
 */
function campaignFor(hostUrl: string): string {
  const match = hostUrl.match(/\/arena\/([^/]+)\/champion/);
  if (!match) return "site";
  const tournamentId = match[1];
  return TOURNAMENT_SLUGS[tournamentId] ?? tournamentId;
}

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
  url.searchParams.set("utm_campaign", campaignFor(hostUrl));
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
