"use client";

/**
 * LaunchBanner — 사전등록 페이지 맨 아래 배너 자리 `launch-below` (PRE-REG-1 · 원장 D-21 적용).
 *
 * SNS 링크 아래 — 등록 칸 근처에 두지 않는다(대표 결정 ③). 970×90 / 모바일 320×100, 기존
 * BannerSlot 부품과 lib/banner/bannerSlot 규칙 그대로(배너가 없으면 기존 기본 공지 — 빈칸 금지).
 * 기본 공지의 로그인은 Google 로그인 — 이 페이지를 열기만 해서는 익명 계정을 만들지 않는다(D-41).
 */
import { BannerSlot } from "@/components/layout/BannerSlot";
import { useBannerVariant } from "@/components/layout/useBannerVariant";

export function LaunchBanner() {
  const variant = useBannerVariant();
  return (
    <div className="lp-banner">
      <BannerSlot slot="launch-below" variant={variant} className="lp-banner-slot" />
    </div>
  );
}
