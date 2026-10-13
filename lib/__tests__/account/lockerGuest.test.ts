/**
 * NAV-1 (정본 v4 40 · 41) — Locker Room 비로그인 안내 화면.
 *
 * 비로그인(익명 포함)은 `/` 로 쫓아내지 않고 그 자리에서 안내를 본다. 안내문은 대표 승인
 * 문구(2026-10-13)라 글자 단위로 못 박는다. 로그인 버튼 글자는 저장 잠금 승인본(lockCopy)의
 * cta 를 그대로 쓴다 — 새 문구를 짓지 않는다.
 */
import { describe, expect, it } from "vitest";
import { accountView } from "@/lib/account/accountView";
import { MESSAGES } from "@/lib/i18n/messages";
import { LOCK_COPY } from "@/lib/crown/lockCopy";

describe("accountView — 어느 화면을 보이나", () => {
  it("인증 확인 중 = loading", () => {
    expect(accountView({ loading: true, user: null })).toBe("loading");
  });
  it("로그인 안 함 = guest(안내 화면, 리다이렉트 아님)", () => {
    expect(accountView({ loading: false, user: null })).toBe("guest");
  });
  it("익명 계정도 guest", () => {
    expect(accountView({ loading: false, user: { isAnonymous: true } })).toBe("guest");
  });
  it("로그인 = account(계정 화면)", () => {
    expect(accountView({ loading: false, user: { isAnonymous: false } })).toBe("account");
  });
});

describe("안내문 — 대표 승인 2026-10-13 (글자 그대로)", () => {
  it("3언어", () => {
    expect(MESSAGES["locker.guest.body"]).toEqual({
      ko: "로그인과 함께 크라운 카드와 기록을 모아 볼 수 있어요.",
      en: "Sign in to see all your Crown Cards and history in one place.",
      es: "Inicia sesión para ver todas tus Crown Cards y tu historial en un solo lugar.",
    });
  });
  it("눈썹 · 제목은 3언어 같은 이름", () => {
    expect(MESSAGES["locker.guest.eyebrow"]).toEqual({ ko: "LOCKER ROOM", en: "LOCKER ROOM", es: "LOCKER ROOM" });
    expect(MESSAGES["locker.guest.title"]).toEqual({ ko: "Locker Room", en: "Locker Room", es: "Locker Room" });
  });
  it("로그인 버튼 = 저장 잠금 승인본 cta 재사용", () => {
    expect(LOCK_COPY.ko.cta).toBe("로그인");
    expect(LOCK_COPY.en.cta).toBe("Sign in");
    expect(LOCK_COPY.es.cta).toBe("Iniciar sesión");
  });
  it("'표' 낱말이 없다", () => {
    for (const k of ["locker.guest.body", "locker.guest.eyebrow", "locker.guest.title"] as const) {
      expect(MESSAGES[k].ko).not.toMatch(/표/);
    }
  });
});
