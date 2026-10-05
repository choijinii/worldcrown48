/**
 * COOKIE-1 검수 1 (대표 2026-10-05 · R2) — 늦게 도착한 부팅 기록이 새 선택을 덮어쓰지 않는다.
 *
 * 사고 시나리오: 흔적 쿠키로 동의 바를 숨긴 채 부팅이 Firestore 기록을 읽는 중에 팬이
 * '다시 열기 → 필수만'을 누른다. 그 뒤 옛 기록(모두 허용)이 도착해 applyRecord 가 분석을
 * 다시 켜면, 방금 거부한 팬의 통계가 나간다. → 이 세션에서 팬이 동의 버튼을 한 번이라도
 * 누른 뒤에는 늦게 도착한 부팅 결과를 버린다.
 *
 * 진짜 lib/analytics 게이트 · runConsentBoot · commitConsentDecision 을 그대로 엮고
 * firebase/analytics 만 흉내 낸다.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Timestamp } from "firebase/firestore";
import { ACCEPT_ALL_PREFERENCES, REJECT_ALL_PREFERENCES, type CookieConsentDoc } from "@/lib/cookieConsent";

const ga = vi.hoisted(() => ({
  isSupported: vi.fn(async () => true),
  getAnalytics: vi.fn(() => ({ ga: true })),
  logEvent: vi.fn(),
  setAnalyticsCollectionEnabled: vi.fn(),
}));
vi.mock("firebase/analytics", () => ga);
vi.mock("@/lib/firebase", () => ({ getFirebaseApp: () => ({}) }));

type Analytics = typeof import("@/lib/analytics");
type Boot = typeof import("@/lib/cookieConsentBoot");
type Events = typeof import("@/lib/policy/consentEvents");
let analytics: Analytics;
let boot: Boot;
let events: Events;

beforeEach(async () => {
  vi.resetModules();
  for (const f of Object.values(ga)) f.mockClear();
  (globalThis as { window?: unknown }).window = {};
  process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID = "G-TEST";
  analytics = await import("@/lib/analytics");
  boot = await import("@/lib/cookieConsentBoot");
  events = await import("@/lib/policy/consentEvents");
});
afterEach(() => {
  delete (globalThis as { window?: unknown }).window;
  delete process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID;
});

const SAVED = new Date("2026-10-01T00:00:00Z");
const OLD_ACCEPT_ALL: CookieConsentDoc = {
  uid: "u1",
  essential: true,
  functional: true,
  analytics: true,
  marketing: true,
  timestamp: Timestamp.fromDate(SAVED),
  expiresAt: Timestamp.fromMillis(SAVED.getTime() + 365 * 86_400_000),
  ipHash: "",
  lang: "ko",
  version: "1.0",
};

/** Provider 와 같은 배선 — 팬이 동의 버튼을 누르면 acted 가 켜진다. */
function harness(cookieSavedAt: Date | null) {
  let acted = false;
  let release!: (r: CookieConsentDoc | null) => void;
  const pendingRecord = new Promise<CookieConsentDoc | null>((r) => {
    release = r;
  });
  const banner: string[] = [];

  const booting = boot.runConsentBoot(
    {
      cookieSavedAt,
      getExistingUid: async () => "u1",
      loadConsent: () => pendingRecord, // 부팅 읽기가 늦게 온다
      userActed: () => acted,
    },
    {
      hideBanner: () => banner.push("hide"),
      showBanner: () => banner.push("show"),
      applyRecord: (r) => analytics.setAnalyticsConsent(r.analytics),
    },
  );

  const pressReject = async () => {
    acted = true; // Provider: persistAndHide 첫 줄
    await events.commitConsentDecision("reject", REJECT_ALL_PREFERENCES, {
      resolveUid: async () => "u1",
      save: async () => {},
      applyAnalyticsConsent: analytics.setAnalyticsConsent,
      track: analytics.track,
    });
  };
  return { booting, release, pressReject, banner };
}

describe("부팅 읽기 도중 '필수만' → 옛 기록(모두 허용)이 나중에 도착", () => {
  it("흔적 쿠키 경로: 분석은 꺼진 채, track() 전송 0건", async () => {
    const h = harness(SAVED);
    await Promise.resolve();
    await h.pressReject();
    h.release(OLD_ACCEPT_ALL); // 옛 기록이 이제 도착
    await h.booting;

    await analytics.track("a1_pitch_view", {});
    await analytics.trackWithConsent("cookie_lang_switch", { from: "ko", to: "en", surface: "x" });
    expect(ga.logEvent).not.toHaveBeenCalled();
    expect(ga.getAnalytics).not.toHaveBeenCalled();
  });

  it("흔적 없는 경로: 늦은 기록이 동의 바를 다시 숨기거나 보이게 하지도 않는다", async () => {
    const h = harness(null);
    await Promise.resolve();
    await h.pressReject();
    h.release(OLD_ACCEPT_ALL);
    await h.booting;

    expect(h.banner).toEqual([]);
    await analytics.track("a1_card_click", { position: 1 });
    expect(ga.logEvent).not.toHaveBeenCalled();
  });

  it("팬이 아무것도 누르지 않았으면 기록은 그대로 복원된다 (F-1 유지)", async () => {
    const h = harness(SAVED);
    h.release(OLD_ACCEPT_ALL);
    await h.booting;
    await analytics.track("a1_pitch_view", {});
    expect(ga.logEvent).toHaveBeenCalledTimes(1);
  });

  it("거꾸로 — 옛 기록이 '필수만'이고 팬이 방금 '모두 허용'을 눌렀어도 새 선택이 이긴다", async () => {
    let acted = false;
    let release!: (r: CookieConsentDoc | null) => void;
    const booting = boot.runConsentBoot(
      {
        cookieSavedAt: SAVED,
        getExistingUid: async () => "u1",
        loadConsent: () => new Promise((r) => (release = r)),
        userActed: () => acted,
      },
      { hideBanner: () => {}, showBanner: () => {}, applyRecord: (r) => analytics.setAnalyticsConsent(r.analytics) },
    );
    await Promise.resolve();
    acted = true;
    await events.commitConsentDecision("accept_all", ACCEPT_ALL_PREFERENCES, {
      resolveUid: async () => "u1",
      save: async () => {},
      applyAnalyticsConsent: analytics.setAnalyticsConsent,
      track: analytics.track,
    });
    release({ ...OLD_ACCEPT_ALL, analytics: false });
    await booting;
    ga.logEvent.mockClear();
    await analytics.track("a1_pitch_view", {});
    expect(ga.logEvent).toHaveBeenCalledTimes(1);
  });
});
