/**
 * LoginModal — sign-in prompt shown when the visitor hits a gate.
 *
 * Three reasons (handoff §4-2 / §부록 C):
 *   - "vote"        → "Sign in to keep voting" + Google button (HF-3: shown when
 *                     a Guest Run is complete or a second Tournament is attempted;
 *                     the guest's first run itself needs no sign-in)
 *   - "share"       → "Sign in to share your Crown Card" + Google button
 *   - "daily_limit" → "You've joined all 5 Tournaments for today (5/5)" + Close
 *
 * The "daily_limit" variant is informational — the visitor is already signed
 * in and has used the Daily Participation Limit (5 NEW Tournaments / KST day;
 * HF-1). Voting inside an already-joined Tournament is unlimited, so there's
 * nothing the modal can do but tell them to come back tomorrow. Hiding the
 * Google button keeps the affordance honest.
 *
 * Success path (popup): signInWithGoogle resolves → onSuccess?.() fires →
 * onClose() collapses the modal so the caller (VoteGate) can retry the
 * pending vote against the new uid. linkSessionVote runs in parallel,
 * inside AuthProvider.
 *
 * Redirect path (iOS Safari / blocker): signInWithGoogle navigates away
 * before resolving. onSuccess never fires; the page reloads with the user
 * already signed in. The caller's mount-time check picks the new state up.
 */

"use client";

import { useRef, useState } from "react";
import FocusTrap from "focus-trap-react";
import { useAuthStore } from "@/lib/authStore";
import { useI18n } from "@/lib/i18n";
import type { Lang } from "@/lib/cookieConsent";
import { showToast } from "@/lib/toast";

export type LoginReason = "vote" | "share" | "daily_limit";

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  reason: LoginReason;
  onSuccess?: () => void;
}

export function LoginModal({
  isOpen,
  onClose,
  reason,
  onSuccess,
}: LoginModalProps): JSX.Element | null {
  const signInWithGoogle = useAuthStore((s) => s.signInWithGoogle);
  const { lang } = useI18n();
  const [busy, setBusy] = useState(false);

  // Live mirror of `busy` for the focus-trap `onDeactivate` guard below.
  // focus-trap-react freezes focusTrapOptions.onDeactivate at construction
  // and never re-syncs it on re-render, so a closure over `busy` would be
  // stuck at the mount-time value (false) — pressing Escape mid-sign-in
  // would then close the modal despite the `!busy` guard. Read via the ref.
  const busyRef = useRef(busy);
  busyRef.current = busy;

  if (!isOpen) return null;

  const t = strings(lang);
  const showGoogleButton = reason !== "daily_limit";

  async function handleSignIn() {
    if (busy) return;
    setBusy(true);
    try {
      await signInWithGoogle();
      onSuccess?.();
      onClose();
    } catch {
      showToast(t.signInFailed, "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="login-modal-title"
      data-theme="light"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        background: "rgba(14,9,68,0.55)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
    >
      <FocusTrap
        focusTrapOptions={{
          initialFocus: showGoogleButton ? "#login-google" : "#login-close",
          escapeDeactivates: true,
          onDeactivate: () => !busyRef.current && onClose(),
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: 420,
            background: "var(--color-surface-light)",
            borderRadius: 20,
            padding: 28,
            boxShadow: "0 24px 60px rgba(14,9,68,0.22)",
            fontFamily: "Inter, system-ui, sans-serif",
            color: "var(--color-text-light)",
            textAlign: "center",
          }}
        >
          <h2
            id="login-modal-title"
            style={{ margin: 0, fontSize: 20, fontWeight: 700, lineHeight: 1.3 }}
          >
            {t[reason]}
          </h2>
          {reason !== "daily_limit" ? (
            <p
              style={{
                margin: "8px 0 24px",
                fontSize: 13,
                color: "var(--color-text-sub-light)",
                lineHeight: 1.5,
              }}
            >
              {t.subtitle}
            </p>
          ) : (
            <p
              style={{
                margin: "8px 0 24px",
                fontSize: 13,
                color: "var(--color-text-sub-light)",
                lineHeight: 1.5,
              }}
            >
              {t.dailyLimitSub}
            </p>
          )}

          {showGoogleButton ? (
            <button
              id="login-google"
              type="button"
              onClick={handleSignIn}
              disabled={busy}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 10,
                width: "100%",
                justifyContent: "center",
                padding: "12px 16px",
                borderRadius: 12,
                border: "1px solid var(--color-border-light)",
                background: "var(--color-surface-light)",
                color: "var(--color-text-light)",
                fontFamily: "Inter, system-ui, sans-serif",
                fontWeight: 600,
                fontSize: 14,
                cursor: busy ? "wait" : "pointer",
              }}
            >
              <GoogleGlyph />
              {busy ? t.signingIn : t.googleCta}
            </button>
          ) : null}

          <button
            id="login-close"
            type="button"
            onClick={onClose}
            disabled={busy}
            style={{
              marginTop: 12,
              width: "100%",
              padding: "10px 16px",
              borderRadius: 12,
              border: "none",
              background: "transparent",
              color: "var(--color-text-sub-light)",
              fontFamily: "Inter, system-ui, sans-serif",
              fontSize: 13,
              cursor: busy ? "wait" : "pointer",
            }}
          >
            {t.close}
          </button>
        </div>
      </FocusTrap>
    </div>
  );
}

