/**
 * RoundTransition — 라운드 전환 (ARENA-1 PR 2b · 디자인 정본 15~18 · 원장 D-06 · R2).
 *
 * 서비스에서 **라운드 이름이 나오는 유일한 자리**다(Round Scope Lock · R2). 매치 화면에는
 * 라운드 라벨이 없다. 이름은 WC48 형식(ROUND OF 24 · THE FINAL)이고 FIFA 명칭은 쓰지 않는다.
 *
 *   전체화면 · 상단 메뉴 없음 · 동심원 5겹(안쪽 2겹만 선명) · 중심 금색 방사 그라디언트 한 겹
 *   · 약 2초 자동 진행 + 진행 바 · **탭하면 즉시 넘어감** · 배너 자리 없음(D-26)
 *
 * prefers-reduced-motion(아트보드 18): 움직임·기다림 없이 버튼으로 넘어간다(R5).
 * 계측 `round_advance` 는 이 화면이 아니라 page.tsx 가 쏜다 — 파라미터 불변(R8).
 */
"use client";

import { useEffect, useRef, useState } from "react";
import { contestantsForRound, roundName, type RoundIndex } from "@/lib/arena/roundConfig";
import { useT } from "@/lib/i18n/useT";
import { SPLIT_SENTINEL, splitAround } from "@/lib/i18n/splitAround";
import styles from "./roundTransition.module.css";

interface RoundTransitionProps {
  fromRound: RoundIndex;
  toRound: RoundIndex;
  onDone?: () => void;
}

/** 진행 바가 차는 시간 — 토큰 --arena-round-hold-ms 와 같은 값(디자인 "진행 바 2.0s"). */
const HOLD_MS = 2000;

/** 전환이 떠 있는 동안에는 상단 메뉴를 뺀다 (디자인 15~17 · 전체화면). */
const HIDE_MENU = ".wc-nav { display: none !important; }";

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true
  );
}

export function RoundTransition({
  fromRound,
  toRound,
  onDone,
}: RoundTransitionProps): JSX.Element {
  const { t } = useT();
  const barRef = useRef<HTMLElement | null>(null);
  const doneRef = useRef(false);
  const [reduced] = useState(prefersReducedMotion);

  const finish = (): void => {
    if (doneRef.current) return;
    doneRef.current = true;
    onDone?.();
  };

  useEffect(() => {
    if (reduced) return; // 기다리는 시간 없음 — 버튼을 눌러야 간다(아트보드 18)
    const start = requestAnimationFrame(() => {
      if (barRef.current) {
        barRef.current.style.transition = `width ${HOLD_MS}ms linear`;
        barRef.current.style.width = "100%";
      }
    });
    const timer = setTimeout(finish, HOLD_MS);
    return () => {
      cancelAnimationFrame(start);
      clearTimeout(timer);
    };
    // finish 는 ref 가드라 안정적이다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduced]);

  // "방금 마친 라운드 {round}" 는 승인 문장 하나다 — 라벨과 라운드 이름으로 자리만 가른다.
  const [prevLabel] = splitAround(t("arena.round.completed", { round: SPLIT_SENTINEL }));

  return (
    <div
      className={styles.stage}
      data-testid="round-transition"
      data-reduced-motion={reduced}
      // 탭하면 바로 넘어간다. 정지 상태에서는 버튼이 그 역할을 한다.
      onClick={reduced ? undefined : finish}
    >
      <style>{HIDE_MENU}</style>
      <div className={styles.glow} aria-hidden="true" />
      {[1, 2, 3, 4, 5].map((r) => (
        <div key={r} className={styles.ring} data-ring={r} aria-hidden="true" />
      ))}

      <span className={styles.corner} data-corner="tl">
        {t("arena.round.cornerTopLeft")}
      </span>
      <span className={styles.corner} data-corner="tr">
        {/* {n} = 다음 라운드에 오르는 인원 수 (48강을 마치면 24). */}
        {t("arena.round.cornerTopRight", { n: contestantsForRound(toRound) })}
      </span>
      <span className={styles.corner} data-corner="bl">
        {t("arena.round.cornerBottomLeft")}
      </span>
      {!reduced && (
        <span className={styles.corner} data-corner="br">
          {t("arena.round.cornerBottomRight")}
        </span>
      )}

      <div className={styles.center}>
        <span className={styles.prevLabel}>{prevLabel.trim()}</span>
        <span className={styles.prevRound} data-testid="round-prev">
          {roundName(fromRound, "en")}
        </span>
        <span className={styles.nextRound} data-testid="round-next">
          {roundName(toRound, "en")}
        </span>
        <span className={styles.nextLine}>{t("arena.round.nextLine")}</span>
      </div>

      <div className={styles.progressWrap}>
        {reduced ? (
          <button
            type="button"
            className={styles.button}
            data-testid="round-advance"
            onClick={finish}
          >
            {t("arena.round.nextRoundButton")}
          </button>
        ) : (
          <>
            <div className={styles.bar} aria-hidden="true">
              <i ref={barRef} />
            </div>
            <span className={styles.progressLabel}>{t("arena.round.progress")}</span>
          </>
        )}
      </div>
    </div>
  );
}
