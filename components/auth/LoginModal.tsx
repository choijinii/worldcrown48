/**
 * LoginModal — 팬이 게이트에 걸렸을 때 뜨는 로그인 안내.
 *
 * 네 가지 이유:
 *   - "vote"        → 계속하려면 로그인 + Google 버튼
 *   - "share"       → Crown Card **저장(다운로드)**에 로그인이 필요할 때 + Google 버튼
 *                     (v2.1: **공유는 게스트에게 열려 있다** — 잠긴 것은 저장뿐이다)
 *   - "guest_limit" → 게스트가 오늘 3판을 다 썼다 + Google 버튼 (v2.1의 주 전환 지점)
 *   - "daily_limit" → 로그인 팬이 이 Tournament의 하루 5판을 다 썼다 + 닫기만
 *
 * `daily_limit` 만 Google 버튼을 숨긴다 — 이미 로그인 상태라 버튼이 할 일이 없다. 나머지
 * 셋은 실제로 갈 길이 있어 버튼을 노출한다 (차단 문구 원칙, 2026-09-05 대표 확정:
 * 막고 나서 길을 열어준다. "할 수 없다"는 이미 비활성 버튼이 눈으로 말한다).
 *
 * ⚠️ 참가 규칙은 **일일 판 한도**다 (LANGUAGE.md §2 · v2.0 2026-09-03 · v2.1 2026-09-06):
 *   · 로그인 = 계정당·**대회당** 하루 5판 (대회마다 각각 5판)
 *   · 게스트 = 하루 **통틀어** 3판 (대회 자유, 대회 수가 늘어도 3판 고정)
 * HF-1의 "5 NEW Tournaments / KST day"(Daily Participation Limit)는 **폐기된 정의**이며
 * LANGUAGE.md §7 금지어다. 이 주석이 옛 규칙으로 남아 있으면 다음 사람이 그걸 읽고
 * 되돌린다 — Stale-Doc Guard는 코드 주석에도 적용된다.
 *
 * Success path (popup): signInWithGoogle resolves → onSuccess?.() fires →
 * onClose() collapses the modal so the caller (Arena) can retry the
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
import { useEscapeClose } from "@/lib/ui/dismiss";

export type LoginReason = "vote" | "share" | "daily_limit" | "guest_limit";

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

  // Escape 닫기는 useEscapeClose가 갖는다. `busy`를 그대로 가드로 넘길 수 있다 —
  // 평범한 effect라 매 렌더의 최신 값을 읽는다(예전의 busyRef 미러가 필요 없어졌다).

  // 훅은 조기 return **앞**에 있어야 한다 — 호출 순서가 렌더마다 같아야 하므로.
  // busy 중에는 듣지 않는다: 진행 중인 작업을 Escape로 끊지 않기 위해서다.
  useEscapeClose(onClose, !busy);

  if (!isOpen) return null;

  const t = strings(lang);
  const showGoogleButton = reason !== "daily_limit";

  async function handleSignIn() {
    if (busy) return;
    setBusy(true);
    try {
      // 계측 소킥 A: reason을 trigger_point 버킷으로 매핑해 guest_signin_convert가
      // "어느 화면에서 로그인했는지" 알 수 있게 한다.
      // EVENT_SPEC v1.2 (2026-09-08): v2.1에서 회원 전환의 주 지점이 "공유 잠금"에서
      // "3판 소진"으로 옮겨갔다.
      // "share"       → Crown Card의 **저장 잠금** 배너 → "card_modal" (이름 유지, 의미 변경)
      // "guest_limit" → 게스트 3판 소진 모달 → "guest_limit" (신설, v2.1의 주 전환 지점)
      // "daily_limit" → 로그인 팬의 일일 한도 → "quota_limit" (버튼이 숨겨져 실제론 거의 0)
      // "vote"        → 전용 버킷 없음 → "other"
      const triggerPoint =
        reason === "share"
          ? "card_modal"
          : reason === "guest_limit"
            ? "guest_limit"
            : reason === "daily_limit"
              ? "quota_limit"
              : "other";
      await signInWithGoogle(triggerPoint);
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
          escapeDeactivates: false,
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
          <p
            style={{
              margin: "8px 0 24px",
              fontSize: 13,
              color: "var(--color-text-sub-light)",
              lineHeight: 1.5,
            }}
          >
            {reason === "daily_limit"
              ? t.dailyLimitSub
              : reason === "guest_limit"
                ? t.guestLimitSub
                : t.subtitle}
          </p>

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
  guest_limit: string;
  subtitle: string;
  dailyLimitSub: string;
  guestLimitSub: string;
  googleCta: string;
  signingIn: string;
  close: string;
  signInFailed: string;
}

// ko/en/es — es is first-class here (LANGUAGE.md: Tournament stays verbatim in
// every language). daily_limit·guest_limit 문구 = RUN-1 §8 대표 승인 최종본(2026-09-07),
// share 문구 = 저장 잠금 승인본(2026-09-09). 한 글자도 임의 변경 금지 (§5 DO 7) —
// lib/__tests__/crown/lockCopy.test.ts 와 messagesContent.test.ts 가 글자 단위로 고정한다.
const STRINGS: Record<Lang, ModalStrings> = {
  ko: {
    vote: "계속하려면 로그인이 필요해요",
    share: "저장하려면 로그인이 필요해요",
    daily_limit: "이 Tournament는 오늘 5번 참여를 모두 하셨어요 (5/5)",
    guest_limit: "오늘의 서비스(3번 참여)를 모두 소진하셨어요.",
    subtitle: "Google 계정으로 1초 만에 시작해요.",
    dailyLimitSub:
      "한국 시간 자정에 참여 횟수가 다시 채워져요. 다른 Tournament는 지금 바로 참여하실 수 있어요.",
    guestLimitSub: "로그인하면 Tournament마다 하루 5번까지 참여 — 내 선택이 랭킹에 반영돼요.",
    googleCta: "Google로 계속하기",
    signingIn: "로그인 중…",
    close: "닫기",
    signInFailed: "로그인에 실패했어요. 다시 시도해 주세요.",
  },
  en: {
    vote: "Sign in to keep voting",
    share: "Sign in to save your Crown Card",
    daily_limit: "You've played all 5 runs of this Tournament today (5/5)",
    guest_limit: "You've used all 3 of today's free entries.",
    subtitle: "One tap with Google.",
    dailyLimitSub:
      "Your 5 runs reset at Seoul midnight. Other Tournaments are open right now.",
    guestLimitSub:
      "Sign in for up to 5 entries a day in every Tournament — and your picks count in the Ranking.",
    googleCta: "Continue with Google",
    signingIn: "Signing in…",
    close: "Close",
    signInFailed: "Sign in failed. Please try again.",
  },
  es: {
    vote: "Inicia sesión para seguir votando",
    share: "Inicia sesión para guardar tu Crown Card",
    daily_limit: "Ya has jugado las 5 partidas de este Tournament hoy (5/5)",
    guest_limit: "Has usado tus 3 participaciones gratis de hoy.",
    subtitle: "Un toque con Google.",
    dailyLimitSub:
      "Tus 5 partidas se reinician a medianoche de Seúl. Otros Tournaments están abiertos ahora.",
    guestLimitSub:
      "Inicia sesión: hasta 5 participaciones al día en cada Tournament — y tus elecciones cuentan en el Ranking.",
    googleCta: "Continuar con Google",
    signingIn: "Iniciando sesión…",
    close: "Cerrar",
    signInFailed: "Error al iniciar sesión. Inténtalo de nuevo.",
  },
};

function strings(lang: Lang): ModalStrings {
  return STRINGS[lang] ?? STRINGS.en;
}
