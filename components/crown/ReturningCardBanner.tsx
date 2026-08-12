/**
 * ReturningCardBanner — the HF-3.1 "you already finished this" notice.
 *
 * When a guest re-completes a Tournament their account already finished (case 2,
 * a CONFLICT), AuthProvider lands them on the EXISTING card and stashes the tid
 * in sessionStorage (RETURNING_CARD_TID_KEY). This banner consumes that flag
 * exactly once: it reads + clears on mount, so a page refresh (no re-navigation)
 * shows nothing. Rendered unconditionally by the Champion page — it self-gates.
 *
 * Copy is catalog-driven (lib/i18n). Crown Gold (--color-gold) is the only accent
 * (원칙 #2); it floats above the in-flow Crown stage via a fixed banner.
 */
"use client";

import { useEffect, useState } from "react";
import { RETURNING_CARD_TID_KEY } from "@/lib/auth/landing";
import { useT } from "@/lib/i18n/useT";

export function ReturningCardBanner({ tournamentId }: { tournamentId: string }): JSX.Element | null {
  const { t } = useT();
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (sessionStorage.getItem(RETURNING_CARD_TID_KEY) === tournamentId) {
      setShow(true);
      // Consume immediately → a refresh never re-raises it (one-time, W2).
      sessionStorage.removeItem(RETURNING_CARD_TID_KEY);
    }
  }, [tournamentId]);

  if (!show) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: "fixed",
        top: 16,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 50,
        maxWidth: "min(92vw, 560px)",
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "12px 16px",
        borderRadius: 12,
        border: "1px solid var(--color-gold)",
        background: "rgba(18,18,22,0.94)",
        color: "var(--color-text)",
        fontFamily: "Inter, system-ui, sans-serif",
        fontSize: 13,
        lineHeight: 1.4,
        boxShadow: "0 8px 28px rgba(0,0,0,0.45)",
      }}
    >
      <span aria-hidden="true" style={{ color: "var(--color-gold)", fontSize: 15 }}>♛</span>
      <span style={{ flex: 1 }}>{t("champion.returning.banner")}</span>
      <button
        type="button"
        onClick={() => setShow(false)}
        aria-label={t("champion.returning.dismiss")}
        style={{
          flexShrink: 0,
          background: "transparent",
          border: "none",
          color: "var(--color-text-dim)",
          cursor: "pointer",
          fontSize: 16,
          lineHeight: 1,
          padding: 2,
        }}
      >
        ×
      </button>
    </div>
  );
}
