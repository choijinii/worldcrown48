"use client";

/**
 * NavDrawer — ☰ 서랍 (NAV-1 C · 원장 D-19 + 09-21 · 09-22 · 정본 v4 33–39 · GNB.jsx Drawer).
 *
 * body 로 띄운다(portal) — 메뉴바 층 밖이라 동의 바 위에 온다.
 * 옛 SiteMapSheet(카드 8줄)을 대체한다 — 단어만 세로로 놓고 오른쪽 ▸ 로 하위를 펼친다.
 * 항목은 전부 lib/layout/navMap 에서 오고, 여기는 그리기와 키보드만 한다.
 *
 *   · 하위가 있는 대분류(The Arena · Record Room · Newsroom · Policy Hub) = 줄 전체가 펼치기
 *     버튼(`aria-expanded`). 이름이든 ▸ 든 누르면 펼침/접기만 — 페이지 이동 없음(정본 v4).
 *   · 하위 줄 · 하위 없는 대분류(The Pitch · Locker Room) · 관리자 줄 = 이동한다. **서랍은 열린 채**.
 *   · 닫힘은 바깥(어두운 막) 누르기 · ✕ · Esc 세 가지뿐.
 *   · 흐린 줄 = 링크 아님 · `aria-disabled` · 초점은 받되 Enter 로 이동 없음 · 화면 낭독기에만
 *     안내(R3). 통계 없음.
 *   · 관리자 묶음은 구분선 아래(정본 5) — 관리자에게만.
 *   · 열리면 첫 줄에 초점, 닫으면 ☰ 버튼으로 돌아간다(R6).
 *     닫기는 focus-trap 에 얹지 않는다 — StrictMode 재마운트가 즉시 닫는다(lib/ui/dismiss).
 *   · 움직임: 열림 220ms · 닫힘 180ms · cubic-bezier(.2,.8,.2,1) · 왼쪽에서 밀려 나옴 · 어두운 막은
 *     같은 시간에 opacity. 움직임 줄이기면 즉시(navbar.css). 닫힐 때는 움직임이 끝난 뒤 내린다.
 *   · 머리 = ✕ 가 ☰ 와 같은 자리 · 로고는 메뉴바와 같은 부품(NavBrand).
 */

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import FocusTrap from "focus-trap-react";
import { useEscapeClose } from "@/lib/ui/dismiss";
import { useT } from "@/lib/i18n/useT";
import { useLocaleSync } from "@/lib/useLocaleSync";
import { LOCALE_META, SUPPORTED_LOCALES } from "@/lib/locale";
import { useAuthStore } from "@/lib/authStore";
import { SignInButton } from "@/components/auth/SignInButton";
import {
  activeNavKey,
  activeSubKey,
  drawerAdminItems,
  drawerItems,
  isDimmed,
  type NavKey,
  type NavSub,
} from "@/lib/layout/navMap";
import { NavBrand } from "./NavBrand";
import { NavIcon } from "./NavIcon";

/** 정본 GNB.jsx MOTION — 닫힘 움직임 길이. 이 시간이 지나면 서랍을 DOM 에서 내린다. */
const CLOSE_MS = 180;

export interface NavDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  pathname: string;
  admin: boolean;
  labPublic: boolean;
}

function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;
}

