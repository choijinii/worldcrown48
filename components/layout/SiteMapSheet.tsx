"use client";

/**
 * SiteMapSheet — the ☰ Voter site map (Phase F · decision ⑤).
 *
 * A left drawer listing all 7 domains (lib/layout/domains). Built on
 * focus-trap-react to match the repo's modal convention (LoginModal /
 * ConsentModal) — shadcn is not scaffolded here. Escape + overlay click +
 * the × button all close it. Separate from the Dev Nav (Cmd+Shift+D), which
 * is unchanged.
 */

import Link from "next/link";
import FocusTrap from "focus-trap-react";
import { SITE_DOMAINS, siteMapEyebrow } from "@/lib/layout/domains";
import { useEscapeClose } from "@/lib/ui/dismiss";

export interface SiteMapSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SiteMapSheet({ isOpen, onClose }: SiteMapSheetProps): JSX.Element | null {
  // 훅은 조기 return 앞에 — 열림 여부는 인자로 넘긴다(호출 순서 고정).
  useEscapeClose(onClose, isOpen);
  if (!isOpen) return null;

  return (
    <FocusTrap
      // 닫기는 아래 오버레이 onClick(바깥 클릭)과 useEscapeClose(Escape)가 갖는다.
      // focus-trap에 얹으면 StrictMode 재마운트가 즉시 닫아 버린다(lib/ui/dismiss).
      focusTrapOptions={{
        escapeDeactivates: false,
        clickOutsideDeactivates: false,
      }}
    >
      <div
        className="wc-sitemap-overlay"
        role="presentation"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <nav
          className="wc-sitemap"
          role="dialog"
          aria-modal="true"
          aria-label="Site map"
        >
          <div className="wc-sitemap-head">
            <span className="wc-sitemap-title">WorldCrown48 · Site Map</span>
            <button
              type="button"
              className="wc-sitemap-close"
              aria-label="Close site map"
              onClick={onClose}
            >
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="6" y1="6" x2="18" y2="18" />
                <line x1="18" y1="6" x2="6" y2="18" />
              </svg>
            </button>
          </div>

          <div className="wc-sitemap-list">
            {SITE_DOMAINS.map((d) =>
              d.href ? (
                <Link
                  key={d.name}
                  className="wc-sitemap-item"
                  href={d.href}
                  onClick={onClose}
                >
                  <span className="wc-sitemap-dom">{siteMapEyebrow(d)}</span>
                  <span className="wc-sitemap-name">{d.name}</span>
                  <span className="wc-sitemap-desc">{d.desc}</span>
                </Link>
              ) : (
                <div
                  key={d.name}
                  className="wc-sitemap-item"
                  aria-disabled="true"
                >
                  <span className="wc-sitemap-dom">{siteMapEyebrow(d)}</span>
                  <span className="wc-sitemap-name">
                    {d.name} <span className="wc-sitemap-soon">Coming soon</span>
                  </span>
                  <span className="wc-sitemap-desc">{d.desc}</span>
                </div>
              ),
            )}
          </div>
        </nav>
      </div>
    </FocusTrap>
  );
}
