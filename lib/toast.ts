/**
 * Minimal toast queue — used by D-1 auth flows and the GDPR delete path.
 *
 * Mount <Toaster /> once at the root; call `showToast(message, variant)`
 * from anywhere. Each toast auto-dismisses after TOAST_DURATION_MS so we
 * don't accumulate a stale queue.
 *
 * Variants drive colour:
 *   - "success" → turquoise   (sign-out complete, delete request received)
 *   - "error"   → crimson     (sign-in failed, link failed, rate-limited)
 *   - "info"    → text colour (default)
 *
 * Pre-renders are SSR-safe: `toasts` is an empty array on the server, and
 * Toaster simply renders nothing.
 */
import { create } from "zustand";

export type ToastVariant = "info" | "success" | "error";

export interface Toast {
  id: number;
  message: string;
  variant: ToastVariant;
}

interface ToastOptions {
  /**
   * Auto-dismiss delay in ms. Pass 0 to require an explicit dismiss click
   * (used for the GDPR receipt copy that warns "up to 30 days").
   */
  durationMs?: number;
}

interface ToastState {
  toasts: Toast[];
  show: (
    message: string,
    variant: ToastVariant,
    options?: ToastOptions,
  ) => void;
  dismiss: (id: number) => void;
}

// Handoff §4-2 — default 5 s. GDPR copy passes 7 s explicitly.
export const TOAST_DURATION_MS = 5_000;

let nextId = 1;

export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],
  show: (message, variant, options) => {
    const id = nextId++;
    set((s) => ({ toasts: [...s.toasts, { id, message, variant }] }));
    if (typeof window !== "undefined") {
      const delay = options?.durationMs ?? TOAST_DURATION_MS;
      if (delay > 0) {
        window.setTimeout(() => {
          // Re-check via get() — the toast may have been dismissed by click.
          if (get().toasts.some((t) => t.id === id)) {
            set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
          }
        }, delay);
      }
    }
  },
  dismiss: (id) =>
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

export function showToast(
  message: string,
  variant: ToastVariant = "info",
  options?: ToastOptions,
): void {
  useToastStore.getState().show(message, variant, options);
}
