/**
 * SplitStage — 매치 화면의 VS 스플릿 무대 (ARENA-1 PR 1 · 원장 D-08 · D-11 · D-12 · D-17).
 *
 * 화면은 네 층이다 (D-08): ① 상단 메뉴(공통 Navbar — 여기서 그리지 않는다) ② 안내 문구 층
 * ③ 무대 프레임 ④ 배너 자리. 무대는 화면 끝에 닿지 않는다.
 *
 *   데스크톱(≥1024) : 프레임 안 칸 두 개 좌우 50:50, 틈 0, VS 는 맞닿는 선 정중앙 고정
 *   모바일 세로      : 상하 2분할 + "가로로 돌리면…" 한 줄 (D-17 ②)
 *   모바일 가로      : 좌우 50:50, 상단 메뉴 없음 (D-17 ③), 안내 문구는 무대 위 알약 하나
 *
 * 칸 크기는 기기별 숫자가 아니라 "주어진 자리의 짧은 쪽" 규칙으로 계산한다
 * (lib/arena/stageLayout). 조작은 lib/arena/stageState 상태 머신 하나가 정한다.
 *
 * 선택 엔진은 모른다 (R1): 확정되면 520ms(확정 연출) 뒤 부모의 onVote(contestantId) 를
 * 부를 뿐이다. 진행 중인 판·선택 기록·match_session_id 는 voteStore·page.tsx 에 있고,
 * 이 컴포넌트는 회전해도 같은 트리라 리마운트되지 않는다 (D-17 ①).
 */
"use client";

import { useCallback, useEffect, useReducer, useRef, type ReactNode } from "react";
import type { Contestant } from "@/lib/types/tournament";
import { useT } from "@/lib/i18n/useT";
import {
  armedSide,
  initialStage,
  isStageLocked,
  pickedSide,
  reduceStage,
  type StagePointer,
  type StageSideKey,
} from "@/lib/arena/stageState";
import { useStageViewport } from "@/lib/arena/useStageViewport";
import { BannerSlot } from "@/components/layout/BannerSlot";
import { StageSide } from "./StageSide";
import styles from "./stage.module.css";

interface SplitStageProps {
  title: string;
  description?: string;
  left: Contestant;
  right: Contestant;
  /** 서버가 선택을 처리 중 (page.tsx 의 submitting). */
  loading: boolean;
  onVote: (contestantId: string) => void;
  /** 안내 문구 층 아래에 붙는 한 줄(게스트 첫 진입 안내 등). */
  notice?: ReactNode;
  /** 배너 기본 공지(비로그인)의 로그인 화면. */
  onSignIn?: () => void;
}

/**
 * 모바일 가로에서만 상단 메뉴(공통 Navbar)와 아레나 탭 줄을 뺀다 (D-17 ③ · D-08 유일한 예외).
 * 메뉴바 부품은 NAV-1 소관이라 손대지 않고, 무대가 가로 배치로 떠 있는 동안에만 이 규칙을
 * 문서에 싣는다 — 세로로 돌리거나 무대를 떠나면 규칙이 사라지고 메뉴가 돌아온다(나가는 길).
 * (CSS Modules 는 전역 선택자만 있는 규칙을 받지 않아 여기 둔다 — ModuleNav 와 같은 방식.)
 */
const HIDE_MENU_IN_LANDSCAPE = ".wc-nav, .module-nav { display: none !important; }";

/** 확정 연출 유지 시간 — 토큰 --arena-t-confirm-hold 와 같은 값 (디자인 confirm() 520ms). */
const CONFIRM_HOLD_MS = 520;

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true
  );
}

