/**
 * AdminAuthGuard — operator-only gate for /admin/lab (Domain 2 · The Lab).
 *
 * MVP1 is operator-only (handoff §9 trap #1): Voters must never reach this
 * subtree. The decision is the unit-tested `adminGateState`; this component is
 * the thin switch over its four states.
 *
 *   loading       → quiet dark spinner (don't flash content to a Voter)
 *   needs-signin  → dark Google sign-in panel (self-contained so D-1's
 *                   light LoginModal stays untouched; reuses authStore)
 *   forbidden     → redirect home (App Router SSR can't see the Firebase
 *                   user, so this is the client-side block — trap #13)
 *   allowed       → render children
 *
 * ADMIN_UID comes from process.env.NEXT_PUBLIC_ADMIN_UID (NOT Vite's
 * import.meta — handoff §9 trap #2). If unset, adminGateState fails closed and
 * nobody is admin.
 *
 * LAB-UX-1: 문구는 전부 메시지 카탈로그(`lab.gate.*`)에서 온다. 운영 화면도
 * 토글 대상이라는 대표 결정(2026-08-23) — 번역 정당성을 우리 화면부터 시험한다.
 */

"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/authStore";
import { showToast } from "@/lib/toast";
import { adminGateState } from "@/lib/lab/adminGate";
import { useT } from "@/lib/i18n/useT";

const ADMIN_UID = process.env.NEXT_PUBLIC_ADMIN_UID;

const shell: React.CSSProperties = {
  minHeight: "100vh",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "var(--color-bg-default)",
  color: "var(--color-white)",
  fontFamily: "Inter, system-ui, sans-serif",
  padding: 24,
  textAlign: "center",
};

export function AdminAuthGuard({ children }: { children: ReactNode }): JSX.Element {
  const { t } = useT();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const loading = useAuthStore((s) => s.loading);
  const signInWithGoogle = useAuthStore((s) => s.signInWithGoogle);
  const [busy, setBusy] = useState(false);

  const state = adminGateState({
    loading,
    uid: user?.uid,
    isAnonymous: !!user?.isAnonymous,
    adminUid: ADMIN_UID,
  });

  useEffect(() => {
    if (state === "forbidden") router.replace("/");
  }, [state, router]);

  if (state === "allowed") return <>{children}</>;

  async function handleSignIn() {
    if (busy) return;
    setBusy(true);
    try {
      await signInWithGoogle();
    } catch {
      showToast(t("lab.gate.signInFailed"), "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main style={shell}>
      {state === "loading" && <div role="status">{t("lab.gate.loading")}</div>}

      {state === "forbidden" && (
        <div role="status">{t("lab.gate.forbidden")}</div>
      )}

      {state === "needs-signin" && (
        <div style={{ maxWidth: 360 }}>
          <p
            style={{
              margin: 0,
              fontSize: 11,
              letterSpacing: "0.08em",
              color: "var(--color-gold)",
              fontWeight: 700,
            }}
          >
            {t("lab.gate.roleTag")}
          </p>
          <h1 style={{ margin: "8px 0 20px", fontSize: 22, fontWeight: 800 }}>
            {t("lab.gate.signInTitle")}
          </h1>
          <button
            type="button"
            onClick={handleSignIn}
            disabled={busy}
            style={{
              width: "100%",
              padding: "12px 16px",
              borderRadius: 12,
              border: "2px solid var(--color-gold)",
              background: "rgba(252,208,6,0.12)",
              color: "var(--color-gold)",
              fontWeight: 700,
              fontSize: 14,
              cursor: busy ? "wait" : "pointer",
            }}
          >
            {busy ? t("lab.gate.signingIn") : t("lab.gate.signIn")}
          </button>
        </div>
      )}
    </main>
  );
}
