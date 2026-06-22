/**
 * RoundTransition — the ONLY round-name surface (wireframe .rt-stage).
 *
 * Cinematic auto-play: in → hold (2s, progress bar) → out → onDone. This is the
 * only place a round name appears; the match screen never shows one. Round names
 * are WC48 (ROUND OF 24 / THE FINAL), never FIFA.
 */
"use client";

import { useEffect, useRef, useState } from "react";
import { roundName, type RoundIndex } from "@/lib/arena/roundConfig";
import styles from "./arena.module.css";

interface RoundTransitionProps {
  fromRound: RoundIndex;
  toRound: RoundIndex;
  meta?: string;
  onDone?: () => void;
}

export function RoundTransition({
  fromRound,
  toRound,
  meta,
  onDone,
}: RoundTransitionProps): JSX.Element {
  const [phase, setPhase] = useState<"in" | "hold" | "out">("in");
  const barRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const t1 = setTimeout(() => {
      setPhase("hold");
      if (barRef.current) {
        barRef.current.style.transition = "width 2000ms linear";
        barRef.current.style.width = "100%";
      }
    }, 60);
    const t2 = setTimeout(() => setPhase("out"), 2060);
    const t3 = setTimeout(() => onDone?.(), 2580);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [onDone]);

  const announceClass = [
    styles.rtAnnounce,
    phase === "hold" && styles.hold,
    phase === "out" && styles.out,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={styles.rtStage}>
      <div className={styles.rtGlow} aria-hidden="true" />
      <div className={`${styles.rtCorner} ${styles.rtCornerBl}`}>
        ✦ Voter is briefly the spectator
      </div>

      <div className={announceClass}>
        <div className={styles.rtDone}>
          방금 완료 · You completed <b>{roundName(fromRound, "en")}</b>
        </div>
        <div className={styles.rtNextLabel}>다음 라운드 · Next round</div>
        <div className={styles.rtNext}>{roundName(toRound, "en")}</div>
        {meta && <div className={styles.rtMeta}>{meta}</div>}
      </div>

      <div className={styles.rtBar} aria-hidden="true">
        <i ref={barRef} />
      </div>
    </div>
  );
}
