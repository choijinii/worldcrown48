/**
 * POLICY-ES-1 Phase A — 화면 언어가 es 일 때 동의 바는 스페인어 + 영어 병기(§9 게이트 1).
 *
 * 한국어 자리(머리말 앞부분 · 제목 · ko 본문 · 버튼·'자세히'의 앞부분)만 스페인어로 바뀌고,
 * 영어 본문(.cb-body-en)과 버튼의 영어 뒷부분은 그대로다. ko·en 화면은 지금과 한 글자도
 * 다르지 않다(R1) — 그쪽은 cookieBannerCopy.test.ts(무변경)가 지킨다. 여기서는 ko 화면도
 * 한 번 더 확인한다(lang 을 실제로 주입한 경우).
 * 스페인어 문구 = 대표 승인본(되번역 표 · 2026-10-05).
 */
import { describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

const i18n = vi.hoisted(() => ({ lang: "es" as "ko" | "en" | "es" }));
vi.mock("@/lib/i18n", () => ({ useI18n: () => ({ lang: i18n.lang, setLang: () => {} }) }));
vi.mock("@/components/policy/CookieConsentProvider", () => ({
  useCookieConsent: () => ({
    bannerState: "visible",
    bannerReopened: false,
    acceptAll: async () => {},
    rejectAll: async () => {},
    openModal: () => {},
  }),
}));

import { CookieBanner } from "@/components/policy/CookieBanner";

function render(lang: "ko" | "en" | "es"): string {
  i18n.lang = lang;
  return renderToStaticMarkup(createElement(CookieBanner));
}
function text(fragment: string): string {
  return fragment.replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();
}
function byClass(html: string, cls: string, tag: string): string {
  const m = html.match(new RegExp(`<${tag}[^>]*class="[^"]*\\b${cls}\\b[^"]*"[^>]*>[\\s\\S]*?</${tag}>`));
  if (!m) throw new Error(`.${cls} <${tag}> not found`);
  return m[0];
}
function buttons(html: string): string[] {
  return Array.from(html.matchAll(/<button[^>]*class="([a-z-]+)"[^>]*>([\s\S]*?)<\/button>/g)).map((m) => text(m[2]));
}

const BODY_EN =
  "We use essential cookies to run the service. Functional, analytics, and marketing cookies are all " +
  "optional — set each category individually. See our Cookie Policy · Privacy Policy .";

const ES = {
  eyebrow: "Consentimiento de cookies · COOKIE CONSENT · GDPR",
  title: "Necesitamos tu consentimiento para tratar tus datos con respeto.",
  body:
    "WC48 utiliza las cookies esenciales necesarias para prestar el servicio; las cookies funcionales, " +
    "de análisis y de publicidad son todas opcionales. Puedes cambiar tu consentimiento por categoría. " +
    "Para más información, consulta la Política de cookies · la Política de privacidad .",
  more: "Detalles · Details",
  // 배치 C(대표 결정 ①): 버튼 안에서 스페인어 위 · 영어 아래 두 줄.
  buttons: [
    ["Solo esenciales", "Reject non-essential"],
    ["Configurar", "Customize"],
    ["Aceptar todas", "Accept all"],
  ],
};

describe("동의 바 — 화면 언어 es", () => {
  const html = render("es");

  it("머리말 · 제목 · 본문이 스페인어", () => {
    expect(text(byClass(html, "cb-eyebrow", "div"))).toBe(ES.eyebrow);
    expect(text(byClass(html, "cb-title", "h2"))).toBe(ES.title);
    expect(text(byClass(html, "cb-body", "p"))).toBe(`${ES.body} ${BODY_EN}`);
  });

  it("영어 본문은 그대로 남는다 (안전망)", () => {
    expect(text(byClass(html, "cb-body-en", "span"))).toBe(BODY_EN);
  });

  it("'자세히'와 버튼 3개 — 스페인어 · 영어 병기, 순서 그대로", () => {
    expect(buttons(html)).toEqual([ES.more, ...ES.buttons.map(([es, en]) => `${es} ${en}`)]);
  });

  it("버튼은 두 줄 — 스페인어 줄(cb-btn-es) 위 · 영어 줄(cb-btn-en) 아래", () => {
    const actions = html.slice(html.indexOf('class="cb-actions"'));
    const pairs = Array.from(
      actions.matchAll(/<span class="cb-btn-es">([^<]+)<\/span><span class="cb-btn-en">([^<]+)<\/span>/g),
    ).map((m) => [m[1], m[2]]);
    expect(pairs).toEqual(ES.buttons);
    expect(html).toContain('data-lang="es"');
  });

  it("한국어가 한 글자도 없다", () => {
    expect(text(html)).not.toMatch(/[가-힣]/);
  });

  it("정책 링크 두 개씩 그대로", () => {
    expect(html.match(/href="\/policies\/cookies"/g)?.length).toBe(2);
    expect(html.match(/href="\/policies\/privacy"/g)?.length).toBe(2);
  });
});

describe("동의 바 — 화면 언어 ko · en 은 지금 그대로 (R1)", () => {
  for (const lang of ["ko", "en"] as const) {
    it(`${lang}: 한국어 제목 · '자세히 · Details' · 기존 버튼 3개`, () => {
      const html = render(lang);
      expect(text(byClass(html, "cb-title", "h2"))).toBe("데이터를 정중하게 다루기 위한 동의가 필요합니다.");
      expect(buttons(html)).toEqual([
        "자세히 · Details",
        "필수만 · Reject non-essential",
        "설정하기 · Customize",
        "모두 허용 · Accept all",
      ]);
      expect(text(html)).not.toMatch(/[ñáéíóú¿]/i);
    });
  }
});
