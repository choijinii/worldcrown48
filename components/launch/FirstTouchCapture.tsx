"use client";

/**
 * FirstTouchCapture — 처음 들어온 경로(UTM) 잡기 (PRE-REG-1 · 원장 D-53).
 *
 * 루트 레이아웃에 한 번 놓인다 — 사이트 어느 페이지로 들어오든 주소의 utm_* 를 읽는다. 사이트 안에서
 * 페이지를 옮길 때마다 다시 보지만, 이 방문의 처음 값은 덮지 않는다(lib/launch/firstTouch).
 * 브라우저에 7일 기억하는 것은 분석 동의가 있을 때만 — 동의 여부는 COOKIE-1 의 useAnalyticsConsent()
 * 그대로 읽는다. 동의를 거두면 기억한 값을 지운다. 화면에 아무것도 그리지 않는다.
 */
import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useAnalyticsConsent } from "@/components/policy/CookieConsentProvider";
import { firstTouch } from "@/lib/launch/firstTouch";

export function FirstTouchCapture(): null {
  const pathname = usePathname();
  const consent = useAnalyticsConsent();
  const prevConsent = useRef(consent);

  useEffect(() => {
    firstTouch.observe(window.location.search, Date.now(), consent);
    // consent 는 아래 effect 가 맡는다 — 주소가 바뀔 때만 다시 본다.
  }, [pathname]);

  useEffect(() => {
    if (prevConsent.current === consent) return;
    prevConsent.current = consent;
    firstTouch.consentChanged(consent, Date.now());
  }, [consent]);

  return null;
}
