/**
 * DesktopOnly — gates The Lab to ≥1440px viewports (AC Step2 #7, §6 반응형).
 *
 * Pure CSS media-query toggle (no matchMedia/useEffect) so there's no SSR flash
 * and no hydration mismatch. Below 1440px the operator gets an explicit
 * "Desktop only" notice instead of a broken 6-column grid.
 */
"use client";

import type { ReactNode } from "react";
import { lab } from "./theme";

export function DesktopOnly({ children }: { children: ReactNode }): JSX.Element {
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
          데스크탑 전용 화면입니다
        </h1>
        <p style={{ margin: 0, fontSize: 13, color: lab.textSub, maxWidth: 320 }}>
          The Lab 운영자 콘솔은 1440px 이상의 화면에서만 사용할 수 있어요.
          데스크탑에서 다시 열어주세요.
        </p>
      </div>
    </>
  );
}
