/**
 * COOKIE-1 Phase F — 통계는 하나의 문으로 (R9 · §9 게이트 5 · 대표 2026-10-05).
 *
 * 잡으려는 사고: `track()` 에 동의 게이트가 없어, 피치 화면을 여는 것만으로(a1_pitch_view)
 * `getAnalytics()` 가 깨어나 동의 전에 GA 쿠키(_ga…)가 심어질 수 있었다(R2 위반).
 * 이제 모든 통계 이벤트는 분석 동의를 지나야 나가고, 동의 전에는 GA 를 깨우지도 않는다.
 * 이벤트 이름·파라미터·호출 위치는 그대로 — 전송 여부만 달라진다.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const ga = vi.hoisted(() => ({
  isSupported: vi.fn(async () => true),
  getAnalytics: vi.fn(() => ({ ga: true })),
  logEvent: vi.fn(),
  setAnalyticsCollectionEnabled: vi.fn(),
}));
vi.mock("firebase/analytics", () => ga);
vi.mock("@/lib/firebase", () => ({ getFirebaseApp: () => ({}) }));

type AnalyticsModule = typeof import("@/lib/analytics");
let analytics: AnalyticsModule;

const flush = () => new Promise((r) => setTimeout(r, 0));

beforeEach(async () => {
  vi.resetModules(); // 모듈 안의 동의 상태·GA 인스턴스를 매 테스트 새로
  for (const f of Object.values(ga)) f.mockClear();
  (globalThis as { window?: unknown }).window = {};
  process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID = "G-TEST";
  analytics = await import("@/lib/analytics");
});
afterEach(() => {
  delete (globalThis as { window?: unknown }).window;
  delete process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID;
});

describe("분석 동의 전", () => {
  it("track() 을 불러도 아무것도 나가지 않고 GA 를 깨우지도 않는다", async () => {
    await analytics.track("a1_pitch_view", {});
    await analytics.trackWithConsent("cookie_lang_switch", { from: "ko", to: "en", surface: "x" });
    expect(ga.logEvent).not.toHaveBeenCalled();
    expect(ga.getAnalytics).not.toHaveBeenCalled();
    expect(ga.isSupported).not.toHaveBeenCalled();
  });

  it("분석을 끈 채로 저장한 팬도 같다", async () => {
    analytics.setAnalyticsConsent(false);
    await analytics.track("a1_card_click", { position: 1 });
    expect(ga.logEvent).not.toHaveBeenCalled();
    expect(ga.getAnalytics).not.toHaveBeenCalled();
  });
});

describe("분석 동의 후", () => {
  it("track() 이 이름·파라미터 그대로 1번 나간다", async () => {
    analytics.setAnalyticsConsent(true);
    await analytics.track("a1_pitch_view", {});
    expect(ga.getAnalytics).toHaveBeenCalledTimes(1);
    expect(ga.logEvent).toHaveBeenCalledTimes(1);
    expect(ga.logEvent).toHaveBeenCalledWith({ ga: true }, "a1_pitch_view", {});
  });

  it("trackWithConsent() 도 같은 문을 지난다", async () => {
    analytics.setAnalyticsConsent(true);
    await analytics.trackWithConsent("cookie_lang_switch", { from: "ko", to: "en", surface: "x" });
    expect(ga.logEvent).toHaveBeenCalledTimes(1);
  });

  it("측정 ID 가 없는 환경에서는 예외 없이 조용히 끝난다", async () => {
    delete process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID;
    analytics.setAnalyticsConsent(true);
    await expect(analytics.track("a1_pitch_view", {})).resolves.toBeUndefined();
    expect(ga.logEvent).not.toHaveBeenCalled();
  });
});

describe("동의 철회", () => {
  it("수집 스위치를 끄고, 그 뒤로는 하나도 보내지 않는다", async () => {
    analytics.setAnalyticsConsent(true);
    await analytics.track("a1_pitch_view", {});
    expect(ga.logEvent).toHaveBeenCalledTimes(1);

    analytics.setAnalyticsConsent(false);
    await flush();
    expect(ga.setAnalyticsCollectionEnabled).toHaveBeenCalledWith({ ga: true }, false);

    await analytics.track("a1_card_click", { position: 2 });
    expect(ga.logEvent).toHaveBeenCalledTimes(1);
  });

  it("다시 동의하면 수집 스위치를 켠다", async () => {
    analytics.setAnalyticsConsent(true);
    await analytics.track("a1_pitch_view", {});
    analytics.setAnalyticsConsent(false);
    analytics.setAnalyticsConsent(true);
    await flush();
    expect(ga.setAnalyticsCollectionEnabled).toHaveBeenLastCalledWith({ ga: true }, true);
  });

  it("GA 를 깨운 적이 없으면 철회해도 GA 를 깨우지 않는다", async () => {
    analytics.setAnalyticsConsent(false);
    await flush();
    expect(ga.getAnalytics).not.toHaveBeenCalled();
    expect(ga.setAnalyticsCollectionEnabled).not.toHaveBeenCalled();
  });

  it("GA 를 기다리는 중에 동의를 거두면 그 이벤트도 보내지 않는다", async () => {
    analytics.setAnalyticsConsent(true);
    const pending = analytics.track("a1_pitch_view", {});
    analytics.setAnalyticsConsent(false);
    await pending;
    expect(ga.logEvent).not.toHaveBeenCalled();
  });
});

describe("우회로 없음 (저장소 전체)", () => {
  const ROOT = path.resolve(__dirname, "../../..");
  function walk(dir: string, out: string[]): void {
    for (const name of readdirSync(dir)) {
      if (name === "node_modules" || name === "__tests__" || name.startsWith(".")) continue;
      const full = path.join(dir, name);
      if (statSync(full).isDirectory()) walk(full, out);
      else if (/\.(ts|tsx)$/.test(name)) out.push(full);
    }
  }
  const files: string[] = [];
  for (const d of ["app", "components", "lib"]) walk(path.join(ROOT, d), files);
  const rel = (f: string) => path.relative(ROOT, f).split(path.sep).join("/");

  it("logEvent · getAnalytics 를 부르는 곳은 lib/analytics.ts 하나뿐", () => {
    const users = files
      .filter((f) => /\b(logEvent|getAnalytics)\s*\(/.test(readFileSync(f, "utf8")))
      .map(rel);
    expect(users).toEqual(["lib/analytics.ts"]);
  });

  it("firebase/analytics 를 가져오는 곳도 lib/analytics.ts 하나뿐", () => {
    const users = files
      .filter((f) => readFileSync(f, "utf8").includes('"firebase/analytics"'))
      .map(rel);
    expect(users).toEqual(["lib/analytics.ts"]);
  });

  it("bypassConsent 는 어디에도 없다 (R8)", () => {
    expect(files.filter((f) => readFileSync(f, "utf8").includes("bypassConsent")).map(rel)).toEqual([]);
  });
});
