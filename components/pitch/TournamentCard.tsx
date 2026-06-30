"use client";

/**
 * M3 · TournamentCard — cover (48 VS) + featured/status pills + title + meta
 * + ENTER. Links to the Arena (/arena/{id}).
 *
 * Hard constraints (handoff §5 / AC-4 / AC-6): NO Vote Count, NO Vote Rate(%),
 * NO LIVE badge, NO Round info anywhere on the card. The meta line is built by
 * cardMeta() — "48 Contestants · Closes {date}" only. The status pill text is
 * the tournament's own status; on The Pitch the feed is active-only, so this
 * renders the gold ACTIVE pill.
 */

import Link from "next/link";
import type { Tournament } from "@/lib/types/tournament";
import { cardMeta, statusPillVariant } from "@/lib/pitch/trending";
import { track } from "@/lib/analytics";

function ArrowIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <line x1="4" y1="12" x2="18" y2="12" />
      <polyline points="12 6 18 12 12 18" />
    </svg>
  );
}

export interface TournamentCardProps {
  tournament: Tournament;
  position: number;
}

export function TournamentCard({ tournament, position }: TournamentCardProps) {
  const meta = cardMeta(tournament);
  const pill = statusPillVariant(tournament.status);

  return (
    <Link
      className="tcard"
      href={`/arena/${tournament.id}`}
      aria-label={tournament.title}
      onClick={() =>
        track("a1_card_click", { tournamentId: tournament.id, position })
      }
    >
      <div className="tcard-cover">
        <div className="tcard-chips">
          {tournament.featured ? (
            <span className="featured-pill" aria-label="Featured tournament">
              FEATURED
            </span>
          ) : (
            <span className="tcard-spacer" />
          )}
          <span className={`status-pill status-${pill}`}>
            <span className="led" aria-hidden="true" />
            {tournament.status.toUpperCase()}
          </span>
        </div>
        <span className="tcard-vs">48</span>
      </div>
      <div className="tcard-body">
        <div className="tcard-title">{tournament.title}</div>
        <div className="tcard-meta">
          {meta.map((seg, i) => (
            <span key={seg}>
              {i > 0 && <span className="sep">·&nbsp;</span>}
              {seg}
            </span>
          ))}
        </div>
        <div className="tcard-foot">
          <span className="tcard-enter">
            ENTER <ArrowIcon />
          </span>
        </div>
      </div>
    </Link>
  );
}
