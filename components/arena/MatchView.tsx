/**
 * MatchView — round 1–4 1v1 (wireframe .vs-stage / .vs-body 3-col grid).
 *
 * NO Round badge / counter / HUD (handoff §5, MENTAL_MODEL). The .vs-foot
 * disclaimer is canonical and explicitly states there's no Vote Rate % here.
 * After a pick, the chosen card highlights + the other dims; a loading overlay
 * covers the transition to the next match.
 */
"use client";

import type { Contestant } from "@/lib/types/tournament";
import styles from "./arena.module.css";
import { ContestantCard } from "./ContestantCard";
import { VsSymbol } from "./VsSymbol";

interface MatchViewProps {
  title: string;
  eyebrow?: string;
  left: Contestant;
  right: Contestant;
  pickedId?: string | null;
  loading?: boolean;
  onVote: (contestantId: string) => void;
}

export function MatchView({
  title,
  eyebrow = "The Arena",
  left,
  right,
  pickedId,
  loading,
  onVote,
}: MatchViewProps): JSX.Element {
  const hasPick = Boolean(pickedId);
  const lock = hasPick || Boolean(loading);

  return (
    <div className={styles.vsStage}>
      <header className={styles.vsHeader}>
        <div className={styles.vsEyebrow}>{eyebrow}</div>
        <h2 className={styles.vsTitle}>{title}</h2>
      </header>

      <div className={styles.vsBody}>
        <ContestantCard
          contestant={left}
          side="left"
          picked={pickedId === left.id}
          dimmed={hasPick && pickedId !== left.id}
          disabled={lock}
          onVote={onVote}
        />
        <VsSymbol />
        <ContestantCard
          contestant={right}
          side="right"
          picked={pickedId === right.id}
          dimmed={hasPick && pickedId !== right.id}
          disabled={lock}
          onVote={onVote}
        />
      </div>

      {loading && (
        <div className={styles.loading} aria-live="polite">
          <div className={styles.spinner} aria-hidden="true" />
          <div className={styles.loadingText}>다음 매치 · Next match</div>
        </div>
      )}

      <p className={styles.vsFoot}>
        No Round/Match counter, no <span className={styles.g}>“VOTE 3/5”</span>{" "}
        quota. No ENDS-IN timer (Match/Round have no deadline).{" "}
        <strong>No Vote Rate %</strong> — it appears only on the Ranking screen.
      </p>
    </div>
  );
}
