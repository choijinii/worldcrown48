/**
 * Navbar — unified global nav (Phase F · ADR-0010).
 *
 * Moved from components/auth/ to components/layout/ (it's a layout component).
 * Absorbs the A-1 floating Pitch GNB (The Pitch · The Lab · Locker Room ·
 * Vote Now) so there is ONE nav, not two. Dark "floating tone" head (always
 * dark — brand global constant, Option C); page bodies keep their per-domain
 * theme. Styling is navbar.css (tokens only, no hex), scoped under .wc-nav.
 *
 * Left:   ☰ (SiteMapSheet) · logo SVG · The Pitch / The Lab / Locker Room / Vote Now
 * Right:  LanguageToggle · SignIn ↔ Avatar (auth, unchanged)
 *
 * The Dev Nav (Cmd+Shift+D) is separate and untouched.
 */

"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuthStore } from "@/lib/authStore";
import { LanguageToggle } from "@/components/i18n/LanguageToggle";
import { SignInButton } from "@/components/auth/SignInButton";
import { UserAvatar } from "@/components/auth/UserAvatar";
import { track } from "@/lib/analytics";
import { SiteMapSheet } from "./SiteMapSheet";
import "./navbar.css";

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
function BurgerIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <line x1="4" y1="7" x2="20" y2="7" />
      <line x1="4" y1="12" x2="20" y2="12" />
      <line x1="4" y1="17" x2="20" y2="17" />
    </svg>
  );
}

export function Navbar(): JSX.Element {
  const user = useAuthStore((s) => s.user);
  const loading = useAuthStore((s) => s.loading);
  const pathname = usePathname();
  const [sheetOpen, setSheetOpen] = useState(false);

  return (
    <header className="wc-nav">
      <div className="wc-nav-left">
        <button
          type="button"
          className="wc-nav-burger"
          aria-label="Open site map"
          aria-haspopup="dialog"
          aria-expanded={sheetOpen}
          onClick={() => setSheetOpen(true)}
        >
          <BurgerIcon />
        </button>
        <Link href="/" className="wc-nav-logo" aria-label="WorldCrown48 home">
          <img src="/brand/wc48-branding-horizontal-dark.svg" alt="WorldCrown48" />
        </Link>
      </div>

      <span className="wc-nav-sep" aria-hidden="true" />

      <nav className="wc-nav-menu" aria-label="Primary navigation">
        <Link
          href="/"
          className="wc-nav-item"
          aria-current={pathname === "/" ? "true" : undefined}
        >
          <HomeIcon />
          <span>The Pitch</span>
        </Link>
        <Link href="/admin/lab" className="wc-nav-item">
          <LabIcon />
          <span>The Lab</span>
        </Link>
        <button
          type="button"
          className="wc-nav-item"
          aria-disabled="true"
          onClick={() => setSheetOpen(true)}
        >
          <LockerIcon />
          <span>Locker Room</span>
        </button>
        <Link
          href="/"
          className="wc-nav-cta"
          onClick={() => track("a1_gnb_cta_vote_now", { from: "navbar" })}
        >
          Vote Now
        </Link>
      </nav>

      <span className="wc-nav-spacer" />

      <div className="wc-nav-actions gnb-actions">
        <LanguageToggle />
        {loading ? (
          <NavbarActionSkeleton />
        ) : user && !user.isAnonymous ? (
          <UserAvatar user={user} />
        ) : (
          <SignInButton />
        )}
      </div>

      <SiteMapSheet isOpen={sheetOpen} onClose={() => setSheetOpen(false)} />
    </header>
  );
}

function NavbarActionSkeleton(): JSX.Element {
  return (
    <div
      aria-hidden="true"
      style={{
        width: 100,
        height: 40,
        borderRadius: "var(--radius-border)",
        background: "var(--color-bg-soft)",
      }}
    />
  );
}
