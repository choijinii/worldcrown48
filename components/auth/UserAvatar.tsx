/**
 * UserAvatar — signed-in Navbar slot.
 *
 * Renders the avatar trigger + owns the dropdown and the delete-account
 * modal flags. Lives where SignInButton used to live; Navbar swaps between
 * the two based on auth state.
 *
 * Visual contract (YT-FIX-1 · 원장 D-76 · 시안 GNB 부품):
 *   - 프로필 알약 높이 36(휴대폰 30) 안에 사진 알약 42×28(휴대폰 34×22) + 이름.
 *   - photoURL 이 없으면 이름 첫 글자.
 *   - displayName label is truncated to 24 chars with a CSS ellipsis.
 */

"use client";

import { useState } from "react";
import { useI18n } from "@/lib/i18n";
import type { User } from "firebase/auth";
import { UserDropdown } from "./UserDropdown";
import { DeleteAccountModal } from "./DeleteAccountModal";

interface UserAvatarProps {
  user: User;
}

const DISPLAY_NAME_MAX = 24;

export function UserAvatar({ user }: UserAvatarProps): JSX.Element {
  const { lang } = useI18n();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  // D-32 (2026-09-24 대표) — 기본 표시 이름의 "Voter" 예외 폐기. 화면에서 Voter 는
  // 시스템 용어이고, 팬이 읽는 이름표는 '팬 / Fan' 이다 (LANGUAGE.md §1 표시 용어 층).
  const rawName =
    user.displayName ?? user.email ?? (lang === "ko" ? "팬" : "Fan");
  const display =
    rawName.length > DISPLAY_NAME_MAX
      ? rawName.slice(0, DISPLAY_NAME_MAX - 1) + "…"
      : rawName;

  return (
    <div className="user-avatar" style={{ position: "relative" }}>
      <button
        type="button"
        data-testid="user-avatar"
        onClick={() => setDropdownOpen((o) => !o)}
        aria-expanded={dropdownOpen}
        aria-haspopup="menu"
        aria-label={`Open user menu for ${rawName}`}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          boxSizing: "border-box",
          height: 36,
          padding: "0 14px 0 4px",
          borderRadius: 999,
          border: "1px solid color-mix(in srgb, var(--color-white) 22%, transparent)",
          background: "color-mix(in srgb, var(--color-white) 8%, transparent)",
          cursor: "pointer",
        }}
      >
        <AvatarPill user={user} />
        <span
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: 13,
            fontWeight: 600,
            color: "var(--color-text-light)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            maxWidth: 180,
          }}
        >
          {display}
        </span>
      </button>

      {dropdownOpen ? (
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

function AvatarPill({ user }: { user: User }): JSX.Element {
  const initial = (user.displayName ?? user.email ?? "?").slice(0, 1).toUpperCase();
  return (
    <span
      aria-hidden="true"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flex: "none",
        boxSizing: "border-box",
        width: 42,
        height: 28,
        overflow: "hidden",
        borderRadius: 999,
        border: "1px solid color-mix(in srgb, var(--color-white) 22%, transparent)",
        background: "var(--arena-continue-text)",
        color: "var(--arena-icon)",
        fontFamily: "var(--font-mono)",
        fontSize: 10,
        fontWeight: 600,
      }}
    >
      {user.photoURL ? (
        <img
          src={user.photoURL}
          alt=""
          style={{ display: "block", width: "100%", height: "100%", objectFit: "cover" }}
        />
      ) : (
        initial
      )}
    </span>
  );
}
