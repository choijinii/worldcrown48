/**
 * AdminAuthGuardLight — operator-only gate for /admin (Domain 6, LIGHT theme).
 *
 * G-1 handoff §9 trap #1: B-1's AdminAuthGuard is DARK (background --color-bg-default).
 * Reusing it on the light dashboard would flash dark. So we reuse ONLY the
 * unit-tested pure decision `adminGateState` (lib/lab/adminGate) and render a
 * light-token gate here. Same four states, same fail-closed security.
 *
 *   loading       → quiet spinner (never flash dashboard to a Voter)
 *   needs-signin  → light Google sign-in card (anonymous = signed-out)
 *   forbidden     → redirect home (App Router SSR can't see Firebase Auth —
 *                   client-side block, handoff trap #13) + toast
 *   allowed       → render children (the dashboard)
 *
 * ADMIN_UID = process.env.NEXT_PUBLIC_ADMIN_UID (NOT import.meta — trap #2).
 * Unset → adminGateState fails closed → nobody is admin.
 */
"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/authStore";
import { showToast } from "@/lib/toast";
import { track } from "@/lib/analytics";
import { useI18n } from "@/lib/i18n";
import type { Lang } from "@/lib/cookieConsent";
import { adminGateState } from "@/lib/lab/adminGate";

const ADMIN_UID = process.env.NEXT_PUBLIC_ADMIN_UID;

function strings(lang: Lang) {
  const ko = {
    loading: "확인 중…",
    forbidden: "권한이 없습니다. 홈으로 이동합니다…",
    forbiddenToast: "권한이 없습니다.",
    signinEyebrow: "운영자 전용 · ADMIN ONLY",
    signinTitle: "운영자 계정으로 로그인하세요",
    signinDesc:
      "Admin Dashboard는 검증된 운영자만 접근할 수 있어요. 운영자 계정으로 로그인해 라이브 Tournament를 모니터링하세요.",
    signinBtn: "Google로 계속하기",
    signinBusy: "로그인 중…",
    signinFail: "로그인에 실패했어요. 다시 시도해 주세요.",
  };
  const en = {
    loading: "Checking…",
    forbidden: "Access denied. Returning home…",
    forbiddenToast: "You don't have permission to view this.",
    signinEyebrow: "ADMIN ONLY",
    signinTitle: "Sign in to continue",
    signinDesc:
      "The Admin Dashboard is restricted to verified operators. Sign in with your admin account to monitor live Tournaments.",
    signinBtn: "Continue with Google",
    signinBusy: "Signing in…",
    signinFail: "Sign-in failed. Please try again.",
  };
  return lang === "ko" ? ko : en;
}

export function AdminAuthGuardLight({
  children,
}: {
  children: ReactNode;
}): JSX.Element {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const loading = useAuthStore((s) => s.loading);
  const signInWithGoogle = useAuthStore((s) => s.signInWithGoogle);
  const { lang } = useI18n();
  const t = strings(lang);
  const [busy, setBusy] = useState(false);

  const state = adminGateState({
    loading,
    uid: user?.uid,
    isAnonymous: !!user?.isAnonymous,
    adminUid: ADMIN_UID,
  });

  // Analytics: one event per resolved gate state (handoff §8 admin_gate_state).
  const trackedRef = useRef<string | null>(null);
  useEffect(() => {
    if (state === "loading") return;
    if (trackedRef.current === state) return;
    trackedRef.current = state;
    void track("admin_gate_state", { state });
  }, [state]);

  useEffect(() => {
    if (state === "forbidden") {
      showToast(t.forbiddenToast, "error");
      router.replace("/");
    }
  }, [state, router, t.forbiddenToast]);

  if (state === "allowed") return <>{children}</>;

  async function handleSignIn() {
    if (busy) return;
    setBusy(true);
    try {
      await signInWithGoogle();
    } catch {
      showToast(t.signinFail, "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="gate-shell">
      <div className="gate-card" data-st={state} role="status" aria-live="polite">
        {state === "loading" && (
          <>
            <div className="gate-spinner" aria-hidden="true" />
            <p className="gate-desc">{t.loading}</p>
          </>
        )}

        {state === "forbidden" && (
          <>
            <div className="gate-ico" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="9" />
                <path d="M5 5l14 14" />
              </svg>
            </div>
            <p className="gate-desc">{t.forbidden}</p>
          </>
        )}

        {state === "needs-signin" && (
          <>
            <div className="gate-ico" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect x="4" y="10" width="16" height="11" rx="2" />
                <path d="M8 10V7a4 4 0 1 1 8 0v3" />
              </svg>
            </div>
            <div className="gate-eyebrow">{t.signinEyebrow}</div>
            <h1 className="gate-title">{t.signinTitle}</h1>
            <p className="gate-desc">{t.signinDesc}</p>
            <div className="gate-actions">
              <button
                type="button"
                className="gate-btn"
                onClick={handleSignIn}
                disabled={busy}
                aria-busy={busy}
              >
                {busy ? t.signinBusy : t.signinBtn}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
