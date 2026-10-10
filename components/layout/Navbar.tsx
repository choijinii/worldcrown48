/**
 * Navbar — 전역 메뉴바 (NAV-1 · 원장 D-19 · 프롬프트 §0-B · 정본 1 · 2 · 3 · 28 · 29 · 30).
 *
 *   ☰ · 로고 · The Pitch · The Arena ▾ · [The Lab] · Record Room ▾ · Newsroom ▾ · Locker Room
 *   ………………………………………………………………………… 언어 · 아바타(또는 SIGN IN)
 *
 * 항목은 lib/layout/navMap 한 곳에서 온다. The Lab 은 관리자(이미 공개된 NEXT_PUBLIC_ADMIN_UID 와
 * 비교 — 새 노출 없음)거나 스위치(LAB_PUBLIC)가 켜졌을 때만 보인다. 메뉴는 숨길 뿐이고 보호는
 * adminGate 가 한다(R2).
 *
 * "참가하기" 버튼과 계측 `a1_gnb_cta_vote_now` 는 없앴다(§0-B 1 — 정본에 없다).
 * 메뉴바 · 펼침 메뉴 · 서랍은 어느 페이지에서나 다크다(§0-B 3) — navbar.css 의 메뉴 범위 변수.
 * 좁은 화면(≤860px)은 글자 메뉴를 접고 ☰ 서랍이 길을 맡는다(정본 6 · 7 · 8 — 펼침 메뉴 없음).
 *
 * Dev Nav(Cmd+Shift+D)는 따로다.
 */

"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuthStore } from "@/lib/authStore";
import { isAdmin } from "@/lib/lab/isAdmin";
import { useT } from "@/lib/i18n/useT";
import { LanguageToggle } from "@/components/i18n/LanguageToggle";
import { SignInButton } from "@/components/auth/SignInButton";
import { UserAvatar } from "@/components/auth/UserAvatar";
import {
  LAB_PUBLIC,
  activeNavKey,
  activeSubKey,
  dropdownItems,
  menubarItems,
  type NavKey,
} from "@/lib/layout/navMap";
import { NavMenuItem } from "./NavMenuItem";
import { NavDrawer } from "./NavDrawer";
import { ContinuePill } from "./ContinuePill";
import "./navbar.css";

function BurgerIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" aria-hidden="true">
      <line x1="4" y1="7" x2="20" y2="7" />
      <line x1="4" y1="12" x2="20" y2="12" />
      <line x1="4" y1="17" x2="20" y2="17" />
    </svg>
  );
}

export function Navbar(): JSX.Element {
  const user = useAuthStore((s) => s.user);
  const loading = useAuthStore((s) => s.loading);
  const pathname = usePathname() ?? "/";
  const { t } = useT();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [openMenu, setOpenMenu] = useState<NavKey | null>(null);
  const [pendingFocus, setPendingFocus] = useState<"first" | "last" | null>(null);

  const admin = Boolean(user && !user.isAnonymous && isAdmin(user.uid, process.env.NEXT_PUBLIC_ADMIN_UID));
  const items = menubarItems({ admin, labPublic: LAB_PUBLIC });
  const current = activeNavKey(pathname);
  const currentSub = activeSubKey(pathname);

  const closeMenu = useCallback(() => {
    setOpenMenu(null);
    setPendingFocus(null);
  }, []);
  const closeDrawer = useCallback(() => setDrawerOpen(false), []);

  return (
    <header className="wc-nav">
      <div className="wc-nav-bar">
        <button
          type="button"
          className="wc-nav-burger"
          aria-label={t("nav.drawer.open")}
          aria-haspopup="dialog"
          aria-expanded={drawerOpen}
          onClick={() => setDrawerOpen(true)}
          data-testid="nav-burger"
        >
          <BurgerIcon />
        </button>
        <Link href="/" className="wc-nav-logo" aria-label="WorldCrown48 home">
          <img src="/brand/wc48-branding-horizontal-dark.svg" alt="WorldCrown48" />
        </Link>

        <nav className="wc-nav-menu" aria-label="Primary navigation">
          {items.map((n) => {
            const subs = dropdownItems(n.key);
            const isCurrent = n.key === current;
            if (subs.length === 0) {
              return (
                <Link
                  key={n.key}
                  href={n.href as string}
                  className="wc-nav-item"
                  aria-current={isCurrent ? "page" : undefined}
                  data-testid={`nav-item-${n.key}`}
                >
                  {n.label}
                </Link>
              );
            }
            return (
              <NavMenuItem
                key={n.key}
                item={n}
                subs={subs}
                current={isCurrent}
                currentSub={currentSub}
                open={openMenu === n.key}
                pendingFocus={openMenu === n.key ? pendingFocus : null}
                onOpen={(focus) => {
                  setOpenMenu(n.key);
                  setPendingFocus(focus ?? null);
                }}
                onClose={closeMenu}
              />
            );
          })}
        </nav>

        <span className="wc-nav-spacer" />

        <div className="wc-nav-actions">
          <LanguageToggle />
          {loading ? (
            <span className="wc-nav-skeleton" aria-hidden="true" />
          ) : user && !user.isAnonymous ? (
            <UserAvatar user={user} />
          ) : (
            <SignInButton />
          )}
        </div>
      </div>

      <ContinuePill pathname={pathname} />

      <NavDrawer
        isOpen={drawerOpen}
        onClose={closeDrawer}
        pathname={pathname}
        admin={admin}
        labPublic={LAB_PUBLIC}
      />
    </header>
  );
}
