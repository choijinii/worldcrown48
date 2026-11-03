/**
 * /arena/[tournamentId]/champion — Crown Card surface (Domain 3, dark).
 *
 * Mirrors the Arena layout (app/arena/[tournamentId]/layout.tsx): forces the
 * dark Domain-3 surface and hides the global nav so the Crown Card modal fills
 * the viewport; 공용 바닥 띠는 첫 화면 아래(YT-FIX-1 PR A-1) (CLAUDE.md 원칙 #1 — Domain 0~3 dark).
 */
import type { ReactNode } from "react";

export default function ChampionLayout({ children }: { children: ReactNode }): JSX.Element {
  return (
    <div data-arena-root style={{ minHeight: "100vh", background: "var(--color-bg-void)" }}>
      <style>{`
        body:has([data-arena-root]) .gnb { display: none !important; }
      `}</style>
      {children}
    </div>
  );
}
