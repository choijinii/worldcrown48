/**
 * COOKIE-1 Phase E — 쿠키 이벤트 4개는 분석 동의가 있을 때만 (§9 게이트 4 · 대표 2026-10-05).
 *
 * 규칙 하나(F-3): 쿠키 이벤트는 **새 동의를 적용한 뒤** 그 동의로 판단한다. 그래서
 *   · "모두 허용" → cookie_accept_all 1건 (적용이 먼저여야 한다 — 아니면 조용히 사라진다)
 *   · 설정 창 저장 → 분석 켬이면 cookie_save 1건, 끔이면 0건
 *   · "필수만" → cookie_reject 는 부르지만 언제나 0건 (거부 직후 전송은 거부 의사에 반한다)
 *   · 설정 창 열기 → 이미 분석에 동의한 팬만 cookie_customize_open 1건
 *   · cookie_banner_view 는 넣지 않는다(동의 바가 보이는 순간은 정의상 동의 전)
 * 진짜 lib/analytics 게이트를 지나게 하고 firebase/analytics 만 흉내 낸다.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  ACCEPT_ALL_PREFERENCES,
  MODAL_DEFAULT_PREFERENCES,
  REJECT_ALL_PREFERENCES,
  normalizePreferences,
} from "@/lib/cookieConsent";

const ga = vi.hoisted(() => ({
  isSupported: vi.fn(async () => true),
  getAnalytics: vi.fn(() => ({ ga: true })),
  logEvent: vi.fn(),
  setAnalyticsCollectionEnabled: vi.fn(),
}));
vi.mock("firebase/analytics", () => ga);
vi.mock("@/lib/firebase", () => ({ getFirebaseApp: () => ({}) }));

type Analytics = typeof import("@/lib/analytics");
type Events = typeof import("@/lib/policy/consentEvents");
let analytics: Analytics;
let events: Events;

beforeEach(async () => {
  vi.resetModules();
  for (const f of Object.values(ga)) f.mockClear();
  (globalThis as { window?: unknown }).window = {};
  process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID = "G-TEST";
  analytics = await import("@/lib/analytics");
  events = await import("@/lib/policy/consentEvents");
});
afterEach(() => {
  delete (globalThis as { window?: unknown }).window;
  delete process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID;
});

const deps = () => ({ applyAnalyticsConsent: analytics.setAnalyticsConsent, track: analytics.track });
const sent = () => ga.logEvent.mock.calls.map((c) => [c[1], c[2]]);

describe("분석 동의가 없을 때", () => {
  it("설정 창 열기 → 0건", async () => {
    await events.trackCustomizeOpen(analytics.track);
    expect(ga.logEvent).not.toHaveBeenCalled();
    expect(ga.getAnalytics).not.toHaveBeenCalled();
  });
});

describe("모두 허용", () => {
  it("동의를 적용한 **뒤** cookie_accept_all 1건", async () => {
    await events.recordConsentDecision("accept_all", ACCEPT_ALL_PREFERENCES, deps());
    expect(sent()).toEqual([["cookie_accept_all", { categories: "all" }]]);
  });

  it("순서: apply → track", async () => {
    const order: string[] = [];
    await events.recordConsentDecision("accept_all", ACCEPT_ALL_PREFERENCES, {
      applyAnalyticsConsent: () => order.push("apply"),
      track: async () => {
        order.push("track");
      },
    });
    expect(order).toEqual(["apply", "track"]);
  });
});

describe("설정 창 저장", () => {
  it("분석 켬 → cookie_save {functional, analytics, marketing} 1건", async () => {
    await events.recordConsentDecision("save", MODAL_DEFAULT_PREFERENCES, deps());
    expect(sent()).toEqual([["cookie_save", { functional: true, analytics: true, marketing: false }]]);
  });

  it("분석 끔 → 0건", async () => {
    const prefs = normalizePreferences({ functional: true, analytics: false, marketing: true });
    await events.recordConsentDecision("save", prefs, deps());
    expect(ga.logEvent).not.toHaveBeenCalled();
  });
});

describe("필수만 (F-3)", () => {
  it("처음 방문한 팬 → 0건", async () => {
    await events.recordConsentDecision("reject", REJECT_ALL_PREFERENCES, deps());
    expect(ga.logEvent).not.toHaveBeenCalled();
  });

  it("예전에 분석을 허용했던 팬이 바꿔도 0건 — 거부를 적용한 뒤 판단한다", async () => {
    analytics.setAnalyticsConsent(true);
    await events.recordConsentDecision("reject", REJECT_ALL_PREFERENCES, deps());
    expect(ga.logEvent).not.toHaveBeenCalled();
  });

  it("이벤트 이름·파라미터는 설계서 그대로 정의돼 있다", () => {
    expect(events.consentEventFor("reject", REJECT_ALL_PREFERENCES)).toEqual({
      event: "cookie_reject",
      params: { categories: "essential_only" },
    });
  });
});

describe("이미 분석에 동의한 팬이 설정 창을 다시 연다", () => {
  it("cookie_customize_open 1건", async () => {
    analytics.setAnalyticsConsent(true);
    await events.trackCustomizeOpen(analytics.track);
    expect(sent()).toEqual([["cookie_customize_open", {}]]);
  });
});
