/**
 * /account layout — light-theme wrapper.
 *
 * CLAUDE.md immutable principle #1: Domain 4 (The Locker Room) is light.
 * The wrapper is just `data-theme="light"`; the actual tokens come from
 * globals.css. No other side effects — this exists purely to scope the
 * theme away from any dark-theme route the user navigates from.
 */
import type { ReactNode } from "react";

export default function AccountLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div data-theme="light" className="domain-locker" style={{ minHeight: "100vh", background: "var(--color-bg-light, #F2F2F5)" }}>
      {children}
    </div>
  );
}