export function SplitStage({
  title,
  description,
  left,
  right,
  loading,
  onVote,
  notice,
  onSignIn,
}: SplitStageProps): JSX.Element {
  const { t } = useT();
  const [status, dispatch] = useReducer(reduceStage, initialStage);
  const frameRef = useRef<HTMLDivElement>(null);
  const onOrient = useCallback(() => dispatch({ type: "orient" }), []);
  const { mode, layout } = useStageViewport(frameRef, onOrient);

  // 다음 매치가 들어오면 처음으로.
  const matchKey = `${left.id}|${right.id}`;
  useEffect(() => {
    dispatch({ type: "settle" });
  }, [matchKey]);

  // 서버 처리가 끝났는데 매치가 그대로면(실패) 처음으로 — 다시 고를 수 있게.
  const wasLoading = useRef(loading);
  useEffect(() => {
    if (wasLoading.current && !loading) dispatch({ type: "settle" });
    wasLoading.current = loading;
  }, [loading]);

  // 확정 → 520ms 확정 연출 → 선택 전송. reduced-motion 이면 대기 시간도 없다 (R5).
  const picked = pickedSide(status);
  const onVoteRef = useRef(onVote);
  onVoteRef.current = onVote;
  useEffect(() => {
    if (!picked) return;
    const id = picked === "L" ? left.id : right.id;
    const timer = setTimeout(
      () => {
        dispatch({ type: "submit" });
        onVoteRef.current(id);
      },
      prefersReducedMotion() ? 0 : CONFIRM_HOLD_MS,
    );
    return () => clearTimeout(timer);
  }, [picked, left.id, right.id]);

  const armed = armedSide(status);
  const locked = isStageLocked(status) || loading;
  const onEnter = useCallback(
    (side: StageSideKey, pointer: StagePointer) => dispatch({ type: "enter", side, pointer }),
    [],
  );
  const onLeave = useCallback(
    (side: StageSideKey, pointer: StagePointer) => dispatch({ type: "leave", side, pointer }),
    [],
  );
  const onPress = useCallback(
    (side: StageSideKey, pointer: StagePointer) => {
      if (loading) return;
      dispatch({ type: "press", side, pointer });
    },
    [loading],
  );

  const sideProps = (side: StageSideKey) => ({
    side,
    armed: armed === side,
    dimmed: armed !== null && armed !== side,
    confirmed: picked === side,
    lost: picked !== null && picked !== side,
    locked,
    onEnter,
    onLeave,
    onPress,
  });

  const stageVars = layout
    ? ({
        "--stage-cell": `${layout.cell}px`,
        "--stage-frame-w": `${layout.frameW}px`,
      } as React.CSSProperties)
    : undefined;

  return (
    <section
      className={styles.page}
      data-stage-mode={mode}
      data-stage-status={status}
      data-testid="split-stage"
      style={stageVars}
    >
      {mode === "landscape" ? <style>{HIDE_MENU_IN_LANDSCAPE}</style> : null}
      {mode !== "landscape" ? (
        <header className={styles.guide} data-stage-layer="guide">
          {mode === "desktop" ? (
            <>
              <div className={styles.eyebrow}>The Arena</div>
              <h1 className={styles.title}>{title}</h1>
              {description ? <p className={styles.desc}>{description}</p> : null}
            </>
          ) : null}
          {notice}
        </header>
      ) : null}

      <div
        ref={frameRef}
        className={styles.frame}
        data-stage-layer="frame"
        aria-busy={loading || picked !== null}
      >
        <div className={styles.cells}>
          <StageSide contestant={left} {...sideProps("L")} />
          <StageSide contestant={right} {...sideProps("R")} />
          <div className={styles.vs} aria-hidden="true">
            VS
          </div>
          {mode === "landscape" ? <div className={styles.pill}>{title}</div> : null}
        </div>
      </div>

      {mode === "portrait" ? (
        <p className={styles.rotateHint} data-testid="stage-rotate-hint">
          {t("arena.stage.rotateHint")}
        </p>
      ) : null}

      <div className={styles.bannerRow} data-stage-layer="banner">
        <BannerSlot slot="arena-match-below" onSignIn={onSignIn} className={styles.banner} />
      </div>
    </section>
  );
}
