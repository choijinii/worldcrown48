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
import { collection, getDocs, limit, query, where } from "firebase/firestore";
import { getDb } from "@/lib/firebase";
import { track } from "@/lib/analytics";
import { useT } from "@/lib/i18n/useT";
import {
  formatClosesAt,
  resolveFeaturedView,
  type FeaturedView,
} from "@/lib/launch/featured";

export function FeaturedTournament() {
  const [tournament, setTournament] = useState<FeaturedView | null>(null);
  const [resolved, setResolved] = useState(false);
  const { t } = useT();

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
        // Resolve the CANONICAL Tournament schema (tournamentDeadline /
        // totalContestants) — a featured doc never carries the legacy
        // closesAt/contestantsCount, so reading those crashed /launch (Hotfix-1).
        setTournament(resolveFeaturedView(doc.id, doc.data()));
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
        {t("launch.featured.pill")}
      </div>
      <h2 className="ft-title">{tournament.title}</h2>
      <div className="ft-meta">
        <span className="ft-meta-item">
          <span className="ft-meta-num">{tournament.contestantsCount ?? 48}</span>{" "}
          {t("launch.featured.contestants")}
        </span>
        {formatClosesAt(tournament.closesAt) && (
          <>
            <span className="ft-meta-sep" aria-hidden="true">
              ·
            </span>
            <span className="ft-meta-item">
              {t("launch.featured.closes")}{" "}
              <span className="ft-meta-num">
                {formatClosesAt(tournament.closesAt)}
              </span>
            </span>
          </>
        )}
      </div>
      <Link
        className="ft-cta"
        href={`/arena/${tournament.id}`}
        onClick={() => {
          void track("featured_tournament_click", { tournament_id: tournament.id });
        }}
      >
        <span>{t("launch.featured.cta")}</span>
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
