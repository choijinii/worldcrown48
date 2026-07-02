/**
 * /account — minimal account settings page.
 *
 * Scope (handoff §3-3): displayName, email, sign-up date, and the
 * "Delete my data" entry point. Future Locker Room features (vote history,
 * preferences, sharing) land in their own routes — this page exists so the
 * UserDropdown has a destination and the GDPR delete flow has a permanent
 * URL the user can return to.
 *
 * Anonymous + signed-out guard (handoff §9 trap 6): App Router SSR can't
 * see the Firebase user; we replace('/') on the client once auth has
 * settled. Show a quiet loading state in the meantime so we don't flash
 * the account fields to an unauthenticated visitor.
 */

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/authStore";
import { useI18n } from "@/lib/i18n";
import type { Lang } from "@/lib/cookieConsent";
import { DeleteAccountModal } from "@/components/auth/DeleteAccountModal";

const dateKstFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Seoul",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function formatSignUpDate(iso: string | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return dateKstFormatter.format(d);
}

export default function AccountPage(): JSX.Element {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const loading = useAuthStore((s) => s.loading);
  const { lang } = useI18n();
  const [deleteOpen, setDeleteOpen] = useState(false);

  const signedIn = !!(user && !user.isAnonymous);

  useEffect(() => {
    if (!loading && !signedIn) {
      router.replace("/");
    }
  }, [loading, signedIn, router]);

  if (loading || !signedIn || !user) {
    return (
      <main
        style={{
          maxWidth: 640,
          margin: "0 auto",
          padding: "64px 24px",
          fontFamily: "Inter, system-ui, sans-serif",
          color: "var(--color-text-sub-light, #3A4570)",
        }}
      >
        <div role="status">{lang === "ko" ? "확인 중…" : "Loading…"}</div>
      </main>
    );
  }

  const t = strings(lang);

  return (
    <main
      style={{
        maxWidth: 640,
        margin: "0 auto",
        padding: "64px 24px",
        fontFamily: "Inter, system-ui, sans-serif",
        color: "var(--color-text-light, #0E0944)",
      }}
    >
      <h1 style={{ margin: 0, fontSize: 28, fontWeight: 800 }}>
        {t.title}
      </h1>
      <p
        style={{
          margin: "8px 0 32px",
          color: "var(--color-text-sub-light, #3A4570)",
          fontSize: 14,
        }}
      >
        {t.subtitle}
      </p>

      <section
        style={{
          background: "#FFFFFF",
          border: "1px solid var(--color-border-light, #D4DCE3)",
          borderRadius: 16,
          padding: 24,
          marginBottom: 24,
        }}
      >
        <Row label={t.displayName} value={user.displayName ?? "—"} />
        <Row label={t.email} value={user.email ?? "—"} />
        <Row
          label={t.joinedAt}
          value={formatSignUpDate(user.metadata.creationTime)}
        />
      </section>

      <section
        style={{
          background: "#FFFFFF",
          border: "1px solid var(--color-border-light, #D4DCE3)",
          borderRadius: 16,
          padding: 24,
        }}
      >
        <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>
          {t.dangerZone}
        </h2>
        <p
          style={{
            margin: "6px 0 16px",
            color: "var(--color-text-sub-light, #3A4570)",
            fontSize: 13,
          }}
        >
          {t.dangerCopy}
        </p>
        <button
          type="button"
          onClick={() => setDeleteOpen(true)}
          style={{
            padding: "10px 16px",
            borderRadius: 10,
            border: "1px solid #D7063A",
            background: "transparent",
            color: "#D7063A",
            fontFamily: "Inter, system-ui, sans-serif",
            fontWeight: 600,
            fontSize: 13,
            cursor: "pointer",
          }}
        >
          {t.deleteCta}
        </button>
      </section>

      <DeleteAccountModal
        isOpen={deleteOpen}
        onClose={() => setDeleteOpen(false)}
      />
    </main>
  );
}

function Row({ label, value }: { label: string; value: string }): JSX.Element {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "baseline",
        gap: 12,
        padding: "10px 0",
        borderBottom: "1px solid var(--color-border-soft, #E6EAF0)",
      }}
    >
      <div style={{ fontSize: 13, color: "var(--color-text-sub-light, #3A4570)" }}>
        {label}
      </div>
      <div
        style={{
          fontSize: 14,
          fontWeight: 500,
          textAlign: "right",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          maxWidth: 360,
        }}
      >
        {value}
      </div>
    </div>
  );
}

function strings(lang: Lang) {
  if (lang === "ko") {
    return {
      title: "계정 설정",
      subtitle: "기본 정보와 데이터 관리 옵션.",
      displayName: "표시 이름",
      email: "이메일",
      joinedAt: "가입일 (KST)",
      dangerZone: "데이터 삭제",
      dangerCopy:
        "계정과 투표 기록·환경설정을 영구 삭제합니다. 익명 집계 통계와 법적 감사 로그는 보존됩니다.",
      deleteCta: "내 데이터 삭제 요청",
    };
  }
  return {
    title: "Account Settings",
    subtitle: "Basic profile and data controls.",
    displayName: "Display name",
    email: "Email",
    joinedAt: "Joined (KST)",
    dangerZone: "Delete your data",
    dangerCopy:
      "Permanently deletes your account, vote history, and preferences. Anonymous aggregate stats and the legal audit log are preserved.",
    deleteCta: "Delete my data",
  };
}
