"use client";

/**
 * A-1 · The Pitch (Domain 1) — page composition.
 *
 * Module tree (handoff §6.1): GnbIsland · HeroSection · TrendingFeed ·
 * LabEntryCard · NewsroomFeed · PitchFoot. `.pitch` is the container-query
 * host (pitch.css), so the responsive grid keys off page width — never
 * viewport media queries (handoff §6.3). The view-mount analytics event fires
 * once on mount (handoff §8: a1_pitch_view).
 */

import { useEffect } from "react";
import { track } from "@/lib/analytics";
import { GnbIsland } from "./GnbIsland";
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
      <GnbIsland />
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
