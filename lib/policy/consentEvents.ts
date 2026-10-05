/**
 * consentEvents — 쿠키 동의 이벤트 (COOKIE-1 Phase E · §9 게이트 4 · 대표 2026-10-05).
 *
 * 몇 명이 분석까지 허용하는지 GA4 에서 보되, **동의 전에는 아무것도 보내지 않는다**(R2 · R8).
 * 모든 이벤트는 lib/analytics 의 같은 문(track)을 지난다 — 우회로 없음.
 *
 * 규칙 하나(F-3): 결정 이벤트는 **새 동의를 적용한 뒤** 그 동의로 판단한다.
 *   모두 허용 → cookie_accept_all · 설정 저장(분석 켬) → cookie_save · 필수만 → 언제나 0건.
 * 넣지 않는 것: cookie_banner_view (동의 바가 보이는 순간은 정의상 동의 전).
 * 허용한 사람만 세어지므로 동의율로 읽지 않는다.
 * 이벤트 이름·파라미터 = docs/handoffs/E1-policy-hub-handoff.md 원안.
 */
import type { ConsentPreferences } from "@/lib/cookieConsent";

export type ConsentDecision = "accept_all" | "reject" | "save";

type Params = Record<string, string | boolean>;
type Track = (event: string, params: Params) => Promise<void>;

export function consentEventFor(
  decision: ConsentDecision,
  prefs: ConsentPreferences,
): { event: string; params: Params } {
  switch (decision) {
    case "accept_all":
      return { event: "cookie_accept_all", params: { categories: "all" } };
    case "reject":
      return { event: "cookie_reject", params: { categories: "essential_only" } };
    case "save":
      return {
        event: "cookie_save",
        params: { functional: prefs.functional, analytics: prefs.analytics, marketing: prefs.marketing },
      };
  }
}

/** 저장이 끝난 결정을 적용하고(먼저), 그 동의로 이벤트를 보낸다(나중). */
export async function recordConsentDecision(
  decision: ConsentDecision,
  prefs: ConsentPreferences,
  deps: { applyAnalyticsConsent: (granted: boolean) => void; track: Track },
): Promise<void> {
  deps.applyAnalyticsConsent(prefs.analytics);
  const { event, params } = consentEventFor(decision, prefs);
  await deps.track(event, params);
}

/** 설정 창 열기 — 이미 분석에 동의한 팬만 실제로 기록된다(게이트가 거른다). */
export function trackCustomizeOpen(track: Track): Promise<void> {
  return track("cookie_customize_open", {});
}
