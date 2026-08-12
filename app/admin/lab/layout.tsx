/**
 * /admin/lab layout — forces the dark theme for the operator console.
 *
 * Domain 2 is part of the dark group (불변 원칙 #1). The admin subtree opts out
 * of any light-theme inheritance and paints the deep-twilight background so the
 * gate, loading, and content states are all consistently dark.
 */
import type { ReactNode } from "react";

export default function LabLayout({
  children,
}: {
  children: ReactNode;
}): JSX.Element {
  return (
    <div data-theme="dark" style={{ minHeight: "100vh", background: "var(--color-bg-default)" }}>
      {children}
    </div>
  );
}
