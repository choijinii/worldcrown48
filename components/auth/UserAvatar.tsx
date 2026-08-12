/**
 * UserAvatar — signed-in Navbar slot.
 *
 * Renders the avatar trigger + owns the dropdown and the delete-account
 * modal flags. Lives where SignInButton used to live; Navbar swaps between
 * the two based on auth state.
 *
 * Visual contract (handoff §4-1):
 *   - photoURL → 56x56 (desktop) / 40x40 (mobile) circle, 2px gold ring.
 *   - No photoURL → display-name initial on a deep-navy chip with a gold
 *     letter — the fallback states are spelled out in the design system.
 *   - displayName label is truncated to 24 chars with a CSS ellipsis.
 */

"use client";

import { useState } from "react";
import type { User } from "firebase/auth";
import { UserDropdown } from "./UserDropdown";
import { DeleteAccountModal } from "./DeleteAccountModal";

interface UserAvatarProps {
  user: User;
}

const DISPLAY_NAME_MAX = 24;
const AVATAR_SIZE_DESKTOP = 56;

export function UserAvatar({ user }: UserAvatarProps): JSX.Element {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const rawName = user.displayName ?? user.email ?? "Voter";
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
          gap: 10,
          padding: "4px 8px 4px 4px",
          borderRadius: 999,
          border: "1px solid transparent",
          background: "transparent",
          cursor: "pointer",
        }}
      >
        <AvatarRing user={user} size={AVATAR_SIZE_DESKTOP} />
        <span
          style={{
            fontFamily: "Inter, system-ui, sans-serif",
            fontSize: 14,
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

function AvatarRing({ user, size }: { user: User; size: number }): JSX.Element {
  const ringWidth = 2;
  const innerSize = size - ringWidth * 2;
  const initials = (user.displayName ?? user.email ?? "?").slice(0, 1).toUpperCase();

  return (
    <span
      aria-hidden="true"
      style={{
        display: "inline-block",
        width: size,
        height: size,
        padding: ringWidth,
        borderRadius: "50%",
        background: "var(--color-gold)",
        flexShrink: 0,
      }}
    >
      {user.photoURL ? (
        <img
          src={user.photoURL}
          alt=""
          width={innerSize}
          height={innerSize}
          style={{
            display: "block",
            width: innerSize,
            height: innerSize,
            borderRadius: "50%",
            objectFit: "cover",
          }}
        />
      ) : (
        <span
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: innerSize,
            height: innerSize,
            borderRadius: "50%",
            background: "var(--color-bg-default)",
            color: "var(--color-gold)",
            fontFamily: "Inter, system-ui, sans-serif",
            fontWeight: 700,
            fontSize: innerSize * 0.42,
          }}
        >
          {initials}
        </span>
      )}
    </span>
  );
}
