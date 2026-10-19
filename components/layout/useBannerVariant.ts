"use client";

import { useEffect, useState } from "react";
import { pageBannerVariant, type BannerVariant } from "@/lib/banner/bannerVariant";

/**
 * 배너 크기 — 서버와 첫 렌더는 데스크톱으로 같고(하이드레이션), 마운트 뒤 폭으로 정한다.
 * 860px 이하 = 휴대폰(320×100). 메뉴바가 접히는 폭과 같다.
 */
export function useBannerVariant(): BannerVariant {
  const [v, setV] = useState<BannerVariant>("desktop");
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 860px)");
    const apply = () => setV(mq.matches ? "mobile" : "desktop");
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);
  return v;
}

/**
 * 무대가 아닌 화면(피치 · THUMB-1 PR 2)의 배너 크기 — 휴대폰 가로에서는 없음(null · D-21).
 * 규칙은 lib/banner/bannerVariant `pageBannerVariant`. 첫 렌더는 데스크톱(하이드레이션).
 */
export function usePageBannerVariant(): BannerVariant | null {
  const [v, setV] = useState<BannerVariant | null>("desktop");
  useEffect(() => {
    const apply = () => setV(pageBannerVariant(window.innerWidth, window.innerHeight));
    apply();
    window.addEventListener("resize", apply);
    return () => window.removeEventListener("resize", apply);
  }, []);
  return v;
}
