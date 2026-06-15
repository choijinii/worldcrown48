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

interface ToastState {
  toasts: Toast[];
  show: (message: string, variant: ToastVariant) => void;
  dismiss: (id: number) => void;
}

const TOAST_DURATION_MS = 4_000;

let nextId = 1;

export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],
  show: (message, variant) => {
    const id = nextId++;
    set((s) => ({ toasts: [...s.toasts, { id, message, variant }] }));
    if (typeof window !== "undefined") {
      window.setTimeout(() => {
        // Re-check via get() — the toast may have been dismissed by click.
        if (get().toasts.some((t) => t.id === id)) {
          set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
        }
      }, TOAST_DURATION_MS);
    }
  },
  dismiss: (id) =>
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

export function showToast(
  message: string,
  variant: ToastVariant = "info",
): void {
  useToastStore.getState().show(message, variant);
}
