/**
 * SignInButton — gold-outline "SIGN IN" button in the Navbar.
 *
 * Single concern: trigger Google sign-in from the authStore action and
 * surface a toast on failure. The button label stays "SIGN IN" in both
 * locales (handoff §C i18n table).
 *
 * Failure handling (acceptance §4-1):
 *   - Popup blocked → the action transparently falls back to redirect; no
 *     error surfaces here.
 *   - Popup closed / cancelled / network / other → toast in current locale.
 *
 * Loading state: the action is awaited, button is disabled during the
 * call. The button keeps the same label ("SIGN IN") rather than swapping
 * to "Signing in..." — popup auth resolves in under a second on the happy
 * path and a label swap just causes visual jitter.
 */

"use client";

import { useState } from "react";
import { useAuthStore } from "@/lib/authStore";
import { useI18n } from "@/lib/i18n";
import { showToast } from "@/lib/toast";

export function SignInButton(): JSX.Element {
  const signInWithGoogle = useAuthStore((s) => s.signInWithGoogle);
  const { lang } = useI18n();
  const [busy, setBusy] = useState(false);

  async function handleClick() {
    if (busy) return;
    setBusy(true);
    try {
      await signInWithGoogle();
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
        height: 40,
        padding: "0 16px",
        borderRadius: 12,
        border: "1px solid var(--color-gold, #FCD006)",
        background: "transparent",
        color: "var(--color-text-light, #0E0944)",
        fontFamily: "Inter, system-ui, sans-serif",
        fontWeight: 600,
        fontSize: 13,
        letterSpacing: "0.08em",
        cursor: busy ? "wait" : "pointer",
        opacity: busy ? 0.6 : 1,
      }}
    >
      <GoogleGlyph />
      SIGN IN
    </button>
  );
}

/**
 * Google "G" mark, inline SVG. Brand-coloured per Google's identity guide.
 * aria-hidden because the parent button already carries an aria-label.
 */
function GoogleGlyph(): JSX.Element {
  return (
    <svg width="16" height="16" viewBox="0 0 18 18" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.205c0-.638-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.614z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"
      />
    </svg>
  );
}
