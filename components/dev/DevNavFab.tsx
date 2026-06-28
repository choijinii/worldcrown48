/**
 * DevNavFab — bottom-right ⚙️ floating button that opens the Dev Nav sheet
 * (ADR-0008, W-1).
 *
 * Renders nothing until Dev Nav is activated (Cmd/Ctrl+Shift+D), so a normal
 * Voter never sees it and it stays out of the DOM. The shortcut listener lives
 * in useDevNav and is active even while hidden, so it can switch itself on.
 *
 * z-index 60: above the Navbar (50), below the consent modal (70). The C-2
 * Crown Card share button is z-index 9 inside the card — no conflict.
 * The sheet auto-closes on route change (handoff §8 #4).
 */

"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useDevNav } from "@/lib/dev/useDevNav";
import { DevNavSheet } from "./DevNavSheet";

export function DevNavFab(): JSX.Element | null {
  const { enabled } = useDevNav();
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Close the sheet whenever the route changes.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  if (!enabled) return null;

  return (
    <>
      <button
        type="button"
        aria-label="Dev navigation"
        aria-expanded={open}
        data-testid="dev-nav-fab"
        onClick={() => setOpen((o) => !o)}
        style={{
          position: "fixed",
          right: 24,
          bottom: 24,
          zIndex: 60,
          width: 48,
          height: 48,
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 22,
          lineHeight: 1,
          background: "var(--color-gold, #FCD006)",
          color: "#0E0944",
          border: "none",
          boxShadow: "0 6px 20px rgba(252,208,6,0.35)",
          cursor: "pointer",
        }}
      >
        <span aria-hidden="true">⚙️</span>
      </button>
      <DevNavSheet open={open} onClose={() => setOpen(false)} />
    </>
  );
}
