/**
 * POLICY-ES-1 Phase B — 설정 창 es (한국어 줄 자리를 스페인어 줄로 · 대표 승인표).
 *
 * 설정 창은 줄마다 `.ml-ko` / `.ml-en` 을 함께 그리고 `.modal[data-ml]` CSS 로 한쪽만 보인다.
 * 지금까지 es 숨김 규칙이 없어 es 화면에서는 한국어·영어가 **둘 다** 보였다.
 * → 모든 `.ml-ko` 자리에 `.ml-es` 짝을 두고, es 에서는 `.ml-es` 만, ko·en 에서는 `.ml-es` 를 숨긴다.
 * 머리 언어 버튼은 KO · EN · ES (대표 결정 ④ — 정책 페이지 탭과 같게).
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

const i18n = vi.hoisted(() => ({ lang: "es" as "ko" | "en" | "es" }));
vi.mock("@/lib/i18n", () => ({ useI18n: () => ({ lang: i18n.lang, setLang: () => {} }) }));
vi.mock("@/components/policy/CookieConsentProvider", () => ({
  useCookieConsent: () => ({
    modalState: "open",
    preferences: { essential: true, functional: true, analytics: true, marketing: false },
    lastSavedAt: null,
    closeModal: () => {},
    savePreferences: async () => {},
  }),
}));

import { ConsentModal } from "@/components/policy/ConsentModal";

const ROOT = path.resolve(__dirname, "../../..");
const text = (h: string) => h.replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();
function render(lang: "ko" | "en" | "es"): string {
  i18n.lang = lang;
  return renderToStaticMarkup(createElement(ConsentModal));
}
function spans(html: string, cls: string): string[] {
  const out: string[] = [];
  const re = new RegExp(`<span class="${cls}">`, "g");
  for (let m = re.exec(html); m; m = re.exec(html)) {
    // 같은 태그 중첩을 세어 짝이 되는 </span> 까지
    let depth = 0;
    const tag = /<span\b[^>]*>|<\/span>/g;
    tag.lastIndex = m.index;
    for (let t = tag.exec(html); t; t = tag.exec(html)) {
      depth += t[0] === "</span>" ? -1 : 1;
      if (depth === 0) {
        out.push(text(html.slice(m.index, t.index + t[0].length)));
        break;
      }
    }
  }
  return out;
}

/** 대표 승인표(outputs/POLICY-ES-1_문구승인표_2026-10-05.md §2) 순서 그대로. */
const ES = [
  "Preferencias de cookies · COOKIE PREFERENCES",
  "¿Qué datos nos permites usar?",
  "ESSENTIAL · Esenciales",
  "Cookies necesarias para que el servicio funcione",
  "Sesión iniciada, tokens de seguridad, preferencia de idioma, etc. Son necesarias para que el servicio funcione. No se pueden desactivar.",
  "ALWAYS ON · Siempre activas — no se pueden cambiar",
  "FUNCTIONAL · Funcionales",
  "Funciones de comodidad y personalización",
  "Cookies para funciones de comodidad como los Tournaments vistos recientemente, el idioma preferido y el autocompletado del apodo de fan. Si las desactivas, algunas de estas funciones se reiniciarán en cada visita.",
  "ANALYTICS · Análisis",
  "Flujo de selecciones y estadísticas de uso de las páginas",
  "Contamos de forma anónima qué Tournaments son populares y en qué punto se abandona la navegación. No guardamos información que permita identificarte.",
  "MARKETING · Publicidad",
  "Publicidad basada en tus intereses",
  "Cookies para recomendarte Tournaments y contenido de socios relacionados con tus categorías preferidas. Desactivarlas no elimina la publicidad: solo hace que sea menos relevante.",
  "Último guardado ninguno",
  "Solo esenciales",
  "Guardar selección · Save preferences",
];

describe("설정 창 — es 줄", () => {
  const html = render("es");

  it("모든 한국어 줄에 스페인어 짝이 있다 (개수 같음)", () => {
    expect(spans(html, "ml-es").length).toBe(spans(html, "ml-ko").length);
  });

  it("스페인어 줄 = 승인 문구, 순서 그대로", () => {
    expect(spans(html, "ml-es")).toEqual(ES);
  });

  it("스페인어 줄에 한국어가 없다", () => {
    for (const s of spans(html, "ml-es")) expect(s).not.toMatch(/[가-힣]/);
  });

  it("머리 언어 버튼 KO · EN · ES, es 가 눌린 상태", () => {
    const group = html.slice(html.indexOf('aria-label="Modal language"'));
    const labels = Array.from(group.matchAll(/<button[^>]*aria-pressed="(true|false)"[^>]*>([^<]+)<\/button>/g))
      .slice(0, 3)
      .map((m) => `${m[2]}:${m[1]}`);
    expect(labels).toEqual(["KO:false", "EN:false", "ES:true"]);
  });

  it("ko · en 줄 글자는 지금 그대로 (R1)", () => {
    const ko = render("ko");
    expect(spans(ko, "ml-ko")[1]).toBe("어떤 데이터를 허용하시겠어요?");
    expect(spans(ko, "ml-en")[1]).toBe("What data may we use?");
    expect(spans(ko, "ml-ko").at(-1)).toBe("선택 저장 · Save preferences");
  });
});

describe("설정 창 — 언어별 숨김 CSS", () => {
  const css = readFileSync(path.join(ROOT, "app/globals.css"), "utf8");
  it("ko·en 은 es 줄을, es 는 ko·en 줄을 숨긴다", () => {
    for (const rule of [
      '.modal[data-ml="ko"] .ml-en',
      '.modal[data-ml="ko"] .ml-es',
      '.modal[data-ml="en"] .ml-ko',
      '.modal[data-ml="en"] .ml-es',
      '.modal[data-ml="es"] .ml-ko',
      '.modal[data-ml="es"] .ml-en',
    ]) {
      expect(css).toContain(rule);
    }
  });
});
