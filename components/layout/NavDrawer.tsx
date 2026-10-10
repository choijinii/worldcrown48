"use client";

/**
 * NavDrawer — ☰ 서랍 (NAV-1 C · 원장 D-19 + 09-21 · 09-22 · 정본 4 · 5 · 8 · GNB.jsx Drawer).
 *
 * 옛 SiteMapSheet(카드 8줄)을 대체한다 — 단어만 세로로 놓고 오른쪽 ▸ 로 하위를 펼친다.
 * 항목은 전부 lib/layout/navMap 에서 오고, 여기는 그리기와 키보드만 한다.
 *
 *   · 줄 글자 = 그 메뉴의 첫 화면 링크 · ▸ = 펼치기(`aria-expanded`). Policy Hub 는 첫 화면이
 *     없어 줄 전체가 펼치기 버튼이다.
 *   · 흐린 줄 = 링크 아님 · `aria-disabled` · 초점은 받되 Enter 로 이동 없음 · 화면 낭독기에만
 *     안내(R3). 통계 없음.
 *   · 관리자 묶음은 구분선 아래(정본 5) — 관리자에게만.
 *   · 열리면 첫 줄에 초점, 닫으면 ☰ 버튼으로 돌아간다(R6). Esc · 바깥 누름 · × 로 닫힌다.
 *     닫기는 focus-trap 에 얹지 않는다 — StrictMode 재마운트가 즉시 닫는다(lib/ui/dismiss).
 */

import { useEffect, useState } from "react";
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

export interface NavDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  pathname: string;
  admin: boolean;
  labPublic: boolean;
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

  // 열 때마다 지금 페이지가 속한 묶음만 펼쳐 둔다.
  useEffect(() => {
    if (isOpen) setExpanded(current ? { [current]: true } : {});
  }, [isOpen, current]);

  if (!isOpen) return null;

  const items = drawerItems({ labPublic });
  const adminItems = drawerAdminItems({ admin, labPublic });
  const signedIn = Boolean(user && !user.isAnonymous);
  const toggle = (key: NavKey) => setExpanded((e) => ({ ...e, [key]: !e[key] }));

  const subRow = (sub: NavSub) => {
    const label = t(sub.labelKey);
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
          onClick={onClose}
          data-testid={`drawer-sub-${sub.key}`}
        >
          {label}
        </Link>
      </li>
    );
  };

  return (
    <FocusTrap
      focusTrapOptions={{
        escapeDeactivates: false,
        clickOutsideDeactivates: false,
        initialFocus: ".wc-drawer-row-main",
        fallbackFocus: ".wc-drawer",
      }}
    >
      <div
        className="wc-drawer-overlay"
        role="presentation"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <nav className="wc-drawer" role="dialog" aria-modal="true" aria-label="Site map" tabIndex={-1} data-testid="nav-drawer">
          <div className="wc-drawer-head">
            <button type="button" className="wc-drawer-close" aria-label={t("nav.drawer.close")} onClick={onClose} data-testid="nav-drawer-close">
              <span aria-hidden="true">×</span>
            </button>
            <img src="/brand/wc48-crown-filled.svg" alt="" className="wc-drawer-crown" />
            <span className="wc-drawer-brand">WorldCrown48</span>
          </div>

          <div className="wc-drawer-body">
            <ul className="wc-drawer-list">
              {items.map((n) => {
                const isCurrent = n.key === current;
                const open = Boolean(expanded[n.key]);
                const subId = `wc-drawer-sub-${n.key}`;
                return (
                  <li key={n.key}>
                    <div className="wc-drawer-row" data-current={isCurrent}>
                      {n.href ? (
                        <Link
                          href={n.href}
                          className="wc-drawer-row-main"
                          aria-current={isCurrent ? "page" : undefined}
                          onClick={onClose}
                          data-testid={`drawer-item-${n.key}`}
                        >
                          {n.label}
                        </Link>
                      ) : (
                        <button
                          type="button"
                          className="wc-drawer-row-main"
                          aria-expanded={open}
                          aria-controls={subId}
                          onClick={() => toggle(n.key)}
                          data-testid={`drawer-item-${n.key}`}
                        >
                          {n.label}
                        </button>
                      )}
                      {n.children && (
                        <button
                          type="button"
                          className="wc-drawer-toggle"
                          aria-expanded={open}
                          aria-controls={subId}
                          aria-label={n.label}
                          onClick={() => toggle(n.key)}
                          data-testid={`drawer-toggle-${n.key}`}
                        >
                          {/* ▸ 글자는 글꼴에 없어 점으로 보였다 — 10px 삼각형(열리면 90° 회전). */}
                          <svg aria-hidden="true" viewBox="0 0 10 10" width="10" height="10" fill="currentColor">
                            <path d="M3 1v8l5-4z" />
                          </svg>
                        </button>
                      )}
                    </div>
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
                  {adminItems.map((a) => (
                    <li key={a.key}>
                      <div className="wc-drawer-row">
                        <Link href={a.href} className="wc-drawer-row-main" onClick={onClose} data-testid={`drawer-admin-${a.key}`}>
                          {a.label}
                        </Link>
                      </div>
                    </li>
                  ))}
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
              <button
                type="button"
                className="wc-drawer-signout"
                onClick={() => {
                  onClose();
                  void signOut();
                }}
              >
                {t("nav.drawer.signOut")}
              </button>
            ) : (
              <SignInButton />
            )}
          </div>
        </nav>
      </div>
    </FocusTrap>
  );
}
