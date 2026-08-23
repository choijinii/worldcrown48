/**
 * FinalPickView — THE FINAL (wireframe .final-row, 3-up).
 *
 * Round 5: 3 finalists shown together, pick ONE directly → Champion. Never split
 * into 1v1 matches. Foot reads "One pick · One Crown · no second round".
 */
"use client";

import type { Contestant } from "@/lib/types/tournament";
import { contestantThumbnail } from "@/lib/media/mediaSlot";
import styles from "./arena.module.css";

type FinalContestant = Pick<
  Contestant,
  "id" | "name" | "nationality" | "position" | "media"
>;

interface FinalPickViewProps {
  finalists: FinalContestant[];
  pickedId?: string | null;
  disabled?: boolean;
  onPick: (contestantId: string) => void;
}

export function FinalPickView({
  finalists,
  pickedId,
  disabled,
  onPick,
}: FinalPickViewProps): JSX.Element {
  const hasPick = Boolean(pickedId);

  return (
    <div className={styles.finalStage}>
      <header className={styles.finalHead}>
        <div className={styles.finalEyebrow}>결승 · THE FINAL</div>
        <div className={styles.finalH}>Choose your Champion</div>
        <div className={styles.finalSub}>
          3명의 파이널리스트 중 한 명을 직접 선택하세요 · pick one of three,
          directly
        </div>
      </header>

      <div className={styles.finalRow}>
        {finalists.map((f) => {
          const className = [
            styles.fcard,
            pickedId === f.id && styles.picked,
            hasPick && pickedId !== f.id && styles.dimmed,
          ]
            .filter(Boolean)
            .join(" ");
          return (
            <button
              key={f.id}
              type="button"
              className={className}
              data-testid={`final-${f.id}`}
              disabled={disabled || hasPick}
              onClick={() => onPick(f.id)}
            >
              <div className={styles.fcardPhoto}>
                {contestantThumbnail(f.media) ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={contestantThumbnail(f.media)} alt={f.name} />
                ) : (
                  f.name.charAt(0).toUpperCase()
                )}
              </div>
              <div className={styles.fcardBody}>
                <div className={styles.fcardName}>{f.name}</div>
                <div className={styles.fcardMeta}>
                  {[f.nationality, f.position].filter(Boolean).join(" · ")}
                </div>
                <span className={styles.fcardVote}>
                  <small>CROWN</small>
                  <span>{f.name}</span>
                </span>
              </div>
            </button>
          );
        })}
      </div>

      <div className={styles.finalFoot}>
        One pick · One Crown · no second round
      </div>
    </div>
  );
}
