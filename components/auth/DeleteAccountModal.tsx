/**
 * DeleteAccountModal — GDPR Article 17 "right to erasure" UI.
 *
 * Flow (handoff §부록 A and §4-3):
 *   1. Warning box + 4-item delete list + 2-item preservation list.
 *   2. Type "DELETE" (uppercase, no whitespace) — case-sensitive exact match.
 *      The red CTA only enables on exact match (acceptance §4-3 #4).
 *   3. Click → onUserDelete callable → wait → success: signOut + redirect /
 *      + receipt toast. Failure: error toast pointing at policy@.
 *
 * The "DELETE" string is intentionally English in every locale (handoff
 * §9 trap 12 — universal anti-fat-finger).
 *
 * Focus + keyboard:
 *   - focus-trap-react locks Tab inside the modal until close.
 *   - Initial focus lands on the cancel button so a stray Enter doesn't
 *     accidentally fire the destructive action (the cancel button is also
 *     the default-action key path).
 */

"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import FocusTrap from "focus-trap-react";
import { httpsCallable } from "firebase/functions";
import {
  getFunctionsInstance,
} from "@/lib/firebase";
import { useAuthStore } from "@/lib/authStore";
import { useI18n } from "@/lib/i18n";
import type { Lang } from "@/lib/cookieConsent";
import { showToast } from "@/lib/toast";
import { useEscapeClose } from "@/lib/ui/dismiss";

const CONFIRM_KEYWORD = "DELETE";
const DELETE_TIMEOUT_MS = 30_000;
// Handoff §4-3 P3 — hide the spinner for fast responses, only show it
// once the callable has been in-flight long enough to feel slow.
const SPINNER_DELAY_MS = 500;
const GDPR_TOAST_DURATION_MS = 7_000;

interface DeleteAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function DeleteAccountModal({
  isOpen,
  onClose,
}: DeleteAccountModalProps): JSX.Element | null {
  const router = useRouter();
  const signOut = useAuthStore((s) => s.signOut);
  const { lang } = useI18n();
  const [confirmInput, setConfirmInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [showSpinner, setShowSpinner] = useState(false);
  const [mounted, setMounted] = useState(false);
  const spinnerTimerRef = useRef<number | null>(null);

  // Escape 닫기는 useEscapeClose가 갖는다. 삭제 요청이 도는 중에는 `busy`가 true라
  // 듣지 않는다 — 예전 busyRef 미러와 같은 보호를, 얼어붙을 여지 없이.

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    return () => {
      if (spinnerTimerRef.current !== null) {
        window.clearTimeout(spinnerTimerRef.current);
      }
    };
  }, []);

  // 훅은 조기 return **앞**에 있어야 한다 — 호출 순서가 렌더마다 같아야 하므로.
  // busy 중에는 듣지 않는다: 진행 중인 작업을 Escape로 끊지 않기 위해서다.
  useEscapeClose(onClose, !busy);

  if (!isOpen || !mounted || typeof document === "undefined") return null;

  const canDelete = confirmInput === CONFIRM_KEYWORD && !busy;

  async function handleDelete() {
    if (!canDelete) return;
    setBusy(true);
    spinnerTimerRef.current = window.setTimeout(() => {
      setShowSpinner(true);
    }, SPINNER_DELAY_MS);
    try {
      const callable = httpsCallable<unknown, { ok: boolean }>(
        getFunctionsInstance(),
        "onUserDelete",
        { timeout: DELETE_TIMEOUT_MS },
      );
      await callable({});
      // Success — sign out locally too so the next page-load sees a clean
      // state, then send the user home.
      await signOut();
      showToast(
        lang === "ko"
          ? "요청이 접수됐어요. 처리에 최대 30일 걸릴 수 있어요."
          : "Request received. Processing may take up to 30 days.",
        "success",
        { durationMs: GDPR_TOAST_DURATION_MS },
      );
      onClose();
      router.replace("/");
    } catch (err) {
      if (process.env.NODE_ENV !== "production") {
        console.warn("[DeleteAccount] onUserDelete failed:", err);
      }
      showToast(
        lang === "ko"
          ? "삭제 중 오류가 발생했어요. policy@worldcrown48.com 으로 문의해 주세요."
          : "Deletion error. Please contact policy@worldcrown48.com.",
        "error",
      );
      setBusy(false);
      setShowSpinner(false);
    } finally {
      if (spinnerTimerRef.current !== null) {
        window.clearTimeout(spinnerTimerRef.current);
        spinnerTimerRef.current = null;
      }
    }
  }

  const t = strings(lang);

  // Handoff §3 — mount via portal at document.body so the modal sits in
  // the same DOM position regardless of which page or component opened it
  // (dropdown vs /account button). Otherwise a transformed ancestor can
  // shift `position: fixed` (trap 16) and the two entry points disagree.
  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-account-title"
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
        focusTrapOptions={{ initialFocus: "#delete-cancel", escapeDeactivates: false }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: 480,
            background: "var(--color-surface-light)",
            borderRadius: 20,
            padding: 24,
            boxShadow: "0 24px 60px rgba(14,9,68,0.22)",
            fontFamily: "Inter, system-ui, sans-serif",
            color: "var(--color-text-light)",
          }}
        >
          {/* Header */}
          <div style={{ marginBottom: 16 }}>
            <h2
              id="delete-account-title"
              style={{ margin: 0, fontSize: 22, fontWeight: 700 }}
            >
              {t.titleKo}
            </h2>
            <div style={{ fontSize: 13, color: "var(--color-text-sub-light)", marginTop: 4 }}>
              {t.titleEn}
            </div>
          </div>

          {/* Warning box */}
          <div
            style={{
              padding: "12px 14px",
              borderRadius: 12,
              background: "rgba(215,6,58,0.08)",
              border: "1px solid rgba(215,6,58,0.24)",
              marginBottom: 16,
            }}
          >
            <div style={{ fontWeight: 600, color: "var(--color-crimson)", fontSize: 14 }}>
              {t.warningHead}
            </div>
            <div style={{ fontSize: 13, color: "var(--color-text-sub-light)", marginTop: 4 }}>
              {t.warningSub}
            </div>
          </div>

          {/* Delete items */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text-sub-light)", marginBottom: 6 }}>
              {t.deleteListLabel}
            </div>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, fontSize: 13, lineHeight: 1.6 }}>
              {t.deleteItems.map((item) => (
                <li key={item}>✓ {item}</li>
              ))}
            </ul>
          </div>

          {/* Preserved items */}
          <div
            style={{
              padding: "10px 12px",
              borderRadius: 10,
              background: "var(--color-bg-light)",
              marginBottom: 16,
            }}
          >
            <div style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text-sub-light)", marginBottom: 6 }}>
              {t.preserveListLabel}
            </div>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, fontSize: 12, color: "var(--color-text-sub-light)", lineHeight: 1.6 }}>
              {t.preserveItems.map((item) => (
                <li key={item}>• {item}</li>
              ))}
            </ul>
          </div>

          {/* Confirm input */}
          <label
            htmlFor="delete-confirm-input"
            style={{ display: "block", fontSize: 13, marginBottom: 6, color: "var(--color-text-sub-light)" }}
          >
            {t.inputPrompt}
          </label>
          <input
            id="delete-confirm-input"
            type="text"
            autoComplete="off"
            spellCheck={false}
            value={confirmInput}
            onChange={(e) => setConfirmInput(e.target.value)}
            placeholder={CONFIRM_KEYWORD}
            disabled={busy}
            style={{
              width: "100%",
              boxSizing: "border-box",
              padding: "10px 12px",
              borderRadius: 8,
              border: "1px solid var(--color-border-light)",
              fontFamily: "JetBrains Mono, monospace",
              fontSize: 14,
              marginBottom: 20,
            }}
          />

          {/* Actions */}
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button
              id="delete-cancel"
              type="button"
              onClick={onClose}
              disabled={busy}
              style={{
                padding: "10px 18px",
                borderRadius: 10,
                border: "1px solid var(--color-border-light)",
                background: "transparent",
                color: "var(--color-text-light)",
                fontFamily: "Inter, system-ui, sans-serif",
                fontWeight: 600,
                fontSize: 13,
                cursor: busy ? "wait" : "pointer",
              }}
            >
              {t.cancel}
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={!canDelete}
              style={{
                padding: "10px 18px",
                borderRadius: 10,
                border: "none",
                background: canDelete ? "var(--color-crimson)" : "rgba(215,6,58,0.4)",
                color: "var(--color-white)",
                fontFamily: "Inter, system-ui, sans-serif",
                fontWeight: 700,
                fontSize: 13,
                cursor: canDelete ? "pointer" : "not-allowed",
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              {showSpinner ? (
                <span
                  aria-hidden="true"
                  data-testid="delete-spinner"
                  style={{
                    width: 14,
                    height: 14,
                    borderRadius: "50%",
                    border: "2px solid rgba(255,255,255,0.4)",
                    borderTopColor: "var(--color-white)",
                    animation: "wc-spin 0.7s linear infinite",
                  }}
                />
              ) : null}
              {showSpinner ? t.deleting : t.confirm}
            </button>
          </div>
        </div>
      </FocusTrap>
    </div>,
    document.body,
  );
}

