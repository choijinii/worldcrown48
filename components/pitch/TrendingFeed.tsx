"use client";

/**
 * M2 · TrendingFeed — live grid of active Tournaments + skeleton/empty states.
 *
 * Subscribes to pitchStore.subscribeToTrending() (handoff §5 query: active,
 * createdAt desc, limit 12) and cleans up on unmount. The feed-wrap
 * `data-card-state` switches grid / skeleton / empty exactly as the wireframe
 * (lines 425-440). NO CategoryFilter — single-stream feed (handoff §5 DON'T).
 */

import { useEffect } from "react";
import { usePitchStore } from "@/lib/pitch/pitchStore";
import { isFeedEmpty } from "@/lib/pitch/trending";
import { TournamentCard } from "./TournamentCard";

type CardState = "loading" | "empty" | "default";

const SKELETON_KEYS = ["s1", "s2", "s3", "s4", "s5", "s6"];

export function TrendingFeed() {
  const tournaments = usePitchStore((s) => s.tournaments);
  const loading = usePitchStore((s) => s.loading);
  const subscribeToTrending = usePitchStore((s) => s.subscribeToTrending);

  useEffect(() => subscribeToTrending(), [subscribeToTrending]);

  const cardState: CardState = loading
    ? "loading"
    : isFeedEmpty(tournaments)
      ? "empty"
      : "default";

  return (
    <>
      <div className="sec-head" id="trending">
        <div>
          <div className="sec-kicker">트렌딩 · Trending</div>
          <h2 className="sec-title">Trending Tournaments</h2>
        </div>
        <span className="sec-count">
          {tournaments.length} {tournaments.length === 1 ? "Tournament" : "Tournaments"} · 진행 중
        </span>
      </div>

      <div className="feed-wrap" data-card-state={cardState}>
        <div className="feed-grid">
          {tournaments.map((t, i) => (
            <TournamentCard key={t.id} tournament={t} position={i} />
          ))}
        </div>

        <div className="skel-grid" aria-hidden="true">
          {SKELETON_KEYS.map((k) => (
            <div className="skel" key={k}>
              <div className="skel-cover" />
              <div className="skel-line w60" />
              <div className="skel-line w40" />
            </div>
          ))}
        </div>

        <div className="empty-state">
          <img src="/brand/wc48-crown-circle-outline.svg" alt="" width={56} />
          <div className="et">No Tournaments are open right now</div>
          <div className="es">아직 공개된 토너먼트가 없습니다 · check back soon</div>
        </div>
      </div>
    </>
  );
}