function GoogleGlyph(): JSX.Element {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path fill="#4285F4" d="M17.64 9.205c0-.638-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.614z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" />
      <path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" />
      <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" />
    </svg>
  );
}

interface ModalStrings {
  vote: string;
  share: string;
  daily_limit: string;
  subtitle: string;
  dailyLimitSub: string;
  googleCta: string;
  signingIn: string;
  close: string;
  signInFailed: string;
}

// ko/en/es — es is first-class here (LANGUAGE.md: Tournament stays verbatim in
// every language). daily_limit copy = HF-1 §6 (Daily Participation Limit, 5/5).
const STRINGS: Record<Lang, ModalStrings> = {
  ko: {
    vote: "계속하려면 로그인이 필요해요",
    share: "공유하려면 로그인이 필요해요",
    daily_limit: "오늘 참가할 수 있는 Tournament를 모두 사용했어요 (5/5)",
    subtitle: "Google 계정으로 1초 만에 시작해요.",
    dailyLimitSub: "한국 시간 자정에 새 Tournament 5개에 다시 참가할 수 있어요.",
    googleCta: "Google로 계속하기",
    signingIn: "로그인 중…",
    close: "닫기",
    signInFailed: "로그인에 실패했어요. 다시 시도해 주세요.",
  },
  en: {
    vote: "Sign in to keep voting",
    share: "Sign in to share your Crown Card",
    daily_limit: "You've joined all 5 Tournaments for today (5/5)",
    subtitle: "One tap with Google.",
    dailyLimitSub: "You can join 5 new Tournaments again at Seoul midnight.",
    googleCta: "Continue with Google",
    signingIn: "Signing in…",
    close: "Close",
    signInFailed: "Sign in failed. Please try again.",
  },
  es: {
    vote: "Inicia sesión para seguir votando",
    share: "Inicia sesión para compartir tu Crown Card",
    daily_limit: "Ya has participado en los 5 Tournaments de hoy (5/5)",
    subtitle: "Un toque con Google.",
    dailyLimitSub:
      "Puedes participar en 5 Tournaments nuevos otra vez a medianoche de Seúl.",
    googleCta: "Continuar con Google",
    signingIn: "Iniciando sesión…",
    close: "Cerrar",
    signInFailed: "Error al iniciar sesión. Inténtalo de nuevo.",
  },
};

function strings(lang: Lang): ModalStrings {
  return STRINGS[lang] ?? STRINGS.en;
}
