/**
 * CurtainPreviewCookie — 관리자 미리보기 쿠키 심기 · 지우기 (CURTAIN-1 · 지시서 §2-4).
 *
 * 런칭 전 커튼은 middleware 가 걸고, middleware 는 Firebase 로그인을 볼 수 없다. 그래서 로그인
 * 상태를 아는 이 부품이 관리자로 확인되면 `wc48_preview=1` 을 심는다. 지우는 것은 관리자였다가
 * 아니게 된 순간(로그아웃 · 계정 바꿈)뿐이다 — 판정은 lib/launch/curtain.ts previewCookieAction.
 * 그리지 않는다.
 */
"use client";

import { useEffect, useRef } from "react";
import { useAuthStore } from "@/lib/authStore";
import { isAdmin } from "@/lib/lab/isAdmin";
import { previewCookieAction, previewCookieString } from "@/lib/launch/curtain";

export function CurtainPreviewCookie(): null {
  const user = useAuthStore((s) => s.user);
  const loading = useAuthStore((s) => s.loading);
  const prevAdmin = useRef<boolean | null>(null);

  useEffect(() => {
    if (loading) return;
    const admin = Boolean(
      user && !user.isAnonymous && isAdmin(user.uid, process.env.NEXT_PUBLIC_ADMIN_UID),
    );
    const action = previewCookieAction(prevAdmin.current, admin);
    prevAdmin.current = admin;
    if (action === "none") return;
    document.cookie = previewCookieString(action, window.location.protocol === "https:");
  }, [user, loading]);

  return null;
}
