"use client";

import { useEffect, useState } from "react";
import { pageBannerVariant, type BannerVariant } from "@/lib/banner/bannerVariant";

/**
 * 무대가 아닌 화면(피치 · 아레나 홈)의 배너 — 휴대폰 가로에서는 없음(null · D-21).
 * 크기(970×90 · 728×90 · 320×100)는 여기서 정하지 않는다 — 공용 BannerSlot 이 자리 폭으로 고른다(D-74).
 * 첫 렌더는 "있음"(하이드레이션).
 */
export function usePageBannerVariant(): BannerVariant | null {
  const [v, setV] = useState<BannerVariant | null>("leaderboard");
  useEffect(() => {
    const apply = () => setV(pageBannerVariant(window.innerWidth, window.innerHeight));
    apply();
    window.addEventListener("resize", apply);
    return () => window.removeEventListener("resize", apply);
  }, []);
  return v;
}
