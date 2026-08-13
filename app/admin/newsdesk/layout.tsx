/**
 * /admin/newsdesk layout — dark operator-console theme (ND-1 §3 #8).
 *
 * The News Desk is a Domain-2-adjacent operator surface (dark group, 불변 원칙 #1).
 * Opts out of light inheritance and paints the deep-twilight background so gate,
 * loading, and content states are consistently dark — same shell as /admin/lab.
 */
import type { ReactNode } from "react";

export default function NewsDeskLayout({
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
