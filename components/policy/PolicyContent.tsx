/**
 * PolicyContent — markdown body renderer + scroll-spy.
 *
 * Receives every language's markdown body (ko · en · es) from the route's
 * RSC. Renders all of them into the DOM at once; CSS (`.policy-doc[data-lang]
 * .doc-*` { display: none }) hides the inactive languages. Same pattern as the
 * modal — instant toggle, no re-fetch, no flash.
 *
 * react-markdown emits semantic HTML. We pass a custom `components` map
 * that:
 *   • Wraps each <h2> in a `<section class="policy-section">` so the
 *     scroll-spy and anchor bar have a stable element to target.
 *   • Gives numbered headings their number as id (`## 8.` → "8",
 *     `### 2.7` → "2.7"; en/es add "en-"/"es-" because all three languages
 *     share one DOM) and moves to the active language's id when the URL
 *     carries a clause hash (/policies/community#2.7) — POLICY-YT-1.
 *     Unnumbered h2 keep the old slug id.
 *   • Inserts the "§ NN" ordinal in front of each h2 (handoff §6 ps-num).
 *   • Wraps tables in a scroll-x container for narrow viewports.
 *
 * Scroll-spy:
 *   IntersectionObserver watches every h2 in the ACTIVE language only.
 *   When a heading crosses 50% visibility it fires `policy_section_view`
 *   (handoff §8). The provider gates analytics by consent.
 *
 * SSR note: react-markdown renders fine on the server. The wrapper is a
 * client component because we own the lang state + IntersectionObserver.
 */

"use client";

import { useEffect, useRef } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { useI18n } from "@/lib/i18n";
import { trackWithConsent } from "@/lib/analytics";
import type { PolicyType } from "@/lib/policyTypes";
import type { Lang } from "@/lib/cookieConsent";
import { policyLinkHref, sectionHashTarget, sectionId } from "@/lib/policySectionId";

/**
 * 활성 언어 문서(제목을 모을 범위). 스크롤 스파이와 모바일 섹션 목록이 같이 쓴다.
 * POLICY-ES-1: 예전 선택자(`.policy-doc[data-lang]`)는 스파이에서는 자기 자신 안을 찾아 늘 비었고,
 * 섹션 목록에서는 숨긴 다른 언어 제목까지 모았다.
 */
export function activeDocSelector(lang: Lang): string {
  return `.policy-doc .doc-${lang}`;
}

export interface PolicyContentProps {
  type: PolicyType;
  koBody: string;
  enBody: string;
  esBody: string;
}

export function PolicyContent({
  type,
  koBody,
  enBody,
  esBody,
}: PolicyContentProps): JSX.Element {
  const { lang } = useI18n();
  const rootRef = useRef<HTMLDivElement>(null);
  const firedSectionsRef = useRef<Set<string>>(new Set());

  // Build a components map PER LANGUAGE and PER RENDER — it's cheap. The h2
  // "§ NN" counter lives in the map's closure, so a shared/memoised map made
  // later languages (and later renders) keep counting from where the previous
  // one stopped. Heading ids carry the language (lib/policySectionId) so the
  // three documents never share an id.

  // policy_view fires once per (type, lang) entry. We re-fire when either
  // changes so the lang switch counts as a separate view per the handoff.
  useEffect(() => {
    void trackWithConsent("policy_view", { type, lang });
    // Reset the "already-fired" set when lang changes — different DOM tree.
    firedSectionsRef.current = new Set();
  }, [type, lang]);

  // Clause links (/policies/community#2.7): the browser's own jump only finds
  // the ko id ("2.7"), which is hidden on an en/es screen. Move to the active
  // language's id on load, on hash change, and when the language switches.
  useEffect(() => {
    const go = () => {
      const id = sectionHashTarget(window.location.hash, lang);
      if (!id) return;
      const el = document.getElementById(id);
      if (el && rootRef.current?.contains(el)) el.scrollIntoView({ block: "start" });
    };
    go();
    window.addEventListener("hashchange", go);
    return () => window.removeEventListener("hashchange", go);
  }, [lang]);

  // Scroll-spy: observe h2 elements in the active language only.
  useEffect(() => {
    if (!rootRef.current) return;
    const activeDoc = rootRef.current.parentElement?.querySelector<HTMLElement>(
      activeDocSelector(lang),
    );
    if (!activeDoc) return;

    const headings = activeDoc.querySelectorAll<HTMLHeadingElement>(
      ".policy-section h2",
    );
    if (headings.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const id = entry.target.id;
          if (!id || firedSectionsRef.current.has(id)) continue;
          firedSectionsRef.current.add(id);
          void trackWithConsent("policy_section_view", { section_id: id });
        }
      },
      { threshold: 0.5 },
    );

    headings.forEach((h) => observer.observe(h));
    return () => observer.disconnect();
  }, [lang, type, koBody, enBody, esBody]);

  return (
    <div className="policy-doc" data-lang={lang} ref={rootRef}>
      <div className="doc-ko">
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={buildComponents("ko")}>
          {koBody}
        </ReactMarkdown>
      </div>
      <div className="doc-en">
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={buildComponents("en")}>
          {enBody}
        </ReactMarkdown>
      </div>
      <div className="doc-es">
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={buildComponents("es")}>
          {esBody}
        </ReactMarkdown>
      </div>
    </div>
  );
}

