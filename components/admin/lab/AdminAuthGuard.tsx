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
 */

"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/authStore";
import { showToast } from "@/lib/toast";
import { adminGateState } from "@/lib/lab/adminGate";

const ADMIN_UID = process.env.NEXT_PUBLIC_ADMIN_UID;

const shell: React.CSSProperties = {
  minHeight: "100vh",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "#0E0944",
  color: "#FFFFFF",
  fontFamily: "Inter, system-ui, sans-serif",
  padding: 24,
  textAlign: "center",
};

export function AdminAuthGuard({ children }: { children: ReactNode }): JSX.Element {
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
      showToast("로그인에 실패했어요. 다시 시도해 주세요.", "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main style={shell}>
      {state === "loading" && <div role="status">확인 중…</div>}

      {state === "forbidden" && (
        <div role="status">권한이 없습니다. 홈으로 이동합니다…</div>
      )}

      {state === "needs-signin" && (
        <div style={{ maxWidth: 360 }}>
          <p
            style={{
              margin: 0,
              fontSize: 11,
              letterSpacing: "0.08em",
              color: "#FCD006",
              fontWeight: 700,
            }}
          >
            THE LAB · 운영자 전용
          </p>
          <h1 style={{ margin: "8px 0 20px", fontSize: 22, fontWeight: 800 }}>
            운영자 계정으로 로그인하세요
          </h1>
          <button
            type="button"
            onClick={handleSignIn}
            disabled={busy}
            style={{
              width: "100%",
              padding: "12px 16px",
              borderRadius: 12,
              border: "2px solid #FCD006",
              background: "rgba(252,208,6,0.12)",
              color: "#FCD006",
              fontWeight: 700,
              fontSize: 14,
              cursor: busy ? "wait" : "pointer",
            }}
          >
            {busy ? "로그인 중…" : "Google로 계속하기"}
          </button>
        </div>
      )}
    </main>
  );
}
