/**
 * RankingView — wireframe `sf-ranking` surface (Domain 3 dark). Presentational:
 * the page container subscribes to ranking_cache and maps it to one of three
 * `data-rank` states (loaded · loading · empty). Anomaly signal NEVER reaches
 * this Voter surface (W-2, ADR-0006 amendment) — it lives only in admin_alerts.
 * The CSS below is
 * PORTED VERBATIM from `docs/design/wireframes/Domain 3 · The Arena.html`
 * (lines 119~131 t-deadline, 372~404 rank-*, plus the narrow-viewport rule) so
 * the rendered surface matches the wireframe ±2px. All tokens resolve from
 * app/globals.css :root.
 *
 * Round Scope Lock (§9 trap #11): import ONLY from app/arena/[id]/ranking/.
 * Never render this on the Match VS surface (Vote Rate is ranking-only).
 */
import type { RankingEntry } from "@/lib/ranking/rankingTypes";
import { RankingHeader } from "./RankingHeader";
import { RankList } from "./RankList";
import { RankSkeleton } from "./RankSkeleton";
import { RankEmpty } from "./RankEmpty";

export type RankState = "loading" | "empty" | "loaded";

export interface RankingViewLabels {
  kicker: string;
  note: string;
  deadlineLabel: string;
  emptyTitle: string;
  emptySubtitle: string;
}

export interface RankingViewProps {
  state: RankState;
  title: string;
  deadlineText: string | null;
  entries: RankingEntry[];
  labels: RankingViewLabels;
}

const STYLE = `
.sf-ranking { color: var(--color-text); }
.rank-wrap { padding: var(--space-16) var(--space-8) var(--space-12); max-width: 820px; margin: 0 auto; }
.rank-head { margin-bottom: var(--space-6); }
.rank-kicker { font-family: var(--font-mono); font-size: 11px; letter-spacing: 0.18em; text-transform: uppercase; color: var(--color-gold); }
.rank-title { font-weight: 700; font-size: 26px; letter-spacing: -0.015em; margin: var(--space-1) 0 0; }
.rank-note { font-family: var(--font-mono); font-size: 11px; color: var(--color-text-muted); letter-spacing: 0.04em; margin-top: var(--space-2); }
.t-deadline { display: inline-flex; align-items: center; gap: var(--space-2); font-family: var(--font-mono); font-size: 11px; letter-spacing: 0.14em; padding: 4px var(--space-3); border: 1px solid var(--color-border-gold); background: var(--color-gold-subtle); border-radius: var(--radius-chip); color: var(--color-gold); text-transform: uppercase; }
.t-deadline svg { width: 12px; height: 12px; color: var(--color-gold-bright); flex: none; }
.t-deadline .td-l { color: var(--color-text-sub); font-weight: 600; }
.t-deadline .td-v { color: var(--color-gold); font-weight: 700; letter-spacing: 0.12em; }
.rank-list { display: flex; flex-direction: column; gap: var(--space-2); }
.rank-row { display: grid; grid-template-columns: 36px 44px 1fr 96px; align-items: center; gap: var(--space-3); padding: var(--space-3) var(--space-4); background: var(--color-bg-soft); border: 1px solid var(--color-border); border-radius: var(--radius-border); }
.rank-row.top { border: 2px solid var(--color-gold-bright); background: linear-gradient(90deg, var(--color-gold-subtle), transparent 60%); box-shadow: 0 0 24px rgba(252, 208, 6, 0.25); }
.rank-row.flag { border-color: color-mix(in srgb, var(--color-crimson) 45%, transparent); }
.rank-no { font-family: var(--font-mono); font-size: 15px; font-weight: 700; color: var(--color-text-sub); text-align: center; }
.rank-row.top .rank-no { color: var(--color-gold); }
.rank-av { width: 40px; height: 40px; border-radius: var(--radius-chip); background: linear-gradient(135deg, var(--color-bg-elevated), var(--color-bg-soft)); border: 1px solid var(--color-border-gold); display: flex; align-items: center; justify-content: center; font-family: var(--font-display); font-style: italic; font-weight: 700; color: var(--color-gold); font-size: 16px; overflow: hidden; }
.rank-av img { width: 100%; height: 100%; object-fit: cover; }
.rank-info .rn { font-weight: 600; font-size: 15px; }
.rank-rate { text-align: right; }
.rank-rate .rv { font-family: var(--font-mono); font-weight: 700; font-size: 18px; color: var(--color-gold); }
.rank-rate .rbar { height: 4px; border-radius: var(--radius-chip); background: var(--color-bg-elevated); margin-top: 4px; overflow: hidden; }
.rank-rate .rbar i { display: block; height: 100%; background: var(--color-gold); border-radius: var(--radius-chip); }
.rank-row.flag .rank-rate .rv { color: var(--color-crimson); }
.rank-row.flag .rbar i { background: var(--color-crimson); }
.rank-skel { display: flex; flex-direction: column; gap: var(--space-2); }
.rskel { height: 64px; border-radius: var(--radius-border); background: linear-gradient(90deg, var(--color-bg-soft) 0%, var(--color-bg-elevated) 50%, var(--color-bg-soft) 100%); background-size: 200% 100%; animation: rankShimmer 1400ms ease infinite; }
@keyframes rankShimmer { from { background-position: 200% 0; } to { background-position: -200% 0; } }
.rank-empty { display: flex; flex-direction: column; align-items: center; text-align: center; gap: var(--space-3); padding: var(--space-20) var(--space-6); border: 1px dashed var(--color-border); border-radius: var(--radius-border); }
.rank-empty img { width: 64px; opacity: 0.85; filter: drop-shadow(0 0 12px rgba(252, 208, 6, 0.18)); }
.rank-empty .et { font-weight: 600; font-size: 16px; }
.rank-empty .es { font-size: 13px; color: var(--color-text-sub); }
@media (max-width: 520px) { .rank-row { grid-template-columns: 28px 36px 1fr 80px; } }
/* Mobile shows top 12 only (W-3, 대표 결정 2026-06-26) — desktop keeps all active
   rows so a Voter can find their own Contestant. Rows are direct .rank-list
   children, so nth-child(n+13) targets the 13th+. */
@media (max-width: 520px) { .rank-row:nth-child(n+13) { display: none; } }
@media (prefers-reduced-motion: reduce) { .rskel { animation: none; } }
`;

export function RankingView({
  state,
  title,
  deadlineText,
  entries,
  labels,
}: RankingViewProps): JSX.Element {
  return (
    <section className="sf-ranking" data-rank={state} data-testid="ranking-view">
      <style>{STYLE}</style>
      <div className="rank-wrap">
        <RankingHeader
          kicker={labels.kicker}
          title={title}
          note={labels.note}
          deadlineLabel={labels.deadlineLabel}
          deadlineText={deadlineText}
        />

        {state === "loading" ? <RankSkeleton /> : null}

        {state === "empty" ? (
          <RankEmpty title={labels.emptyTitle} subtitle={labels.emptySubtitle} />
        ) : null}

        {state === "loaded" ? (
          <RankList entries={entries} flagFirst={false} />
        ) : null}
      </div>
    </section>
  );
}