// ── Markdown → React component overrides ───────────────────────────────

/**
 * react-markdown by default renders <h1>, <h2>, <p>, etc. side-by-side
 * with no semantic grouping. The handoff design wraps each <h2> + its
 * trailing content in a `<section class="policy-section">` to enable
 * scroll-margin + scroll-spy targeting.
 *
 * We approximate that with the simpler shape: wrap each <h2> in its own
 * `.policy-section` and let the following paragraphs flow after as the
 * h2's "section content" via CSS spacing. (Pure react-markdown can't
 * group nodes; the proper grouping would need a remark plugin. The
 * simpler version works for the AC: scroll-margin + IntersectionObserver
 * still target the h2 correctly, and the ordinal numbering matches.)
 */
function buildComponents(docLang: Lang): Components {
  let h2Counter = 0;
  // One counter per map — the caller builds a fresh map for each language on
  // every render, so § 01 / § 02 numbering restarts per language.
  return {
    h1: ({ children }) => {
      // The route's PolicyHeader renders the title already. Skip the body
      // h1 to avoid double titles — markdown frontmatter title is canonical.
      return <></>;
    },
    h2: ({ children }) => {
      h2Counter += 1;
      const text = extractText(children);
      const id = sectionId(text, docLang, 2);
      const num = `§ ${String(h2Counter).padStart(2, "0")}`;
      return (
        <section className="policy-section" id={id}>
          <h2>
            <span className="ps-num">{num}</span>
            <span>{children}</span>
          </h2>
        </section>
      );
    },
    h3: ({ children }) => <h3 id={sectionId(extractText(children), docLang, 3)}>{children}</h3>,
    table: ({ children }) => (
      <div style={{ overflowX: "auto" }}>
        <table>{children}</table>
      </div>
    ),
    a: ({ href, children }) => {
      // Open external links in a new tab for safety; internal links use
      // the default. The policy bodies link to /policies/* and mailto:.
      const isExternal =
        typeof href === "string" &&
        /^https?:\/\//.test(href) &&
        !href.includes("worldcrown48.com");
      if (isExternal) {
        return (
          <a href={href} target="_blank" rel="noopener noreferrer">
            {children}
          </a>
        );
      }
      // Other policy pages keep this document's language (POLICY-YT-1).
      return <a href={policyLinkHref(href, docLang)}>{children}</a>;
    },
  };
}

function extractText(children: React.ReactNode): string {
  if (typeof children === "string") return children;
  if (typeof children === "number") return String(children);
  if (Array.isArray(children)) return children.map(extractText).join("");
  if (children && typeof children === "object" && "props" in children) {
    const props = (children as { props?: { children?: React.ReactNode } }).props;
    return extractText(props?.children);
  }
  return "";
}

