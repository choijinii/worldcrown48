/**
 * DesktopOnly — gates The Lab to ≥1440px viewports (AC Step2 #7, §6 반응형).
 *
 * Pure CSS media-query toggle (no matchMedia/useEffect) so there's no SSR flash
 * and no hydration mismatch. Below 1440px the operator gets an explicit
 * "Desktop only" notice instead of a broken 6-column grid.
 */
"use client";

import type { ReactNode } from "react";
import { useT } from "@/lib/i18n/useT";
import { lab } from "./theme";

export function DesktopOnly({ children }: { children: ReactNode }): JSX.Element {
  const { t } = useT();

  return (
    <>
      <style>{`
        .lab-desktop-content { display: none; }
        .lab-desktop-notice { display: flex; }
        @media (min-width: 1440px) {
          .lab-desktop-content { display: block; }
          .lab-desktop-notice { display: none; }
        }
      `}</style>

      <div className="lab-desktop-content">{children}</div>

      <div
        className="lab-desktop-notice"
        role="status"
        style={{
          minHeight: "100vh",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 12,
          background: lab.bg,
          color: lab.text,
          fontFamily: lab.font,
          textAlign: "center",
          padding: 24,
        }}
      >
        <div style={{ fontSize: 40 }}>🖥️</div>
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>
          {t("lab.desktop.title")}
        </h1>
        <p style={{ margin: 0, fontSize: 13, color: lab.textSub, maxWidth: 320 }}>
          {t("lab.desktop.body")}
        </p>
      </div>
    </>
  );
}
