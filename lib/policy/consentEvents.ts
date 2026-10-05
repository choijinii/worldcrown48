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

/**
 * 동의 버튼 한 번의 전체 순서 (리뷰 I-2 · R2 "모르면 동의 없음").
 *   · 분석을 **끄는** 결정은 저장을 기다리지 않고 바로 적용한다 — 저장이 실패하거나 계정을
 *     얻지 못해도 철회는 지켜진다.
 *   · 분석을 **켜는** 결정은 저장이 성공한 뒤에만 적용한다(법적 기록 = Firestore 문서).
 *   · 이벤트는 적용 뒤 그 동의로 판단한다(recordConsentDecision · F-3).
 * 저장 실패는 그대로 던진다 — 부르는 쪽(모달)이 편집 상태로 돌아간다.
 */
export async function commitConsentDecision(
  decision: ConsentDecision,
  prefs: ConsentPreferences,
  deps: {
    resolveUid: () => Promise<string | null>;
    save: (uid: string) => Promise<void>;
    applyAnalyticsConsent: (granted: boolean) => void;
    track: Track;
  },
): Promise<{ saved: boolean }> {
  if (!prefs.analytics) deps.applyAnalyticsConsent(false);
  const uid = await deps.resolveUid();
  if (!uid) return { saved: false };
  await deps.save(uid);
  // 적용은 동기, 이벤트 전송은 기다리지 않는다 — GA 로딩이 동의 바를 붙잡지 않게.
  void recordConsentDecision(decision, prefs, deps);
  return { saved: true };
}
