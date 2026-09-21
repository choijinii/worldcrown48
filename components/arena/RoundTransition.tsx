/**
 * RoundTransition — the ONLY round-name surface (wireframe .rt-stage).
 *
 * Cinematic auto-play: in → hold (2s, progress bar) → out → onDone. This is the
 * only place a round name appears; the match screen never shows one. Round names
 * are WC48 (ROUND OF 24 / THE FINAL), never FIFA.
 *
 * ARENA-1 PR 2a: 박혀 있던 한/영 문구를 3언어 키로 옮겼다(arena.round.* · 승인본 §5).
 * 모양·타이밍은 그대로다. 라운드 이름 자체(roundName)와 큰 타이포는 PR 2b 디자인 몫.
 */
"use client";

import { useEffect, useRef, useState } from "react";
import { roundName, type RoundIndex } from "@/lib/arena/roundConfig";
import { useT } from "@/lib/i18n/useT";
import { SPLIT_SENTINEL, splitAround } from "@/lib/i18n/splitAround";
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
  const { t } = useT();
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

  const [doneBefore, doneAfter] = splitAround(
    t("arena.round.completed", { round: SPLIT_SENTINEL }),
  );

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
        {t("arena.round.spectatorNote")}
      </div>

      <div className={announceClass}>
        <div className={styles.rtDone}>
          {/* 라운드 이름만 굵게 — 문장은 승인본 그대로 두고 자리만 가른다. */}
          {doneBefore}
          <b>{roundName(fromRound, "en")}</b>
          {doneAfter}
        </div>
        <div className={styles.rtNextLabel}>{t("arena.round.next")}</div>
        <div className={styles.rtNext}>{roundName(toRound, "en")}</div>
        {meta && <div className={styles.rtMeta}>{meta}</div>}
      </div>

      <div className={styles.rtBar} aria-hidden="true">
        <i ref={barRef} />
      </div>
    </div>
  );
}
