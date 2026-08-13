/**
 * /arena layout — Domain 3 dark surface + global-chrome suppression.
 *
 * The Voter is a player, not a spectator: the global light Navbar and the
 * policy footer are hidden on the Arena (the wireframe uses a minimal vgnb
 * instead). They're rendered by the ROOT layout (siblings of this subtree), so
 * we hide them with a scoped :has() rule keyed off [data-arena-root] rather
 * than editing the shared components.
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
        body:has([data-arena-root]) .gnb,
        body:has([data-arena-root]) .policy-footer-row { display: none !important; }
      `}</style>
      {children}
    </div>
  );
}