export function NavDrawer({ isOpen, onClose, pathname, admin, labPublic }: NavDrawerProps): JSX.Element | null {
  // 훅은 조기 return 앞에 — 열림 여부는 인자로 넘긴다(호출 순서 고정).
  useEscapeClose(onClose, isOpen);
  const { t } = useT();
  const { lang, setLocale } = useLocaleSync();
  const user = useAuthStore((s) => s.user);
  const signOut = useAuthStore((s) => s.signOut);
  const current = activeNavKey(pathname);
  const currentSub = activeSubKey(pathname);
  const [expanded, setExpanded] = useState<Partial<Record<NavKey, boolean>>>({});
  // mounted = DOM 에 있음(닫히는 움직임 동안에도) · shown = 열린 모양(움직임의 목표).
  const [mounted, setMounted] = useState(isOpen);
  const [shown, setShown] = useState(false);
  const currentRef = useRef(current);
  currentRef.current = current;

  // 열 때만 지금 페이지가 속한 묶음을 펼쳐 둔다 — 서랍 안에서 이동해도 펼친 묶음은 그대로.
  useEffect(() => {
    if (isOpen) setExpanded(currentRef.current ? { [currentRef.current]: true } : {});
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      setMounted(true);
      // 닫힌 모양으로 한 번 그린 뒤 열린 모양으로 — 그래야 transform 움직임이 보인다.
      const id = requestAnimationFrame(() => requestAnimationFrame(() => setShown(true)));
      return () => cancelAnimationFrame(id);
    }
    setShown(false);
    const timer = window.setTimeout(() => setMounted(false), prefersReducedMotion() ? 0 : CLOSE_MS);
    return () => window.clearTimeout(timer);
  }, [isOpen]);

  if (!mounted || typeof document === "undefined") return null;

  const items = drawerItems({ labPublic });
  const adminItems = drawerAdminItems({ admin, labPublic });
  const signedIn = Boolean(user && !user.isAnonymous);
  const toggle = (key: NavKey) => setExpanded((e) => ({ ...e, [key]: !e[key] }));

  const subRow = (sub: NavSub) => {
    const label = <span className="wc-drawer-label">{t(sub.labelKey)}</span>;
    if (isDimmed(sub)) {
      return (
        <li key={sub.key}>
          <span
            className="wc-drawer-sub"
            data-dim="true"
            aria-disabled="true"
            role="link"
            tabIndex={0}
            data-testid={`drawer-sub-${sub.key}`}
          >
            {label}
            <span className="wc-sr">{` · ${t("nav.dim.sr")}`}</span>
          </span>
        </li>
      );
    }
    const isCurrent = sub.key === currentSub;
    return (
      <li key={sub.key}>
        <Link
          href={sub.href as string}
          className="wc-drawer-sub"
          aria-current={isCurrent ? "page" : undefined}
          data-testid={`drawer-sub-${sub.key}`}
        >
          {label}
        </Link>
      </li>
    );
  };

  // body 로 띄운다 — 메뉴바(sticky · z 50) 안에 있으면 그 층에 갇혀 동의 바(z 60)가 서랍 바닥
  // (언어 칩 · 로그인)을 덮는다(검수 2026-10-11). 층은 navbar.css 의 .wc-drawer-overlay.
  return createPortal(
    <FocusTrap
      active={isOpen}
      focusTrapOptions={{
        escapeDeactivates: false,
        clickOutsideDeactivates: false,
        initialFocus: ".wc-drawer-row-main",
        fallbackFocus: ".wc-drawer",
      }}
    >
      <div
        className="wc-drawer-overlay"
        data-open={shown}
        role="presentation"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <nav
          className="wc-drawer"
          role="dialog"
          aria-modal="true"
          aria-label="Site map"
          aria-hidden={!isOpen || undefined}
          tabIndex={-1}
          data-testid="nav-drawer"
        >
          <div className="wc-drawer-head">
            <button type="button" className="wc-drawer-close" aria-label={t("nav.drawer.close")} onClick={onClose} data-testid="nav-drawer-close">
              <span aria-hidden="true">×</span>
            </button>
            <NavBrand />
          </div>

          <div className="wc-drawer-body">
            <ul className="wc-drawer-list">
              {items.map((n) => {
                const isCurrent = n.key === current;
                const open = Boolean(expanded[n.key]);
                const subId = `wc-drawer-sub-${n.key}`;
                return (
                  <li key={n.key}>
                    {n.children ? (
                      <button
                        type="button"
                        className="wc-drawer-row wc-drawer-row-main"
                        data-current={isCurrent}
                        aria-expanded={open}
                        aria-controls={subId}
                        onClick={() => toggle(n.key)}
                        data-testid={`drawer-item-${n.key}`}
                      >
                        <NavIcon name={n.key} />
                        <span className="wc-drawer-label">{n.label}</span>
                        {/* ▸ 글자는 글꼴에 없어 점으로 보였다 — 10px 삼각형(열리면 90° 회전). */}
                        <svg className="wc-drawer-caret" aria-hidden="true" viewBox="0 0 10 10" width="10" height="10" fill="currentColor">
                          <path d="M3 1v8l5-4z" />
                        </svg>
                      </button>
                    ) : (
                      <Link
                        href={n.href as string}
                        className="wc-drawer-row wc-drawer-row-main"
                        data-current={isCurrent}
                        aria-current={isCurrent ? "page" : undefined}
                        data-testid={`drawer-item-${n.key}`}
                      >
                        <NavIcon name={n.key} />
                        <span className="wc-drawer-label">{n.label}</span>
                      </Link>
                    )}
                    {n.children && open && (
                      <ul id={subId} className="wc-drawer-sublist">
                        {n.children.map(subRow)}
                      </ul>
                    )}
                  </li>
                );
              })}
            </ul>

            {adminItems.length > 0 && (
              <>
                <hr className="wc-drawer-divider" />
                <ul className="wc-drawer-list" data-testid="drawer-admin">
                  {adminItems.map((a) => {
                    const isCurrent = pathname === a.href;
                    return (
                      <li key={a.key}>
                        <Link
                          href={a.href}
                          className="wc-drawer-row wc-drawer-row-main"
                          data-current={isCurrent}
                          aria-current={isCurrent ? "page" : undefined}
                          data-testid={`drawer-admin-${a.key}`}
                        >
                          <NavIcon name={a.key} />
                          <span className="wc-drawer-label">{a.label}</span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </>
            )}
          </div>

          <div className="wc-drawer-foot">
            <div className="wc-drawer-lang">
              <span>{t("nav.drawer.language")}</span>
              <div className="wc-drawer-lang-chips">
                {SUPPORTED_LOCALES.map((l) => (
                  <button
                    key={l}
                    type="button"
                    className="wc-drawer-lang-chip"
                    aria-pressed={l === lang}
                    aria-label={LOCALE_META[l].label}
                    onClick={() => setLocale(l)}
                  >
                    {LOCALE_META[l].abbrev}
                  </button>
                ))}
              </div>
            </div>
            {signedIn ? (
              <button type="button" className="wc-drawer-signout" onClick={() => void signOut()}>
                {t("nav.drawer.signOut")}
              </button>
            ) : (
              <SignInButton />
            )}
          </div>
        </nav>
      </div>
    </FocusTrap>,
    document.body,
  );
}
