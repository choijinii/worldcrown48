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

/**
 * 리뷰 I-2 — 철회는 저장 성공을 기다리지 않는다 (R2 "모르면 동의 없음").
 * 분석을 끄는 결정은 저장 전에 바로 적용하고, 켜는 결정은 저장이 성공한 뒤에만 적용한다.
 */
describe("commitConsentDecision — 저장과 적용의 순서", () => {
  function run(opts: { analytics: boolean; uid: string | null; saveFails?: boolean }) {
    const log: string[] = [];
    const prefs = normalizePreferences({ functional: true, analytics: opts.analytics, marketing: false });
    const promise = events.commitConsentDecision(opts.analytics ? "save" : "reject", prefs, {
      resolveUid: async () => {
        log.push("uid");
        return opts.uid;
      },
      save: async () => {
        log.push("save");
        if (opts.saveFails) throw new Error("offline");
      },
      applyAnalyticsConsent: (g) => log.push(`apply:${g}`),
      track: async (e) => {
        log.push(`track:${e}`);
      },
    });
    return { log, promise };
  }

  it("철회는 저장보다 먼저 적용한다", async () => {
    const r = run({ analytics: false, uid: "u1" });
    await r.promise;
    expect(r.log.slice(0, 2)).toEqual(["apply:false", "uid"]);
  });

  it("저장이 실패해도 철회는 유지된다 (오류는 그대로 올린다)", async () => {
    const r = run({ analytics: false, uid: "u1", saveFails: true });
    await expect(r.promise).rejects.toThrow("offline");
    expect(r.log).toContain("apply:false");
    expect(r.log).not.toContain("apply:true");
  });

  it("계정을 얻지 못해도 철회는 적용되고 저장은 하지 않는다", async () => {
    const r = run({ analytics: false, uid: null });
    await expect(r.promise).resolves.toEqual({ saved: false });
    expect(r.log).toEqual(["apply:false", "uid"]);
  });

  it("동의(분석 켬)는 저장이 성공한 뒤에만 적용하고 그다음 이벤트", async () => {
    const r = run({ analytics: true, uid: "u1" });
    await expect(r.promise).resolves.toEqual({ saved: true });
    expect(r.log).toEqual(["uid", "save", "apply:true", "track:cookie_save"]);
  });

  it("동의 저장이 실패하면 켜지 않는다", async () => {
    const r = run({ analytics: true, uid: "u1", saveFails: true });
    await expect(r.promise).rejects.toThrow("offline");
    expect(r.log).not.toContain("apply:true");
  });
});
