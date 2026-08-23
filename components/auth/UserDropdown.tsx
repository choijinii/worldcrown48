/**
 * UserDropdown — menu shown when the avatar is clicked.
 *
 * Items (handoff §6):
 *   1. Account Settings  → /account
 *   2. Delete my data    → opens DeleteAccountModal (parent owns the flag)
 *   3. Sign out          → authStore.signOut + toast
 *
 * Closing:
 *   - Escape / 바깥 클릭 — `lib/ui/dismiss`의 훅이 소유한다. 예전에는
 *     focus-trap의 `escapeDeactivates` + `clickOutsideDeactivates` + `onDeactivate`가
 *     했는데, focus-trap은 **언마운트 정리에서도** onDeactivate를 부른다 →
 *     StrictMode 재마운트에서 메뉴가 열리자마자 닫혔다(dev 전용).
 *   - Selecting any item also closes (caller passes onClose into each
 *     handler).
 *
 * Mobile (≤480px) variant — a bottom sheet — is implemented via the
 * `.user-dropdown` class hook + globals.css media query (added in §3-6).
 * The inline styles below are the desktop default.
 */

"use client";

import Link from "next/link";
import FocusTrap from "focus-trap-react";
import type { User } from "firebase/auth";
import { useAuthStore } from "@/lib/authStore";
import { useI18n } from "@/lib/i18n";
import { showToast } from "@/lib/toast";
import { useEscapeClose, useOutsideClose } from "@/lib/ui/dismiss";

interface UserDropdownProps {
  user: User;
  onClose: () => void;
  onRequestDelete: () => void;
}

export function UserDropdown({
  user,
  onClose,
  onRequestDelete,
}: UserDropdownProps): JSX.Element {
  const signOut = useAuthStore((s) => s.signOut);
  const { lang } = useI18n();
  useEscapeClose(onClose);
  // 바깥 클릭은 preventDefault하지 않는다 — 예전 allowOutsideClick: true와 같은
  // 약속이라, 메뉴가 닫히면서 그 클릭은 원래 대상에게 그대로 간다.
  const menuRef = useOutsideClose<HTMLDivElement>(onClose);

  async function handleSignOut() {
    onClose();
    try {
      await signOut();
      showToast(lang === "ko" ? "로그아웃 됐어요." : "Signed out.", "success");
    } catch {
      showToast(
        lang === "ko" ? "로그아웃에 실패했어요." : "Sign out failed.",
        "error",
      );
    }
  }

  function handleDelete() {
    onClose();
    onRequestDelete();
  }

  const t = {
    accountSettings: lang === "ko" ? "계정 설정" : "Account Settings",
    deleteData: lang === "ko" ? "내 데이터 삭제 요청" : "Delete my data",
    signOut: lang === "ko" ? "로그아웃" : "Sign out",
  };

  return (
    <FocusTrap
      focusTrapOptions={{
        escapeDeactivates: false,
        clickOutsideDeactivates: false,
        allowOutsideClick: true,
      }}
    >
      <div
        ref={menuRef}
        className="user-dropdown"
        role="menu"
        aria-label={lang === "ko" ? "사용자 메뉴" : "User menu"}
        style={{
          position: "absolute",
          top: "calc(100% + 8px)",
          right: 0,
          minWidth: 260,
          padding: 8,
          borderRadius: 16,
          background: "var(--color-white)",
          border: "1px solid var(--color-border-light)",
          boxShadow: "0 24px 60px rgba(14,9,68,0.22)",
          zIndex: 100,
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "12px 12px 16px",
            borderBottom: "1px solid var(--color-border-soft)",
          }}
        >
          <AvatarThumb user={user} size={48} />
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                fontFamily: "Inter, system-ui, sans-serif",
                fontWeight: 600,
                fontSize: 14,
                color: "var(--color-text-light)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {user.displayName ?? "Voter"}
            </div>
            {user.email ? (
              <div
                style={{
                  fontFamily: "Inter, system-ui, sans-serif",
                  fontSize: 12,
                  color: "var(--color-text-sub-light)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {user.email}
              </div>
            ) : null}
          </div>
        </div>

        <div role="none" style={{ display: "flex", flexDirection: "column", gap: 2, paddingTop: 8 }}>
          <Link
            href="/account"
            onClick={onClose}
            role="menuitem"
            style={menuItemStyle()}
          >
            {t.accountSettings}
          </Link>
          <button
            type="button"
            role="menuitem"
            onClick={handleDelete}
            style={menuItemStyle()}
          >
            {t.deleteData}
          </button>
          <div
            role="separator"
            style={{ height: 1, background: "var(--color-border-soft)", margin: "8px 0" }}
          />
          <button
            type="button"
            role="menuitem"
            onClick={handleSignOut}
            style={menuItemStyle()}
          >
            {t.signOut}
          </button>
        </div>
      </div>
    </FocusTrap>
  );
}

function menuItemStyle(): React.CSSProperties {
  return {
    display: "block",
    width: "100%",
    padding: "10px 12px",
    border: "none",
    borderRadius: 8,
    background: "transparent",
    color: "var(--color-text-light)",
    fontFamily: "Inter, system-ui, sans-serif",
    fontSize: 14,
    fontWeight: 500,
    textAlign: "left",
    textDecoration: "none",
    cursor: "pointer",
  };
}

function AvatarThumb({ user, size }: { user: User; size: number }): JSX.Element {
  const initials = (user.displayName ?? user.email ?? "?")
    .slice(0, 1)
    .toUpperCase();
  if (user.photoURL) {
    return (
      <img
        src={user.photoURL}
        alt=""
        width={size}
        height={size}
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          objectFit: "cover",
          flexShrink: 0,
        }}
      />
    );
  }
  return (
    <div
      aria-hidden="true"
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: "var(--color-bg-default)",
        color: "var(--color-gold)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "Inter, system-ui, sans-serif",
        fontWeight: 700,
        fontSize: size * 0.42,
        flexShrink: 0,
      }}
    >
      {initials}
    </div>
  );
}
