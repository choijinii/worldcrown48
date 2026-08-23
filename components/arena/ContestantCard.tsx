/**
 * ContestantCard — one side of a 1v1 Match (wireframe .vs-card).
 *
 * Portrait (4:5, image or initial) + name + meta + a vote affordance + the gold
 * pick-check badge. NO vote count / rate is ever passed in (불변 원칙) — the
 * props deliberately have no `count`/`rate` field.
 */
"use client";

import type { Contestant } from "@/lib/types/tournament";
import { contestantThumbnail } from "@/lib/media/mediaSlot";
import styles from "./arena.module.css";

type CardContestant = Pick<
  Contestant,
  "id" | "name" | "nationality" | "position" | "media"
>;

interface ContestantCardProps {
  contestant: CardContestant;
  side: "left" | "right";
  picked?: boolean;
  dimmed?: boolean;
  disabled?: boolean;
  onVote: (contestantId: string) => void;
}

export function ContestantCard({
  contestant,
  side,
  picked,
  dimmed,
  disabled,
  onVote,
}: ContestantCardProps): JSX.Element {
  const initial = contestant.name?.charAt(0).toUpperCase() || "?";
  // LAB-UX-1 PR-2 — 운영자가 붙이던 imageUrl이 사라진 자리. 정지 썸네일 한 장이고
  // 호버 재생을 새로 만들지 않는다(대표 결정). 영상이 없으면 예전 그대로 이니셜.
  const photoUrl = contestantThumbnail(contestant.media);
  const meta = [contestant.nationality, contestant.position]
    .filter(Boolean)
    .join(" · ");
  const className = [
    styles.vsCard,
    styles[side],
    picked && styles.picked,
    dimmed && styles.dimmed,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      type="button"
      className={className}
      data-side={side}
      data-testid={`vote-${side}`}
      disabled={disabled}
      onClick={() => onVote(contestant.id)}
    >
      <div className={styles.vsPortrait}>
        {photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photoUrl} alt={contestant.name} />
        ) : (
          initial
        )}
        <span className={styles.pickCheck} aria-hidden="true">
          ✓
        </span>
      </div>
      <div className={styles.vsName}>{contestant.name}</div>
      <div className={styles.vsMeta}>{meta}</div>
      <span className={styles.voteBtn}>
        <small>{side === "left" ? "VOTE LEFT" : "VOTE RIGHT"}</small>
        <span>{contestant.name}</span>
      </span>
    </button>
  );
}
