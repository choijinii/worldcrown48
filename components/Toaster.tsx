/**
 * Toaster — renders the toast queue from lib/toast.
 *
 * Mount once at the root layout (after CookieBanner / ConsentModal so it
 * paints above them in stacking order). The component is theme-neutral —
 * it reads light/dark tokens already defined by the surrounding wrapper.
 *
 * Accessibility:
 *   - `role="status"` + `aria-live="polite"` so screen readers announce
 *     each toast without interrupting the user.
 *   - Click anywhere on a toast to dismiss early.
 */

"use client";

import { useToastStore } from "@/lib/toast";

export function Toaster(): JSX.Element {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: "fixed",
        right: 16,
        bottom: 16,
        display: "flex",
        flexDirection: "column",
        gap: 8,
        zIndex: 9999,
        pointerEvents: "none",
      }}
    >
      {toasts.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => dismiss(t.id)}
          style={{
            pointerEvents: "auto",
            maxWidth: 360,
            padding: "12px 16px",
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
            color: "#FFFFFF",
            fontFamily: "Inter, system-ui, sans-serif",
            fontSize: 14,
            lineHeight: 1.4,
            textAlign: "left",
            boxShadow: "0 12px 32px rgba(0,0,0,0.24)",
            cursor: "pointer",
          }}
        >
          {t.message}
        </button>
      ))}
    </div>
  );
}
