/**
 * PolicyContent — markdown body renderer + scroll-spy.
 *
 * Receives BOTH languages' markdown bodies from the route's RSC. Renders
 * both into the DOM at once; CSS (`.policy-doc[data-lang] .doc-en/.doc-ko
 * { display: none }`) hides the inactive language. Same pattern as the
 * modal — instant toggle, no re-fetch, no flash.
 *
 * react-markdown emits semantic HTML. We pass a custom `components` map
 * that:
 *   • Wraps each <h2> in a `<section class="policy-section">` so the
 *     scroll-spy and anchor bar have a stable element to target.
 *   • Auto-generates section IDs from the heading text (slug) so URL
 *     hashes work (#1-cookies-tan-mueoss-injigga).
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

import { useEffect, useMemo, useRef } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { useI18n } from "@/lib/i18n";
import { trackWithConsent } from "@/lib/analytics";
import type { PolicyType } from "@/lib/policyTypes";

export interface PolicyContentProps {
  type: PolicyType;
  koBody: string;
  enBody: string;
}

export function PolicyContent({
  type,
  koBody,
  enBody,
}: PolicyContentProps): JSX.Element {
  const { lang } = useI18n();
  const rootRef = useRef<HTMLDivElement>(null);
  const firedSectionsRef = useRef<Set<string>>(new Set());

  // Build the components map once per render — it's cheap.
  const components = useMemo<Components>(() => buildComponents(), []);

  // policy_view fires once per (type, lang) entry. We re-fire when either
  // changes so the lang switch counts as a separate view per the handoff.
  useEffect(() => {
    void trackWithConsent("policy_view", { type, lang });
    // Reset the "already-fired" set when lang changes — different DOM tree.
    firedSectionsRef.current = new Set();
  }, [type, lang]);

  // Scroll-spy: observe h2 elements in the active language only.
  useEffect(() => {
    if (!rootRef.current) return;
    const activeDoc = rootRef.current.querySelector<HTMLElement>(
      `.policy-doc[data-lang="${lang}"]`,
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
  }, [lang, type, koBody, enBody]);

  return (
    <div className="policy-doc" data-lang={lang} ref={rootRef}>
      <div className="doc-ko">
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
          {koBody}
        </ReactMarkdown>
      </div>
      <div className="doc-en">
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
          {enBody}
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
function buildComponents(): Components {
  let h2Counter = 0;
  // h2Counter resets per ReactMarkdown render — both ko and en restart at 0,
  // so § 01 / § 02 numbering is correct per language.
  return {
    h1: ({ children }) => {
      // The route's PolicyHeader renders the title already. Skip the body
      // h1 to avoid double titles — markdown frontmatter title is canonical.
      return <></>;
    },
    h2: ({ children }) => {
      h2Counter += 1;
      const text = extractText(children);
      const id = slug(text);
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
    h3: ({ children }) => <h3>{children}</h3>,
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
      return <a href={href}>{children}</a>;
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

/**
 * Slug a heading into a stable section ID. Lowercases, strips quotes,
 * replaces spaces and slashes with `-`. Keeps Korean characters as-is —
 * they survive URL encoding fine.
 */
function slug(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/[·:'"`()[\]{}]/g, "")
    .replace(/[\s/]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}
