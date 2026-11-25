/**
 * BetaGate — /beta 의 로그인 자리 (BETA-PASS-1 · 지시서 §3).
 *
 * ① 로그인 전: [구글로 로그인하고 시작하기](카카오톡 안이면 위에 안내 상자 ③)
 * 로그인되면(이미 로그인된 채 다시 와도) 곧바로 betaPass 콜러블로 명단을 확인한다.
 * ② 명단 안 → 통과증을 쿠키 wc48_beta 로 심고 [월크48 들어가기](→ / · 페이지 이동이라 middleware 가 쿠키를 본다)
 * ④ 명단 밖 → 쿠키 없음 · [다른 계정으로 로그인](로그아웃 후 ①)
 * ⑤ 오류 → [다시 시도]
 *
 * 익명 계정은 만들지 않는다(원장 D-41) — 구글 로그인만(signInWithGoogle("beta")).
 */
"use client";

import { useCallback, useEffect, useState } from "react";
import { httpsCallable } from "firebase/functions";
import { getFunctionsInstance } from "@/lib/firebase";
import { useAuthStore } from "@/lib/authStore";
import { betaCookieString, isKakaoTalkUA } from "@/lib/launch/betaPass";
import { BETA_COPY, betaCheckResultFromError, betaView, type BetaCheck } from "@/lib/beta/betaState";
import s from "@/app/beta/beta.module.css";

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" className={s.googleIcon} aria-hidden="true">
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        d="M21 12.2c0-.7-.1-1.3-.2-1.9H12v3.6h5.1a4.4 4.4 0 0 1-1.9 2.9v2.4h3.1c1.8-1.7 2.7-4.1 2.7-7zM12 21c2.6 0 4.7-.9 6.3-2.3l-3.1-2.4c-.9.6-2 .9-3.2.9-2.5 0-4.6-1.7-5.3-3.9H3.5v2.5A9.5 9.5 0 0 0 12 21z"
      />
    </svg>
  );
}

export function BetaGate() {
  const user = useAuthStore((st) => st.user);
  const authLoading = useAuthStore((st) => st.loading);
  const signInWithGoogle = useAuthStore((st) => st.signInWithGoogle);
  const signOut = useAuthStore((st) => st.signOut);

  const [check, setCheck] = useState<BetaCheck>("idle");
  const [checkedUid, setCheckedUid] = useState<string | null>(null);
  const [kakao, setKakao] = useState(false);
  const [signingIn, setSigningIn] = useState(false);

  useEffect(() => {
    setKakao(isKakaoTalkUA(navigator.userAgent));
  }, []);

  const runCheck = useCallback(async () => {
    setCheck("checking");
    try {
      const call = httpsCallable<void, { token: string; expMs: number }>(getFunctionsInstance(), "betaPass");
      const { data } = await call();
      document.cookie = betaCookieString(data.token, data.expMs, Date.now(), window.location.protocol === "https:");
      setCheck("allowed");
    } catch (err) {
      setCheck(betaCheckResultFromError(err));
    }
  }, []);

  // 로그인된 계정이 바뀔 때마다(처음 로그인 · 다시 방문 · 다른 계정) 한 번 확인한다.
  const uid = user && !user.isAnonymous ? user.uid : null;
  useEffect(() => {
    if (authLoading || uid === checkedUid) return;
    setCheckedUid(uid);
    if (uid) void runCheck();
    else setCheck("idle");
  }, [authLoading, uid, checkedUid, runCheck]);

  const view = betaView({ authLoading, user: user ? { isAnonymous: user.isAnonymous } : null, check });

  const onSignIn = async () => {
    setSigningIn(true);
    try {
      await signInWithGoogle("beta");
    } catch {
      // 창을 닫음 · 취소 — 로그인 전 상태 그대로 둔다.
    } finally {
      setSigningIn(false);
    }
  };

  const onOtherAccount = async () => {
    await signOut();
    setCheck("idle");
  };

  return (
    <div className={s.gate} data-testid="beta-gate" data-state={view} aria-live="polite">
      {view === "signed-out" && (
        <>
          {kakao && (
            <p className={s.kakao} data-testid="beta-kakao" role="note">
              {BETA_COPY.kakao}
            </p>
          )}
          <button type="button" className={s.primary} onClick={onSignIn} disabled={signingIn} data-testid="beta-signin">
            <GoogleMark />
            구글로 로그인하고 시작하기
          </button>
          <p className={s.note}>
            저희에게 알려 주신 <b className={s.strong}>바로 그 구글 계정</b>으로 로그인해 주세요. 다른 계정은 들어갈 수 없습니다.
          </p>
        </>
      )}

      {view === "checking" && (
        <button type="button" className={s.primary} disabled data-testid="beta-checking">
          <GoogleMark />
          구글로 로그인하고 시작하기
        </button>
      )}

      {view === "allowed" && (
        <>
          <p className={s.notice} data-testid="beta-allowed">
            {BETA_COPY.allowed}
          </p>
          <a href="/" className={s.primary} data-testid="beta-enter">
            월크48 들어가기
          </a>
        </>
      )}

      {view === "denied" && (
        <>
          <p className={s.notice} data-testid="beta-denied">
            {BETA_COPY.denied}
          </p>
          <button type="button" className={s.outline} onClick={onOtherAccount} data-testid="beta-other-account">
            다른 계정으로 로그인
          </button>
        </>
      )}

      {view === "error" && (
        <>
          <p className={s.notice} data-testid="beta-error">
            {BETA_COPY.error}
          </p>
          <button type="button" className={s.outline} onClick={() => void runCheck()} data-testid="beta-retry">
            다시 시도
          </button>
        </>
      )}
    </div>
  );
}
