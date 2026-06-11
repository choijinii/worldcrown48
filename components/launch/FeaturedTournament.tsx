"use client";

/**
 * M2 · FeaturedTournament — replaces the deleted CountdownTimer.
 *
 * Data binding: tournaments.where("featured", "==", true).limit(1).
 * Graceful empty: if no featured tournament exists, render nothing (no error).
 *
 * The "ENTER ARENA →" CTA routes to /arena/[tournamentId].
 */

import Link from "next/link";
import { useEffect, useState } from "react";
import { collection, getDocs, limit, query, where, type Timestamp } from "firebase/firestore";
import { getDb } from "@/lib/firebase";
import { track } from "@/lib/analytics";

type FeaturedTournamentDoc = {
  id: string;
  title: string;
  contestantsCount: number;
  closesAt: Timestamp;
};

function formatClosesAt(ts: Timestamp): string {
  const d = ts.toDate();
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function FeaturedTournament() {
  const [tournament, setTournament] = useState<FeaturedTournamentDoc | null>(null);
  const [resolved, setResolved] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const db = getDb();
        const q = query(
          collection(db, "tournaments"),
          where("featured", "==", true),
          limit(1)
        );
        const snap = await getDocs(q);
        if (cancelled) return;
        if (snap.empty) {
          setResolved(true);
          return;
        }
        const doc = snap.docs[0];
        const data = doc.data() as Omit<FeaturedTournamentDoc, "id">;
        setTournament({
          id: doc.id,
          title: data.title,
          contestantsCount: data.contestantsCount,
          closesAt: data.closesAt,
        });
        setResolved(true);
      } catch (err) {
        // Firestore unreachable / env vars missing — graceful hide.
        if (!cancelled) setResolved(true);
        console.warn("FeaturedTournament: Firestore query failed", err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Graceful empty: render nothing until resolved, then nothing if missing.
  if (!resolved || !tournament) return null;

  return (
    <section className="featured-tournament" aria-label="Featured tournament">
      <div className="ft-pill">
        <span className="star" aria-hidden="true">
          ★
        </span>{" "}
        FEATURED TOURNAMENT
      </div>
      <h2 className="ft-title">{tournament.title}</h2>
      <div className="ft-meta">
        <span className="ft-meta-item">
          <span className="ft-meta-num">{tournament.contestantsCount}</span>{" "}
          Contestants
        </span>
        <span className="ft-meta-sep" aria-hidden="true">
          ·
        </span>
        <span className="ft-meta-item">
          Closes{" "}
          <span className="ft-meta-num">{formatClosesAt(tournament.closesAt)}</span>
        </span>
      </div>
      <Link
        className="ft-cta"
        href={`/arena/${tournament.id}`}
        onClick={() => {
          void track("featured_tournament_click", { tournament_id: tournament.id });
        }}
      >
        <span>ENTER ARENA</span>
        <svg
          width={16}
          height={16}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2.4}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <line x1="4" y1="12" x2="18" y2="12" />
          <polyline points="12 6 18 12 12 18" />
        </svg>
      </Link>
    </section>
  );
}
