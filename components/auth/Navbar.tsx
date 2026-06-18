/**
 * Navbar — light-theme global nav.
 *
 * Slot strategy:
 *   - logo → /
 *   - centre slot reserved for MVP1.5 nav links (intentionally empty here)
 *   - actions: SignInButton ↔ UserAvatar, switched on auth state
 *
 * While authStore.loading is true (first paint, before the persistence
 * decision lands), render a neutral placeholder so the action area doesn't
 * flicker SIGN IN → AVATAR.
 *
 * Mobile (<= 768px): the action slot is hidden via globals.css; the
 * mobile profile entry lives in MobileProfileTab on the bottom tabbar.
 * The `gnb-actions` class is the hook for that media query.
 */

"use client";

import Link from "next/link";
import { useAuthStore } from "@/lib/authStore";
import { SignInButton } from "./SignInButton";
import { UserAvatar } from "./UserAvatar";

export function Navbar(): JSX.Element {
  const user = useAuthStore((s) => s.user);
  const loading = useAuthStore((s) => s.loading);

  return (
    <header
      className="gnb"
      data-theme="light"
      style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "12px 24px",
        background: "rgba(255,255,255,0.92)",
        backdropFilter: "saturate(180%) blur(12px)",
        WebkitBackdropFilter: "saturate(180%) blur(12px)",
        borderBottom: "1px solid var(--color-border-soft, #E6EAF0)",
        fontFamily: "Inter, system-ui, sans-serif",
      }}
    >
      <Link
        href="/"
        className="gnb-logo"
        style={{
          fontFamily: "'Playfair Display', Georgia, serif",
          fontWeight: 700,
          fontSize: 18,
          letterSpacing: "0.02em",
          color: "var(--color-text-light, #0E0944)",
          textDecoration: "none",
        }}
      >
        WORLD CROWN 48
      </Link>

      <div className="gnb-actions" style={{ display: "flex", alignItems: "center", gap: 12 }}>
        {loading ? (
          <NavbarActionSkeleton />
        ) : user && !user.isAnonymous ? (
          <UserAvatar user={user} />
        ) : (
          <SignInButton />
        )}
      </div>
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
        borderRadius: 12,
        background: "rgba(14,9,68,0.06)",
      }}
    />
  );
}
