"use client";

/**
 * M2 · FeaturedTournament — replaces the deleted CountdownTimer.
 *
 * Data binding: tournaments.where("featured", "==", true).limit(1).
 * Graceful empty: if no featured tournament exists, render nothing (no error).
 * OPS-FIX-1 (원장 D-66): 받아 온 문서도 `isPublicTournament` 를 지나야 보인다 — 실서비스에서
 * 시험 대회(`e2e: true`)를 추천 대회로 띄우지 않는다.
 *
 * The "ENTER ARENA →" CTA routes to the Arena Home board (`/arena?t={id}`) — ARENA-2 · 원장 D-71:
 * 피치와 같은 원칙(대기실을 거쳐 매치로 · 대표 2026-10-27).
 */

import Link from "next/link";
import { useEffect, useState } from "react";
import { collection, getDocs, limit, query, where } from "firebase/firestore";
import { getDb } from "@/lib/firebase";
import { currentDeployEnv } from "@/lib/deployEnv";
import { isPublicTournament } from "@/lib/seo/sitemapEntries";
import { track } from "@/lib/analytics";
import { useT } from "@/lib/i18n/useT";
import { localizedTitle } from "@/lib/tournamentTitle";
import { arenaHomeHref } from "@/lib/arenaHome/arenaHome";
import {
  formatClosesAt,
  resolveFeaturedView,
  type FeaturedView,
} from "@/lib/launch/featured";

export function FeaturedTournament() {
  const [tournament, setTournament] = useState<FeaturedView | null>(null);
  const [resolved, setResolved] = useState(false);
  const { t, lang } = useT();

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
        if (!isPublicTournament({ id: doc.id, ...doc.data() }, currentDeployEnv())) {
          setResolved(true);
          return;
        }
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
      <h2 className="ft-title">{localizedTitle(tournament, lang)}</h2>
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
        href={arenaHomeHref({ t: tournament.id })}
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
