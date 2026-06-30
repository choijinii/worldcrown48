/**
 * AdminShell — the dashboard's sidebar + main grid (handoff §6.1).
 *
 * Renders the ≤480px MobileNotice (CSS swaps it in) alongside the .app-shell.
 * Holds the sidebar expanded/collapsed state. Rendered only inside the
 * allowed branch of AdminAuthGuardLight.
 */
"use client";

import { useState } from "react";
import { AdminSidebar } from "./AdminSidebar";
import { DashboardMain } from "./DashboardMain";
import { MobileNotice } from "./MobileNotice";

export function AdminShell(): JSX.Element {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <>
      <MobileNotice />
      <div className="app-shell" data-sidebar={collapsed ? "collapsed" : "expanded"}>
        <AdminSidebar collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />
        <DashboardMain />
      </div>
    </>
  );
}
