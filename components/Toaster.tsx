/**
 * Toaster — renders the toast queue from lib/toast.
 *
 * Mounted once at the root layout. Handoff §4-2:
 *   - Position: top-right on desktop, top-center on mobile (≤480 px).
 *     Right-bottom is forbidden — rep feedback: hard to notice.
 *   - Rendered via createPortal to `document.body` so a transformed
 *     ancestor (Navbar sticky, CookieBanner, etc.) can't break `fixed`
 *     positioning (trap 17).
 *   - dismiss button per toast (also click-anywhere fallback).
 *
 * Accessibility: `role="status"` + `aria-live="polite"`.
 */

"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useToastStore } from "@/lib/toast";

export function Toaster(): JSX.Element | null {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || typeof document === "undefined") return null;

  return createPortal(
    <div
      id="toast-root"
      role="status"
      aria-live="polite"
      className="toast-root"
      style={{
        position: "fixed",
        top: 16,
        right: 16,
        display: "flex",
        flexDirection: "column",
        gap: 8,
        zIndex: 10000,
        pointerEvents: "none",
        maxWidth: "calc(100vw - 32px)",
      }}
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          data-testid="toast"
          data-variant={t.variant}
          style={{
            pointerEvents: "auto",
            display: "flex",
            alignItems: "flex-start",
            gap: 12,
            width: 360,
            maxWidth: "100%",
            padding: "12px 12px 12px 16px",
            borderRadius: 12,
            border: "1px solid",
            borderColor:
              t.variant === "error"
                ? "rgba(215,6,58,0.4)"
                : t.variant === "success"
                  ? "rgba(0,163,183,0.4)"
                  : "rgba(255,255,255,0.16)",
            background:
              t.variant === "error"
                ? "rgba(215,6,58,0.95)"
                : t.variant === "success"
                  ? "rgba(0,163,183,0.95)"
                  : "rgba(14,9,68,0.95)",
            color: "var(--color-white)",
            fontFamily: "Inter, system-ui, sans-serif",
            fontSize: 14,
            lineHeight: 1.4,
            textAlign: "left",
            boxShadow: "0 12px 32px rgba(0,0,0,0.24)",
          }}
        >
          <span style={{ flex: 1 }}>{t.message}</span>
          <button
            type="button"
            onClick={() => dismiss(t.id)}
            aria-label="Dismiss"
            style={{
              flexShrink: 0,
              width: 28,
              height: 28,
              padding: 0,
              border: "none",
              borderRadius: 8,
              background: "rgba(255,255,255,0.16)",
              color: "var(--color-white)",
              fontSize: 16,
              lineHeight: 1,
              cursor: "pointer",
            }}
          >
            ×
          </button>
        </div>
      ))}
    </div>,
    document.body,
  );
}
