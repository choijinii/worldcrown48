"use client";

/**
 * A-1 · The Pitch (Domain 1) — page composition.
 *
 * Module tree (handoff §6.1): HeroSection · TrendingFeed · LabEntryCard ·
 * NewsroomFeed · PitchFoot. Navigation now lives in the unified global Navbar
 * (components/layout/Navbar — Phase F/ADR-0010 absorbed the floating Pitch GNB),
 * so there is no per-page GNB here. `.pitch` is the container-query host
 * (pitch.css), so the responsive grid keys off page width — never viewport
 * media queries (handoff §6.3). a1_pitch_view fires once on mount (§8).
 *
 * THUMB-1 PR 2 — 화이트 전환(원장 D-39 · D-40): `.pitch` 가 `data-theme="light"` 를 달고
 * pitch.css 가 라이트 토큰(`--color-*-light`)만 쓴다. 새 색 없음. 대회 카드 커버(VS 장면)는
 * 매치 무대 색 그대로다. 배너 자리 `pitch-between` = 대회 프레임과 뉴스 프레임 사이(D-21 ③) ·
 * 970×90 · 728×90 · 320×100(자리 폭대로 · D-74) / 휴대폰 가로 없음. 런칭 전 기본 공지는 사전등록 안내(D-59).
 */

import { useEffect } from "react";
import { track } from "@/lib/analytics";
import { HeroSection } from "./HeroSection";
import { TrendingFeed } from "./TrendingFeed";
import { LabEntryCard } from "./LabEntryCard";
import { NewsroomFeed } from "./NewsroomFeed";
import { NewsRail } from "@/components/news/NewsRail";
import { BannerSlot } from "@/components/layout/BannerSlot";
import { usePageBannerVariant } from "@/components/layout/useBannerVariant";
import "./pitch.css";

export default function PitchPage() {
  const bannerVariant = usePageBannerVariant();
  useEffect(() => {
    track("a1_pitch_view", {});
  }, []);

  return (
    <main className="pitch" data-theme="light">
      <div className="pitch-grain" aria-hidden="true" />
      <div className="pitch-inner">
        <HeroSection />
        <TrendingFeed />
        {bannerVariant && (
          <div className="pitch-banner">
            <BannerSlot slot="pitch-between" variant={bannerVariant} className="pitch-banner-slot" />
          </div>
        )}
        <LabEntryCard />
        <NewsroomFeed />
        {/* TODO(ND-TEMP-MOUNT): Pitch 개편 시 우측 상설 프레임으로 이사.
            ND-1 임시 마운트 — ≥1024px 우측 고정 레일 + 모바일 하단 인라인. */}
        <NewsRail docked />
        <p className="pitch-foot">WorldCrown48 · 48 Contestants · One Crown</p>
      </div>
    </main>
  );
}
