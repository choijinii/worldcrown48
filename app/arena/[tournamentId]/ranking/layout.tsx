/**
 * /arena/[tournamentId]/ranking — RANKING surface (Domain 3, dark).
 *
 * Mirrors the Arena layout: forces the dark Domain-3 surface and hides the
 * global light nav/footer (CLAUDE.md 원칙 #1 — Domain 0~3 dark). RankingView is
 * imported ONLY under this route (Round Scope Lock, §9 trap #11).
 */
import type { ReactNode } from "react";

export default function RankingLayout({
  children,
}: {
  children: ReactNode;
}): JSX.Element {
  return (
    <div data-arena-root style={{ minHeight: "100vh", background: "var(--color-bg-void)" }}>
      <style>{`
        body:has([data-arena-root]) .gnb,
        body:has([data-arena-root]) .policy-footer-row { display: none !important; }
      `}</style>
      {children}
    </div>
  );
}
