/**
 * /arena/[tournamentId]/champion — Crown Card surface (Domain 3, dark).
 *
 * Mirrors the Arena layout (app/arena/[tournamentId]/layout.tsx): forces the
 * dark Domain-3 surface and hides the global nav/footer so the Crown Card modal
 * fills the viewport (CLAUDE.md 원칙 #1 — Domain 0~3 dark).
 */
import type { ReactNode } from "react";

export default function ChampionLayout({ children }: { children: ReactNode }): JSX.Element {
  return (
    <div data-arena-root style={{ minHeight: "100vh", background: "#00001f" }}>
      <style>{`
        body:has([data-arena-root]) .gnb,
        body:has([data-arena-root]) .policy-footer-row { display: none !important; }
      `}</style>
      {children}
    </div>
  );
}