function strings(lang: Lang) {
  if (lang === "ko") {
    return {
      titleKo: "내 데이터 삭제 요청",
      titleEn: "Delete my data",
      warningHead: "이 작업은 되돌릴 수 없어요.",
      warningSub: "확인 후 30일 이내 다음 항목이 영구 삭제돼요.",
      deleteListLabel: "삭제 항목",
      deleteItems: [
        "계정 정보 (Google 연결 끊김, 표시 이름·이메일·프로필 이미지)",
        "투표 기록 (지금까지 한 모든 Match 투표)",
        "쿠키 동의 기록",
        "환경설정 (언어·테마 등)",
      ],
      preserveListLabel: "보존되는 항목",
      preserveItems: [
        "익명 집계 통계 (개인식별 불가)",
        "법적 감사 로그 (3년 보관 · uidHash만 — GDPR Art. 30 의무)",
      ],
      inputPrompt: "확인을 위해 다음 문자를 입력해 주세요: DELETE",
      cancel: "취소",
      confirm: "데이터 삭제 요청",
      deleting: "삭제 요청 중…",
    };
  }
  return {
    titleKo: "Delete my data",
    titleEn: "Permanently delete your WorldCrown48 account",
    warningHead: "This action cannot be undone.",
    warningSub: "The items below will be permanently deleted within 30 days.",
    deleteListLabel: "Items to be deleted",
    deleteItems: [
      "Account info (Google link, display name, email, avatar)",
      "Vote history (every Match vote you've cast)",
      "Cookie consent record",
      "Preferences (language, theme, etc.)",
    ],
    preserveListLabel: "Items preserved",
    preserveItems: [
      "Anonymous aggregate stats (non-identifying)",
      "Legal audit log (3 years · uidHash only — GDPR Art. 30)",
    ],
    inputPrompt: "Type DELETE to confirm:",
    cancel: "Cancel",
    confirm: "Delete my data",
    deleting: "Requesting deletion…",
  };
}
