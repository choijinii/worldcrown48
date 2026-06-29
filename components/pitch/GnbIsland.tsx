"use client";

/**
 * M0 · GnbIsland — the floating-island domain nav for The Pitch.
 *
 * Scroll-compact (handoff §6.4 / AC-8): adds `.gnb--compact` once the page has
 * scrolled past 40px. The wireframe listened on its inner `.pitch` scroller
 * (a fixed-height device preview); in the real app the window scrolls, so we
 * track `window.scrollY` instead. A useRef guard keeps the listener idempotent
 * across renders (wireframe §9 trap 6 double-bind).
 *
 * NOTE (visual-integration): the root layout already renders the global light
 * <Navbar> (class `.gnb`, light theme). This island is a SEPARATE dark
 * domain-nav scoped under `.pitch .gnb`. Their coexistence is a 대표 visual
 * verification item (handoff §7.3).
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { track } from "@/lib/analytics";

const COMPACT_AT = 40;

function HomeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 11l9-8 9 8" />
      <path d="M5 10v10h14V10" />
    </svg>
  );
}
function LabIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 3h6" />
      <path d="M10 3v6l-5 9a1.6 1.6 0 0 0 1.4 2.4h11.2A1.6 1.6 0 0 0 19 18l-5-9V3" />
    </svg>
  );
}
function LockerIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4" />
      <path d="M5 21a7 7 0 0 1 14 0" />
    </svg>
  );
}

export function GnbIsland() {
  const [compact, setCompact] = useState(false);

  useEffect(() => {
    const onScroll = () => setCompact(window.scrollY > COMPACT_AT);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav
      className={`gnb${compact ? " gnb--compact" : ""}`}
      aria-label="Primary navigation"
    >
      <span className="gnb-brand">
        <img src="/brand/wc48-branding-horizontal-dark.svg" alt="WorldCrown48" />
      </span>
      <span className="gnb-sep" aria-hidden="true" />
      <button className="gnb-item" type="button" aria-current="true">
        <HomeIcon />
        <span className="lbl">The Pitch</span>
      </button>
      <Link className="gnb-item" href="/admin/lab">
        <LabIcon />
        <span className="lbl">The Lab</span>
      </Link>
      <button className="gnb-item" type="button">
        <LockerIcon />
        <span className="lbl">Locker Room</span>
      </button>
      <button
        className="gnb-cta"
        type="button"
        onClick={() => {
          track("a1_gnb_cta_vote_now", { from: "gnb" });
          document.getElementById("trending")?.scrollIntoView({ behavior: "smooth" });
        }}
      >
        Vote Now
      </button>
    </nav>
  );
}
