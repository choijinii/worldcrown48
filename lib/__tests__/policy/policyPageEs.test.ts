/**
 * POLICY-ES-1 Phase E — 정책 페이지 3언어 (KO · EN · ES).
 *
 * 정책 페이지는 언어 셋을 모두 DOM 에 그리고 CSS 로 활성 언어만 보인다(서버 렌더 한 번 · 언어
 * 전환 시 재요청 없음). es 를 세 번째 언어로 같은 방식으로 더한다. ko·en 화면 글자는 그대로.
 *
 * 함께 고친 기존 결함(3언어가 되면 더 나빠지는 것):
 *   · 스크롤 스파이·모바일 섹션 목록이 활성 언어 문서를 못 찾거나(전 언어 제목을 모았다)
 *     → activeDocSelector(lang) 하나로 고정.
 *   · privacy "11. Cookies" 처럼 en·es 제목이 같으면 id 가 겹친다 → es 제목 id 에만 "es-" 접두.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

const i18n = vi.hoisted(() => ({ lang: "es" as "ko" | "en" | "es" }));
vi.mock("@/lib/i18n", () => ({ useI18n: () => ({ lang: i18n.lang, setLang: () => {} }) }));
vi.mock("server-only", () => ({}));
vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: unknown }) =>
    createElement("a", { href, ...rest }, children as never),
}));

import { LanguageTabs } from "@/components/policy/LanguageTabs";
import { PolicyHeader } from "@/components/policy/PolicyHeader";
import { PolicyNav } from "@/components/policy/PolicyNav";
import { PolicyDocSwitch } from "@/components/policy/PolicyDocSwitch";
import { PolicyContent, activeDocSelector } from "@/components/policy/PolicyContent";
import { POLICY_NAV, type PolicyFrontmatter } from "@/lib/policyTypes";
import { loadPolicy } from "@/lib/policyContent";

const ROOT = path.resolve(__dirname, "../../..");
const text = (h: string) => h.replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function render(lang: "ko" | "en" | "es", el: (props: any) => JSX.Element, props: object = {}) {
  i18n.lang = lang;
  return renderToStaticMarkup(createElement(el as never, props as never));
}

const fm = (lang: "ko" | "en" | "es", title: string): PolicyFrontmatter => ({
  title,
  type: "cookies",
  lang,
  lastUpdated: "2026-10-05",
  version: "1.1",
});
const headerProps = { ko: fm("ko", "쿠키 정책"), en: fm("en", "Cookie Policy"), es: fm("es", "Política de cookies") };

describe("언어 탭 — KO · EN · ES", () => {
  it("세 개, 순서대로", () => {
    const html = render("es", LanguageTabs, { surface: "policy" });
    const labels = Array.from(html.matchAll(/<button[^>]*>([\s\S]*?)<\/button>/g)).map((m) => text(m[1]));
    expect(labels).toEqual(["KO · 한국어", "EN · English", "ES · Español"]);
    expect(html).toMatch(/aria-pressed="true"[^>]*>ES · Español/);
  });
});

describe("정책 머리 — es", () => {
  it("문서 이름 · 제목 · 머리 정보가 스페인어", () => {
    const t = text(render("es", PolicyHeader, headerProps));
    expect(t).toContain("WC48 · LEGAL · Política de cookies");
    expect(t).toContain("Política de cookies");
    expect(t).toContain("Última actualización · LAST UPDATED 2026-10-05");
    expect(t).toContain("Versión · VERSION v1.1");
    expect(t).toContain("Jurisdicción · JURISDICTION EU · UK · KR");
  });

  it("ko · en 은 지금 그대로", () => {
    expect(text(render("ko", PolicyHeader, headerProps))).toContain("최종 수정 · LAST UPDATED");
    const en = text(render("en", PolicyHeader, headerProps));
    expect(en).toContain("WC48 · LEGAL · Cookie Policy");
    expect(en).toContain("LAST UPDATED 2026-10-05");
    expect(en).not.toMatch(/Última|최종/);
  });
});

describe("정책 목록 — es", () => {
  it("POLICY_NAV 에 es 이름", () => {
    expect(POLICY_NAV.map((e) => e.es)).toEqual([
      "Privacidad",
      "Términos del servicio",
      "Comunidad",
      "Política de cookies",
    ]);
  });

  it("왼쪽 목록: 스페인어 · 영어, 제목·이의신청도 스페인어", () => {
    const t = text(render("es", PolicyNav, { activeType: "cookies" }));
    expect(t).toContain("Políticas · POLICY DOCUMENTS");
    expect(t).toContain("Privacidad · Privacy");
    expect(t).toContain("Política de cookies · Cookie Policy");
    expect(t).toContain("Apelaciones · APPEALS");
    expect(t).not.toMatch(/[가-힣]/);
  });

  it("왼쪽 목록 ko · en 은 지금 그대로", () => {
    expect(text(render("ko", PolicyNav, { activeType: "cookies" }))).toContain("정책 · POLICY DOCUMENTS");
    expect(text(render("en", PolicyNav, { activeType: "cookies" }))).toContain("이의신청 · APPEALS");
  });

  it("모바일 문서 전환: 스페인어 짧은 이름 (ko 는 지금 그대로)", () => {
    expect(text(render("es", PolicyDocSwitch, { activeType: "cookies" }))).toBe(
      "Privacidad Términos del servicio Comunidad Política de cookies",
    );
    expect(text(render("ko", PolicyDocSwitch, { activeType: "cookies" }))).toBe(
      "개인정보처리방침 이용약관 커뮤니티 가이드 쿠키 정책",
    );
  });
});

describe("정책 본문 — 세 언어를 DOM 에 · es 제목 id 는 겹치지 않게", () => {
  it("doc-ko · doc-en · doc-es 셋, es 제목 id 는 es- 접두", async () => {
    const p = await loadPolicy("privacy");
    const html = render("es", PolicyContent, {
      type: "privacy",
      koBody: p.ko.body,
      enBody: p.en.body,
      esBody: p.es.body,
    });
    for (const c of ["doc-ko", "doc-en", "doc-es"]) expect(html).toContain(`class="${c}"`);
    const ids = Array.from(html.matchAll(/ id="([^"]+)"/g)).map((m) => m[1]);
    expect(new Set(ids).size).toBe(ids.length);
    const esPart = html.slice(html.indexOf('class="doc-es"'));
    expect(esPart).toMatch(/ id="es-/);
  });

  it("제목 번호(§ 01…)는 언어마다 01 부터 — 다른 언어 번호를 이어 세지 않는다", async () => {
    const p = await loadPolicy("cookies");
    const html = render("es", PolicyContent, { type: "cookies", koBody: p.ko.body, enBody: p.en.body, esBody: p.es.body });
    for (const c of ["doc-ko", "doc-en", "doc-es"]) {
      const part = html.slice(html.indexOf(`class="${c}"`));
      expect(part.match(/<span class="ps-num">([^<]+)<\/span>/)?.[1]).toBe("§ 01");
    }
  });

  it("활성 언어 문서 선택자 — 스크롤 스파이·섹션 목록이 같은 것을 쓴다", () => {
    expect(activeDocSelector("es")).toBe(".policy-doc .doc-es");
    for (const f of ["components/policy/PolicyContent.tsx", "components/policy/PolicyAnchorBar.tsx"]) {
      expect(readFileSync(path.join(ROOT, f), "utf8")).toContain("activeDocSelector(");
    }
  });

  it("CSS: 언어마다 나머지 두 언어를 숨긴다", () => {
    const css = readFileSync(path.join(ROOT, "app/globals.css"), "utf8");
    for (const [on, off] of [
      ["ko", "en"],
      ["ko", "es"],
      ["en", "ko"],
      ["en", "es"],
      ["es", "ko"],
      ["es", "en"],
    ]) {
      expect(css).toContain(`.policy-doc[data-lang="${on}"] .doc-${off}`);
    }
  });
});

describe("정책 페이지 언어판 안내", () => {
  it("loadPolicy 가 es 를 읽는다", async () => {
    const p = await loadPolicy("terms");
    expect(p.es.frontmatter.lang).toBe("es");
    expect(p.es.frontmatter.title).toBe("Términos del servicio");
  });

  it("generateMetadata alternates 에 es", async () => {
    const { generateMetadata } = await import("@/app/policies/[type]/page");
    const meta = await generateMetadata({ params: { type: "cookies" } });
    expect(meta.alternates?.languages).toEqual({
      ko: "/policies/cookies?lang=ko",
      en: "/policies/cookies?lang=en",
      es: "/policies/cookies?lang=es",
    });
  });
});
