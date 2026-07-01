/**
 * AdminSidebar — workspace nav for the Admin Dashboard (handoff §4.5, §6.1).
 *
 * MVP1: Dashboard (current) · Tournaments (M2, disabled — trap #12) · The Lab
 * (/admin/lab link). MVP2: Live operations · AI-Report queue (disabled).
 * Operator footer shows the signed-in admin (initial + name + SYSTEM ADMIN).
 */
"use client";

import Link from "next/link";
import { useAuthStore } from "@/lib/authStore";
import { track } from "@/lib/analytics";
import { useI18n } from "@/lib/i18n";
import type { Lang } from "@/lib/cookieConsent";

function strings(lang: Lang) {
  const ko = {
    workspace: "워크스페이스 · MVP 1",
    operations: "운영 · MVP 2",
    dashboard: "대시보드",
    tournaments: "대진 목록",
    lab: "The Lab",
    liveOps: "라이브 운영",
    aiQueue: "AI-Report 큐",
    soonM2: "MVP 2 예정",
    role: "시스템 관리자",
    brand: "ADMIN · BACKSTAGE",
  };
  const en = {
    workspace: "Workspace · MVP 1",
    operations: "Operations · MVP 2",
    dashboard: "Dashboard",
    tournaments: "Tournaments",
    lab: "The Lab",
    liveOps: "Live operations",
    aiQueue: "AI-Report queue",
    soonM2: "Planned · MVP 2",
    role: "SYSTEM ADMIN",
    brand: "ADMIN · BACKSTAGE",
  };
  return lang === "ko" ? ko : en;
}

interface AdminSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function AdminSidebar({ collapsed, onToggle }: AdminSidebarProps): JSX.Element {
  const { lang } = useI18n();
  const t = strings(lang);
  const user = useAuthStore((s) => s.user);
  const name = user?.displayName ?? user?.email ?? "Operator";
  const initial = name.charAt(0).toUpperCase();

  return (
    <aside className="sidebar" aria-label="Admin sidebar">
      <div className="sb-head">
        <img src="/brand/wc48-crown-filled.svg" alt="" />
        <div className="sbb">
          <span className="sb-wm">WorldCrown48</span>
          <span className="sb-dom">{t.brand}</span>
        </div>
        <button
          className="sb-toggle"
          type="button"
          onClick={onToggle}
          aria-label="Toggle sidebar"
          aria-expanded={!collapsed}
        >
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <line x1="4" y1="7" x2="20" y2="7" />
            <line x1="4" y1="12" x2="20" y2="12" />
            <line x1="4" y1="17" x2="20" y2="17" />
          </svg>
        </button>
      </div>

      <div className="sb-section-label">{t.workspace}</div>
      <nav className="sb-nav" aria-label="Primary">
        <button className="sb-item" type="button" aria-current="page">
          <svg className="sb-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="3" y="3" width="7" height="9" rx="1" /><rect x="14" y="3" width="7" height="5" rx="1" /><rect x="14" y="12" width="7" height="9" rx="1" /><rect x="3" y="16" width="7" height="5" rx="1" />
          </svg>
          <span className="sb-label">{t.dashboard}</span>
          <span className="sb-mvp">M1</span>
        </button>
        <span className="sb-item" aria-disabled="true" title={t.soonM2}>
          <svg className="sb-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" /><circle cx="4" cy="6" r="1.5" /><circle cx="4" cy="12" r="1.5" /><circle cx="4" cy="18" r="1.5" />
          </svg>
          <span className="sb-label">{t.tournaments}</span>
          <span className="sb-mvp">M2</span>
        </span>
        <Link
          className="sb-item"
          href="/admin/lab"
          onClick={() => void track("admin_sidebar_nav", { target: "lab" })}
          title={t.lab}
        >
          <svg className="sb-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M9 3v6L4 19a2 2 0 0 0 1.7 3h12.6A2 2 0 0 0 20 19L15 9V3" /><line x1="8" y1="3" x2="16" y2="3" />
          </svg>
          <span className="sb-label">{t.lab}</span>
          <span className="sb-mvp">M1</span>
        </Link>
      </nav>

      <div className="sb-section-label">{t.operations}</div>
      <nav className="sb-nav" aria-label="Future">
        <span className="sb-item" aria-disabled="true" title={t.soonM2}>
          <svg className="sb-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
          </svg>
          <span className="sb-label">{t.liveOps}</span>
          <span className="sb-mvp">M2</span>
        </span>
        <span className="sb-item" aria-disabled="true" title={t.soonM2}>
          <svg className="sb-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M4 4h13a3 3 0 0 1 3 3v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4z" /><line x1="8" y1="9" x2="16" y2="9" /><line x1="8" y1="13" x2="16" y2="13" /><line x1="8" y1="17" x2="12" y2="17" />
          </svg>
          <span className="sb-label">{t.aiQueue}</span>
          <span className="sb-mvp">M2</span>
        </span>
      </nav>

      <div className="sb-foot">
        <div className="sb-avatar" aria-hidden="true">{initial}</div>
        <div className="sf-info">
          <span className="sf-name">{name}</span>
          <span className="sf-role">{t.role}</span>
        </div>
      </div>
    </aside>
  );
}
