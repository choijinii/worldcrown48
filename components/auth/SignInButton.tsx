/**
 * SignInButton — 메뉴바의 노란 로그인 알약 (YT-FIX-1 · 원장 D-76).
 *
 * Single concern: trigger Google sign-in from the authStore action and
 * surface a toast on failure.
 *
 * Failure handling (acceptance §4-1):
 *   - Popup blocked → the action transparently falls back to redirect; no
 *     error surfaces here.
 *   - Popup closed / cancelled / network / other → toast in current locale.
 *
 * Loading state: the action is awaited, button is disabled during the
 * call. The button keeps the same label rather than swapping
 * to "Signing in..." — popup auth resolves in under a second on the happy
 * path and a label swap just causes visual jitter.
 */

"use client";

import { useState } from "react";
import { useAuthStore } from "@/lib/authStore";
import { useI18n } from "@/lib/i18n";
import { useT } from "@/lib/i18n/useT";
import { showToast } from "@/lib/toast";

export function SignInButton(): JSX.Element {
  const signInWithGoogle = useAuthStore((s) => s.signInWithGoogle);
  const { lang } = useI18n();
  const { t } = useT();
  const [busy, setBusy] = useState(false);

  async function handleClick() {
    if (busy) return;
    setBusy(true);
    try {
      // 계측 소킥 A: 헤더/탭바에서 바로 누르는 로그인이라 trigger_point는 "header".
      await signInWithGoogle("header");
    } catch {
      showToast(
        lang === "ko"
          ? "로그인에 실패했어요. 다시 시도해 주세요."
          : "Sign in failed. Please try again.",
        "error",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={busy}
      aria-label="Sign in with Google"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        boxSizing: "border-box",
        height: 36,
        padding: "0 18px",
        borderRadius: 999,
        border: "1px solid var(--color-gold)",
        background: "var(--color-gold)",
        color: "var(--arena-continue-text)",
        fontFamily: "var(--font-sans)",
        fontWeight: 700,
        fontSize: 14,
        whiteSpace: "nowrap",
        cursor: busy ? "wait" : "pointer",
        opacity: busy ? 0.6 : 1,
      }}
    >
      {t("nav.signIn")}
    </button>
  );
}
