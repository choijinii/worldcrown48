/**
 * POLICY-YT-1 Phase D — 조항 링크가 실제로 그 조항으로 이동한다.
 *
 * 고장: 정책 문서 안 조항 링크 6개(× 3언어)가 어디로도 가지 않았다.
 *   · `### 2.7 …` 같은 소제목(h3)에는 id 가 아예 없었다.
 *   · `## 8. 이의신청 · Appeals` 의 id 는 제목 글자 slug(`8.-이의신청-appeals`)라 `#8` 과 맞지 않았다.
 *   · terms 의 다중 계정 링크는 번호도 틀렸다(`#7` → `#2.7`, 부록 B).
 *
 * 고친 방법: 번호로 시작하는 제목은 그 번호가 id 다. 단 세 언어 문서가 한 화면(DOM)에 함께 있어
 * 번호만으로는 ko·en·es 가 겹친다 → 언어 접두(ko 없음 · en- · es-)를 붙이고, 링크 해시(`#2.7`)는
 * 화면 언어에 맞는 id 로 바꿔 이동한다(`sectionHashTarget`). 번호 없는 제목은 지금 slug 그대로.
 */
import { describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

const i18n = vi.hoisted(() => ({ lang: "ko" as "ko" | "en" | "es" }));
vi.mock("@/lib/i18n", () => ({ useI18n: () => ({ lang: i18n.lang, setLang: () => {} }) }));
vi.mock("server-only", () => ({}));

import { PolicyContent } from "@/components/policy/PolicyContent";
import { loadPolicy } from "@/lib/policyContent";
import { headingNumber, policyLinkHref, sectionHashTarget, sectionId } from "@/lib/policySectionId";
import type { PolicyType } from "@/lib/policyTypes";

const LANGS = ["ko", "en", "es"] as const;

describe("제목 번호 → id", () => {
  it("번호를 읽는다 — `8.` · `2.7` · 번호 없음", () => {
    expect(headingNumber("8. 이의신청 · Appeals")).toBe("8");
    expect(headingNumber("2.7 사기·스팸·악용 · Fraud · Spam · Abuse")).toBe("2.7");
    expect(headingNumber("10. 문의")).toBe("10");
    expect(headingNumber("YouTube API 서비스")).toBeNull();
    expect(headingNumber("2026년 개정")).toBeNull();
  });

  it("번호 있는 제목 = 언어 접두 + 번호 (ko 는 접두 없음)", () => {
    expect(sectionId("8. 이의신청 · Appeals", "ko", 2)).toBe("8");
    expect(sectionId("2.7 Fraud · Spam · Abuse", "en", 3)).toBe("en-2.7");
    expect(sectionId("2.7 Fraude", "es", 3)).toBe("es-2.7");
  });

  it("번호 없는 h2 = 지금 slug 그대로 (es 만 es- 접두) · 번호 없는 h3 = id 없음", () => {
    expect(sectionId("Quiénes somos", "es", 2)).toBe("es-quiénes-somos");
    expect(sectionId("Who we are", "en", 2)).toBe("who-we-are");
    expect(sectionId("YouTube API 서비스", "ko", 3)).toBeUndefined();
  });

  it("링크 해시 → 화면 언어의 id", () => {
    expect(sectionHashTarget("#2.7", "ko")).toBe("2.7");
    expect(sectionHashTarget("#2.7", "en")).toBe("en-2.7");
    expect(sectionHashTarget("#8", "es")).toBe("es-8");
    expect(sectionHashTarget("", "en")).toBeNull();
    // 번호가 아닌 해시(옛 slug 링크)는 그대로 둔다
    expect(sectionHashTarget("#who-we-are", "en")).toBe("who-we-are");
  });
});

/** 렌더한 문서에서 언어 칸(doc-xx) 하나의 HTML. */
function docPart(html: string, lang: string): string {
  const start = html.indexOf(`class="doc-${lang}"`);
  const next = LANGS.map((l) => html.indexOf(`class="doc-${l}"`)).filter((i) => i > start);
  return html.slice(start, next.length ? Math.min(...next) : undefined);
}

async function renderDoc(type: PolicyType): Promise<string> {
  const p = await loadPolicy(type);
  return renderToStaticMarkup(
    createElement(PolicyContent, { type, koBody: p.ko.body, enBody: p.en.body, esBody: p.es.body }),
  );
}

describe("정책 문서 4종 — id", () => {
  for (const type of ["privacy", "terms", "community", "cookies"] as const) {
    it(`${type}: 세 언어를 합쳐도 id 가 겹치지 않는다`, async () => {
      const ids = Array.from((await renderDoc(type)).matchAll(/ id="([^"]+)"/g)).map((m) => m[1]);
      expect(ids.length).toBeGreaterThan(0);
      expect(ids.filter((id, i) => ids.indexOf(id) !== i)).toEqual([]);
    });
  }
});

describe("조항 링크 6개 × 3언어 — 해시가 대상 문서의 그 언어 칸 안 id 로 간다", () => {
  for (const lang of LANGS) {
    it(`${lang}: privacy · terms 의 /policies/<문서>#<번호> 링크 전부`, async () => {
      const links: { to: PolicyType; hash: string }[] = [];
      for (const from of ["privacy", "terms"] as const) {
        const p = await loadPolicy(from);
        for (const m of Array.from(p[lang].body.matchAll(/\]\(\/policies\/(\w+)(#[^)]+)\)/g))) {
          links.push({ to: m[1] as PolicyType, hash: m[2] });
        }
      }
      expect(links.map((l) => `${l.to}${l.hash}`).sort()).toEqual(
        ["community#2", "community#2.2", "community#2.7", "community#6", "community#8", "terms#5.3"].sort(),
      );
      for (const { to, hash } of links) {
        const part = docPart(await renderDoc(to), lang);
        const target = sectionHashTarget(hash, lang);
        expect(part, `${to}${hash} → ${target}`).toContain(` id="${target}"`);
      }
    });
  }
});

describe("조항 링크는 그 문서의 언어를 데리고 간다", () => {
  it("policyLinkHref — /policies/* 에 ?lang= 을 붙이고 해시는 뒤에", () => {
    expect(policyLinkHref("/policies/community#2.7", "es")).toBe("/policies/community?lang=es#2.7");
    expect(policyLinkHref("/policies/privacy", "en")).toBe("/policies/privacy?lang=en");
    expect(policyLinkHref("mailto:policy@worldcrown48.com", "es")).toBe("mailto:policy@worldcrown48.com");
    expect(policyLinkHref("https://policies.google.com/privacy", "es")).toBe("https://policies.google.com/privacy");
    expect(policyLinkHref(undefined, "ko")).toBeUndefined();
  });

  it("렌더된 es 약관의 §2.7 링크 = /policies/community?lang=es#2.7 (ko·en 도 각자 언어)", async () => {
    const html = await renderDoc("terms");
    for (const lang of LANGS) {
      expect(docPart(html, lang)).toContain(`href="/policies/community?lang=${lang}#2.7"`);
    }
  });
});
