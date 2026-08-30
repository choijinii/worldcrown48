/**
 * MobileProfileTab — profile slot for the mobile bottom tab bar.
 *
 * The bottom tab bar itself ships with a later domain (The Pitch / Arena).
 * D-1 only owns the profile slot — a small avatar trigger that opens the
 * same UserDropdown + DeleteAccountModal flow as the Navbar's UserAvatar,
 * sized for a 40px tab affordance.
 *
 * Anonymous visitor: tapping triggers Google sign-in directly (same shape
 * as the desktop SignInButton, no full modal — the tab bar already eats
 * the bottom of the screen, a modal on top would be heavy).
 *
 * The component renders inline; the caller positions it inside the tab bar.
 */

"use client";

import { useState } from "react";
import type { User } from "firebase/auth";
import { useAuthStore } from "@/lib/authStore";
import { useI18n } from "@/lib/i18n";
import { showToast } from "@/lib/toast";
import { UserDropdown } from "./UserDropdown";
import { DeleteAccountModal } from "./DeleteAccountModal";

const TAB_SIZE = 40;

export function MobileProfileTab(): JSX.Element {
  const user = useAuthStore((s) => s.user);
  const signInWithGoogle = useAuthStore((s) => s.signInWithGoogle);
  const { lang } = useI18n();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const signedIn = !!(user && !user.isAnonymous);

  async function handleSignIn() {
    if (busy) return;
    setBusy(true);
    try {
      // 계측 소킥 A: 헤더/탭바에서 바로 누르는 로그인이라 trigger_point는 "header".
      await signInWithGoogle("header");
    } catch {
      showToast(
        lang === "ko"
          ? "로그인에 실패했어요. 다시 시도해 주세요."
          : "Sign in failed. Please try again.",
        "error",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mobile-profile-tab" style={{ position: "relative" }}>
      <button
        type="button"
        onClick={signedIn ? () => setDropdownOpen((o) => !o) : handleSignIn}
        aria-expanded={signedIn ? dropdownOpen : undefined}
        aria-haspopup={signedIn ? "menu" : undefined}
        aria-label={
          signedIn
            ? lang === "ko"
              ? "내 프로필"
              : "My profile"
            : lang === "ko"
              ? "Google로 로그인"
              : "Sign in with Google"
        }
        disabled={busy}
        style={{
          width: TAB_SIZE,
          height: TAB_SIZE,
          borderRadius: "50%",
          padding: 2,
          border: signedIn ? "none" : "1px solid var(--color-gold)",
          background: signedIn ? "var(--color-gold)" : "transparent",
          cursor: busy ? "wait" : "pointer",
        }}
      >
        {signedIn && user ? (
          <ProfileImg user={user} size={TAB_SIZE - 4} />
        ) : (
          <UserGlyph />
        )}
      </button>

      {signedIn && user && dropdownOpen ? (
        <UserDropdown
          user={user}
          onClose={() => setDropdownOpen(false)}
          onRequestDelete={() => setDeleteOpen(true)}
        />
      ) : null}

      <DeleteAccountModal
        isOpen={deleteOpen}
        onClose={() => setDeleteOpen(false)}
      />
    </div>
  );
}

function ProfileImg({ user, size }: { user: User; size: number }): JSX.Element {
  if (user.photoURL) {
    return (
      <img
        src={user.photoURL}
        alt=""
        width={size}
        height={size}
        style={{
          display: "block",
          width: size,
          height: size,
          borderRadius: "50%",
          objectFit: "cover",
        }}
      />
    );
  }
  const initials = (user.displayName ?? user.email ?? "?").slice(0, 1).toUpperCase();
  return (
    <span
      aria-hidden="true"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: size,
        height: size,
        borderRadius: "50%",
        background: "var(--color-bg-default)",
        color: "var(--color-gold)",
        fontFamily: "Inter, system-ui, sans-serif",
        fontWeight: 700,
        fontSize: size * 0.42,
      }}
    >
      {initials}
    </span>
  );
}

function UserGlyph(): JSX.Element {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="var(--color-gold)"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}
