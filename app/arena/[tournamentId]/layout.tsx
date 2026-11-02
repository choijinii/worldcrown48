/**
 * /arena layout — Domain 3 dark surface + global-chrome suppression.
 *
 * The Voter is a player, not a spectator: the global light Navbar is hidden on
 * the Arena (rendered by the ROOT layout, so a scoped :has() rule keyed off
 * [data-arena-root] hides it). 공용 바닥 띠(FooterPolicyRow)는 숨기지 않는다 — 이 틀이
 * 최소 100vh 라 띠는 첫 화면 아래에 놓인다(YT-FIX-1 PR A-1).
 */
import type { ReactNode } from "react";

export default function ArenaLayout({
  children,
}: {
  children: ReactNode;
}): JSX.Element {
  return (
    <div data-arena-root style={{ minHeight: "100vh", background: "var(--color-bg-void)" }}>
      <style>{`
        body:has([data-arena-root]) .gnb { display: none !important; }
      `}</style>
      {children}
    </div>
  );
}
