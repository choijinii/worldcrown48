/**
 * COOKIE-1 — 동의 부품의 첫 화면 순서 (runConsentBoot).
 *
 * F-1 (대표 승인 2026-10-05 "숨긴 뒤 Firestore 복원"): 흔적 쿠키는 이제 읽히지만 카테고리 선택은
 * 담고 있지 않다. 흔적 쿠키가 있으면 동의 바는 **바로** 숨기고, 그 뒤 **이미 있는 사용자**일 때만
 * Firestore 동의 기록을 읽어 카테고리(분석 동의 포함)를 되살린다. 계정은 만들지 않는다(D-41).
 * 사용자가 없거나 읽기에 실패하면 분석은 꺼진 채(R2).
 */
import { describe, expect, it, vi } from "vitest";
import { Timestamp } from "firebase/firestore";
import { runConsentBoot } from "@/lib/cookieConsentBoot";
import type { CookieConsentDoc } from "@/lib/cookieConsent";

const SAVED = new Date("2026-10-01T00:00:00Z");

function record(analytics: boolean): CookieConsentDoc {
  return {
    uid: "u1",
    essential: true,
    functional: true,
    analytics,
    marketing: false,
    timestamp: Timestamp.fromDate(SAVED),
    expiresAt: Timestamp.fromMillis(SAVED.getTime() + 365 * 86_400_000),
    ipHash: "",
    lang: "es",
    version: "1.0",
  };
}

function harness(input: {
  cookieSavedAt: Date | null;
  uid: string | null;
  doc?: CookieConsentDoc | null | Error;
}) {
  const log: string[] = [];
  const deps = {
    cookieSavedAt: input.cookieSavedAt,
    getExistingUid: vi.fn(async () => {
      log.push("getExistingUid");
      return input.uid;
    }),
    loadConsent: vi.fn(async () => {
      log.push("loadConsent");
      if (input.doc instanceof Error) throw input.doc;
      return input.doc ?? null;
    }),
  };
  const on = {
    hideBanner: vi.fn((savedAt: Date | null) => {
      log.push(`hide:${savedAt ? "t" : "-"}`);
    }),
    showBanner: vi.fn(() => {
      log.push("show");
    }),
    applyRecord: vi.fn((r: CookieConsentDoc) => {
      log.push(`apply:${r.analytics}`);
    }),
  };
  return { deps, on, log };
}

describe("흔적 쿠키가 있을 때 (F-1)", () => {
  it("동의 바를 먼저 숨기고, 기존 사용자의 기록을 읽어 분석 동의를 되살린다", async () => {
    const h = harness({ cookieSavedAt: SAVED, uid: "u1", doc: record(true) });
    await runConsentBoot(h.deps, h.on);
    expect(h.log).toEqual(["hide:t", "getExistingUid", "loadConsent", "apply:true"]);
  });

  it("사용자가 없으면 숨긴 채로 두고 아무것도 읽지 않는다 (분석 꺼짐)", async () => {
    const h = harness({ cookieSavedAt: SAVED, uid: null });
    await runConsentBoot(h.deps, h.on);
    expect(h.log).toEqual(["hide:t", "getExistingUid"]);
    expect(h.on.showBanner).not.toHaveBeenCalled();
  });

  it("기록 읽기가 실패해도 다시 묻지 않는다 (숨김 유지 · 분석 꺼짐)", async () => {
    const h = harness({ cookieSavedAt: SAVED, uid: "u1", doc: new Error("offline") });
    await runConsentBoot(h.deps, h.on);
    expect(h.on.showBanner).not.toHaveBeenCalled();
    expect(h.on.applyRecord).not.toHaveBeenCalled();
  });

  it("기록이 없어도(계정 삭제 등) 흔적 쿠키를 믿고 숨긴 채로 둔다", async () => {
    const h = harness({ cookieSavedAt: SAVED, uid: "u1", doc: null });
    await runConsentBoot(h.deps, h.on);
    expect(h.on.showBanner).not.toHaveBeenCalled();
  });
});

describe("흔적 쿠키가 없을 때", () => {
  it("첫 방문(사용자 없음) — 계정을 만들지 않고 동의 바를 보인다", async () => {
    const h = harness({ cookieSavedAt: null, uid: null });
    await runConsentBoot(h.deps, h.on);
    expect(h.log).toEqual(["getExistingUid", "show"]);
  });

  it("기존 사용자 + 유효한 기록 — 카테고리를 되살리고 숨긴다", async () => {
    const h = harness({ cookieSavedAt: null, uid: "u1", doc: record(false) });
    await runConsentBoot(h.deps, h.on);
    expect(h.log).toEqual(["getExistingUid", "loadConsent", "apply:false", "hide:-"]);
  });

  it("기존 사용자인데 기록이 없거나 읽기 실패 — 동의 바를 보인다", async () => {
    for (const doc of [null, new Error("x")]) {
      const h = harness({ cookieSavedAt: null, uid: "u1", doc });
      await runConsentBoot(h.deps, h.on);
      expect(h.on.showBanner).toHaveBeenCalledTimes(1);
    }
  });
});
