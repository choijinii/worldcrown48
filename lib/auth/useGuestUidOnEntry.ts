/**
 * useGuestUidOnEntry — 아레나·크라운 카드 페이지에 들어올 때 익명 계정을 준비한다 (ANON-1).
 *
 * 왜 필요한가: 2026-10-04 전까지는 사이트 전체를 감싸는 쿠키 동의 부품이 **모든 페이지에서**
 * 익명 계정을 만들었고, 아레나는 그 계정에 기대어 비로그인 참여(게스트 하루 3판)를 처리했다.
 * 쿠키 동의 부품이 더는 계정을 만들지 않으므로(제안 1), 계정이 실제로 필요한 두 곳에서
 * 직접 만든다. 게스트 규칙(v2.1 · 하루 통틀어 3판 · `guest_runs/{uid}`)은 바뀌지 않는다 —
 * 계정이 생기는 **자리**만 "아무 페이지"에서 "아레나·카드 입장"으로 좁아진다.
 *
 * 돌려주는 값: 준비가 끝나기 전이면 true. 아레나 화면은 이 동안을 "불러오는 중"으로 보여
 * 준다 — 사용자가 아직 없다고 "불러오지 못함"이 깜빡이지 않게.
 *
 * 이미 로그인했거나 예전에 만든 익명 계정이 있으면 `ensureAnonymousUid()` 는 새로 만들지
 * 않고 그 사용자를 돌려준다.
 */
"use client";

import { useEffect, useState } from "react";
import { ensureAnonymousUid } from "@/lib/firebase";

export function useGuestUidOnEntry(): boolean {
  const [pending, setPending] = useState(true);
  useEffect(() => {
    let cancelled = false;
    ensureAnonymousUid()
      .catch((err) => {
        if (process.env.NODE_ENV !== "production") {
          console.warn("[Auth] guest uid on entry failed:", err);
        }
      })
      .finally(() => {
        if (!cancelled) setPending(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);
  return pending;
}
