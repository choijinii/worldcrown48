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
 */

import { useEffect } from "react";
import { track } from "@/lib/analytics";
import { HeroSection } from "./HeroSection";
import { TrendingFeed } from "./TrendingFeed";
import { LabEntryCard } from "./LabEntryCard";
import { NewsroomFeed } from "./NewsroomFeed";
import "./pitch.css";

export default function PitchPage() {
  useEffect(() => {
    track("a1_pitch_view", {});
  }, []);

  return (
    <main className="pitch">
      <div className="pitch-grain" aria-hidden="true" />
      <div className="pitch-inner">
        <HeroSection />
        <TrendingFeed />
        <LabEntryCard />
        <NewsroomFeed />
        <p className="pitch-foot">WorldCrown48 · 48 Contestants · One Crown</p>
      </div>
    </main>
  );
}
