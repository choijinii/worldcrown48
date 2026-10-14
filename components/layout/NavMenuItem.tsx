"use client";

/**
 * NavMenuItem — 메뉴바의 ▾ 항목 하나 + 펼침 메뉴 (NAV-1 B2 · §0-B 9 · 정본 29 · 30).
 *
 * 글자와 ▾ 는 둘로 나뉜다:
 *   · 글자 = 그 메뉴의 첫 화면 링크(The Arena → /arena · Record Room → /records · Newsroom → /news)
 *   · ▾ 버튼 = 펼침 메뉴(`aria-haspopup="menu"` · `aria-expanded`). 누름 · Enter · Space · ↓ 로 열림.
 * 마우스를 올려도 열린다. 메뉴바 전체에서 한 번에 하나만 열린다 — 열린 항목 키는 Navbar 가 쥔다.
 * Esc · 바깥 누름 · Tab 으로 닫히고, Esc 는 ▾ 버튼으로 초점을 돌려준다. 규칙은 lib/layout/menuKeys.
 *
 * 흐린 줄(Hall of Fame)은 `menuitem` 이지만 링크가 아니다 — 초점은 받고 Enter 로 이동하지 않는다.
 */

import { useEffect, useRef } from "react";
import Link from "next/link";
import { useT } from "@/lib/i18n/useT";
import { menuKeyAction, moveIndex, triggerKeyAction } from "@/lib/layout/menuKeys";
import { isDimmed, type NavItem, type NavSub, type NavSubKey } from "@/lib/layout/navMap";

export interface NavMenuItemProps {
  item: NavItem;
  subs: NavSub[];
  current: boolean;
  currentSub: NavSubKey | null;
  open: boolean;
  /** 열기 요청 — `focus` 가 있으면 열린 뒤 그 줄에 초점. */
  onOpen: (focus?: "first" | "last") => void;
  onClose: () => void;
  pendingFocus: "first" | "last" | null;
}

export function NavMenuItem({
  item,
  subs,
  current,
  currentSub,
  open,
  onOpen,
  onClose,
  pendingFocus,
}: NavMenuItemProps): JSX.Element {
  const { t } = useT();
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuId = `wc-nav-menu-${item.key}`;

  const rows = (): HTMLElement[] =>
    Array.from(rootRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? []);

  // 키보드로 열었을 때만 첫·마지막 줄에 초점(마우스로 열면 초점을 옮기지 않는다).
  useEffect(() => {
    if (!open || !pendingFocus) return;
    const r = rows();
    r[pendingFocus === "first" ? 0 : r.length - 1]?.focus();
  }, [open, pendingFocus]);

  // 바깥 누름으로 닫기.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) onClose();
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open, onClose]);

  const onTriggerKey = (e: React.KeyboardEvent) => {
    const action = triggerKeyAction(e.key);
    if (!action) return;
    e.preventDefault();
    if (action === "close") onClose();
    else onOpen(action === "open-first" ? "first" : "last");
  };

  const onMenuKey = (e: React.KeyboardEvent) => {
    const action = menuKeyAction(e.key);
    if (!action) return;
    if (action === "close") {
      // Tab — 브라우저가 다음 요소로 초점을 옮긴 뒤에 닫는다(먼저 닫으면 초점 줄이 사라져 body 로 떨어진다).
      requestAnimationFrame(onClose);
      return;
    }
    e.preventDefault();
    if (action === "close-return") {
      onClose();
      triggerRef.current?.focus();
      return;
    }
    const r = rows();
    const at = r.indexOf(document.activeElement as HTMLElement);
    r[moveIndex(at, r.length, action)]?.focus();
  };

  return (
    <div
      ref={rootRef}
      className="wc-nav-group"
      onMouseEnter={() => onOpen()}
      // 키보드로 연 메뉴 안에 초점이 있으면 마우스가 지나가도 닫지 않는다(초점이 body 로 떨어지지 않게).
      onMouseLeave={() => {
        if (!rootRef.current?.contains(document.activeElement)) onClose();
      }}
    >
      <Link
        href={item.href as string}
        className="wc-nav-item"
        aria-current={current ? "page" : undefined}
        data-testid={`nav-item-${item.key}`}
      >
        {item.label}
      </Link>
      <button
        ref={triggerRef}
        type="button"
        className="wc-nav-caret"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label={item.label}
        data-current={current}
        // 누름은 열기만 한다 — 마우스를 올리는 순간 이미 열렸으므로 토글이면 누르자마자 닫힌다.
        onClick={() => onOpen()}
        onKeyDown={onTriggerKey}
        data-testid={`nav-caret-${item.key}`}
      >
        {/* ▾ 글자는 Inter·Pretendard 에 없어 점으로 보였다 — 같은 크기(9px)의 삼각형을 그린다. */}
        <svg aria-hidden="true" viewBox="0 0 10 10" width="9" height="9" fill="currentColor">
          <path d="M1 3h8L5 8z" />
        </svg>
      </button>
      {open && (
        <div id={menuId} role="menu" aria-label={item.label} className="wc-nav-dropdown" onKeyDown={onMenuKey} data-testid={`nav-dropdown-${item.key}`}>
          {subs.map((s) =>
            isDimmed(s) ? (
              <span
                key={s.key}
                role="menuitem"
                aria-disabled="true"
                tabIndex={-1}
                className="wc-nav-dropdown-row"
                data-dim="true"
                data-testid={`nav-sub-${s.key}`}
              >
                {t(s.labelKey)}
                <span className="wc-sr">{` · ${t("nav.dim.sr")}`}</span>
              </span>
            ) : (
              <Link
                key={s.key}
                href={s.href as string}
                role="menuitem"
                tabIndex={-1}
                className="wc-nav-dropdown-row"
                aria-current={s.key === currentSub ? "page" : undefined}
                onClick={onClose}
                data-testid={`nav-sub-${s.key}`}
              >
                {t(s.labelKey)}
              </Link>
            ),
          )}
        </div>
      )}
    </div>
  );
}
