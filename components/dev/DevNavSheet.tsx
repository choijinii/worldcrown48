/**
 * DevNavSheet — the expanded Dev Nav panel (ADR-0008, W-1).
 *
 * Popover (not a modal): a bottom-right card listing the 7 surfaces a
 * designer spot-checks. Open/close is a CSS transition (no animation lib —
 * stack is locked, CLAUDE.md #8). Locker Room is a disabled "Coming soon"
 * row. Mounted always so the transition can play; visibility driven by `open`.
 */

"use client";

import Link from "next/link";
import { DEV_DOMAINS } from "@/lib/dev/devNav";

export interface DevNavSheetProps {
  open: boolean;
  onClose: () => void;
}

export function DevNavSheet({ open, onClose }: DevNavSheetProps): JSX.Element {
  return (
    <nav
      aria-label="Dev navigation"
      aria-hidden={!open}
      data-testid="dev-nav-sheet"
      style={{
        position: "fixed",
        right: 24,
        bottom: 84,
        zIndex: 61,
        width: 240,
        padding: 8,
        borderRadius: 14,
        background: "var(--color-bg-elevated)",
        border: "1px solid var(--color-gold)",
        boxShadow: "0 12px 40px rgba(0,0,0,0.45)",
        fontFamily: "Inter, system-ui, sans-serif",
        // CSS-only enter/exit.
        transform: open ? "translateY(0)" : "translateY(8px)",
        opacity: open ? 1 : 0,
        pointerEvents: open ? "auto" : "none",
        transition: "opacity 160ms ease, transform 160ms ease",
      }}
    >
      <div
        style={{
          fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)",
          fontSize: 10,
          letterSpacing: "0.18em",
          color: "var(--color-gold)",
          padding: "8px 10px 6px",
        }}
      >
        DEV NAV · 7 DOMAINS
      </div>

      <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
        {DEV_DOMAINS.map((d) =>
          d.enabled ? (
            <li key={d.key}>
              <Link
                href={d.href}
                onClick={onClose}
                data-testid={`dev-nav-link-${d.key}`}
                style={rowStyle(false)}
              >
                <span>{d.label}</span>
                <span aria-hidden="true" style={{ opacity: 0.5 }}>
                  ↗
                </span>
              </Link>
            </li>
          ) : (
            <li key={d.key}>
              <span
                aria-disabled="true"
                data-testid={`dev-nav-link-${d.key}`}
                style={rowStyle(true)}
              >
                <span>{d.label}</span>
                <span style={{ fontSize: 11, opacity: 0.6 }}>
                  {d.note ?? "Coming soon"}
                </span>
              </span>
            </li>
          ),
        )}
      </ul>
    </nav>
  );
}

function rowStyle(disabled: boolean): React.CSSProperties {
  return {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    padding: "10px 12px",
    borderRadius: 9,
    fontSize: 14,
    fontWeight: 600,
    textDecoration: "none",
    color: disabled
      ? "var(--color-text-muted)"
      : "var(--color-text)",
    cursor: disabled ? "not-allowed" : "pointer",
  };
}
