/**
 * FinalStage — THE FINAL 3분할 무대 (ARENA-1 PR 2b · 디자인 정본 19~23 · 원장 D-06 · D-29 · D-28).
 *
 * 매치 무대(SplitStage)와 **같은 프레임을 셋으로 나눈다** — 결승이 매치와 한 가족으로 보이게
 * (D-29 의도). 칸 크기는 lib/arena/stageLayout 의 computeFinalLayout 이 규칙으로 계산한다.
 *
 *   · 호버(모바일 1탭) 확대 **1.3배** — 가장자리 칸은 가장자리 기준, 가운데 칸은 가운데 기준
 *   · 옆칸 채도 50% · 재생은 한 칸만(R3 · R4 자동재생 금지)
 *   · 클릭(모바일 2탭) = 확정 → 매치와 같은 확정 연출 → **바로 Crown Card** (D-24 대관 연출 폐기)
 *   · 이름 띠 3색: 왼쪽 Turquoise · 가운데 Crown Gold · 오른쪽 Crimson, 같은 투명도 (D-29)
 *   · **크라운 표식 없음** (D-28) · 라운드 라벨·득표율·타이머·고지문 없음 (R2)
 *
 * 문구는 PR 2a 에서 승인·적용된 `arena.final.*` 키를 그대로 쓴다. 선택 엔진은 모른다 —
 * 확정되면 기존 onPick(contestantId) 을 부를 뿐이다(R1).
 */
"use client";

import { useCallback, useEffect, useReducer, useRef } from "react";
import type { Contestant } from "@/lib/types/tournament";
import { useT } from "@/lib/i18n/useT";
import { confirmTimeline } from "@/lib/arena/confirmTimeline";
import {
  fullscreenAction,
  nextRequestedThisLandscape,
} from "@/lib/arena/fullscreenGate";
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
import { bannerVariant } from "@/lib/banner/bannerVariant";
import { BannerSlot } from "@/components/layout/BannerSlot";
import { StageSide } from "./StageSide";
import styles from "./stage.module.css";

interface FinalStageProps {
  /** 세 명. 순서대로 왼쪽(위) · 가운데 · 오른쪽(아래). */
  finalists: Contestant[];
  loading: boolean;
  onPick: (contestantId: string) => void;
  /** 선택이 실패했을 때 고른 칸 안에 뜨는 한 줄 (디자인 12 · 기존 오류 키 문구). */
  errorNote?: string | null;
  onSignIn?: () => void;
}

/** 칸 자리 ↔ 상태 머신의 키. 모바일 세로에서는 위·가운데·아래. */
const SIDES: StageSideKey[] = ["L", "M", "R"];

/** 모바일 가로 = 집중 모드 — 매치 무대와 같게 상단 메뉴를 뺀다 (D-17 ③ · 아트보드 23). */
const HIDE_MENU_IN_LANDSCAPE = ".wc-nav { display: none !important; }";

const supportsFullscreen = (): boolean =>
  typeof document !== "undefined" &&
  typeof document.documentElement?.requestFullscreen === "function";

const isFullscreenNow = (): boolean =>
  typeof document !== "undefined" && document.fullscreenElement !== null;

function canHover(): boolean {
  return typeof window !== "undefined" && window.matchMedia?.("(hover: hover)").matches === true;
}

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true
  );
}

export function FinalStage({
  finalists,
  loading,
  onPick,
  onSignIn,
  errorNote,
}: FinalStageProps): JSX.Element {
  const { t } = useT();
  const [status, dispatch] = useReducer(reduceStage, initialStage);
  const frameRef = useRef<HTMLDivElement>(null);
  const onOrient = useCallback(() => dispatch({ type: "orient" }), []);
  const { mode, layout } = useStageViewport(frameRef, onOrient, { cells: 3 });

  // 가로 첫 탭 전체화면 — 매치 무대와 같은 규칙(PR 2a · 원장 D-17 바뀜 09-20).
  const requestedRef = useRef(false);
  const onStagePointerDown = useCallback(() => {
    const action = fullscreenAction({
      mode,
      isFullscreen: isFullscreenNow(),
      supported: supportsFullscreen(),
      requestedThisLandscape: requestedRef.current,
    });
    if (action === "request") {
      void document.documentElement.requestFullscreen?.().catch(() => {});
    }
    requestedRef.current = nextRequestedThisLandscape(requestedRef.current, mode, action);
  }, [mode]);
  useEffect(() => {
    if (mode === "landscape") return;
    if (isFullscreenNow()) void document.exitFullscreen?.().catch(() => {});
    requestedRef.current = false;
  }, [mode]);

  const timeline = confirmTimeline({ baseScale: 1.3, reducedMotion: prefersReducedMotion() });
  const picked = pickedSide(status);
  const armed = armedSide(status);
  const locked = isStageLocked(status) || loading;

  // 다음 화면(Crown Card)으로 넘어갔다가 돌아오는 경우를 위해 명단이 바뀌면 처음으로.
  const finalKey = finalists.map((f) => f.id).join("|");
  useEffect(() => {
    dispatch({ type: "settle" });
  }, [finalKey]);

  const wasLoading = useRef(loading);
  useEffect(() => {
    if (wasLoading.current && !loading) dispatch({ type: "settle" });
    wasLoading.current = loading;
  }, [loading]);

  // 확정 → 확정 연출 → 선택 전송(= 기존 onPick). 대관 연출은 없다(D-24).
  const onPickRef = useRef(onPick);
  onPickRef.current = onPick;
  const pickedId = picked ? (finalists[SIDES.indexOf(picked)]?.id ?? null) : null;
  const sendPick = useCallback(() => {
    if (!pickedId) return;
    dispatch({ type: "submit" });
    onPickRef.current(pickedId);
  }, [pickedId]);

  useEffect(() => {
    // reduced-motion 이면 버튼으로 넘어간다 — 문구만 Crown Card 로 (아트보드 27).
    if (!picked || !timeline.autoAdvance) return;
    const timer = setTimeout(sendPick, timeline.holdMs);
    return () => clearTimeout(timer);
  }, [picked, sendPick, timeline.autoAdvance, timeline.holdMs]);

  const onEnter = useCallback((side: StageSideKey, pointer: StagePointer) => {
    if (canHover()) dispatch({ type: "enter", side, pointer });
  }, []);
  const onLeave = useCallback((side: StageSideKey, pointer: StagePointer) => {
    if (canHover()) dispatch({ type: "leave", side, pointer });
  }, []);
  const onPress = useCallback(
    (side: StageSideKey, pointer: StagePointer) => {
      if (loading) return;
      dispatch({ type: "press", side, pointer });
    },
    [loading],
  );

  const stageVars = layout
    ? ({
        "--stage-cell": `${layout.cell}px`,
        "--stage-frame-w": `${layout.frameW}px`,
        "--stage-frame-h": `${layout.frameH}px`,
      } as React.CSSProperties)
    : undefined;

  return (
    <section
      className={`${styles.page} ${styles.final}`}
      data-stage-mode={mode}
      data-stage-ready={layout !== null}
      data-stage-status={status}
      data-stage-cells="3"
      data-testid="final-stage"
      style={stageVars}
      onPointerDownCapture={onStagePointerDown}
    >
      {mode === "landscape" ? <style>{HIDE_MENU_IN_LANDSCAPE}</style> : null}
      {/* 안내 문구 층 — 모바일 가로에는 없다(아트보드 23: 프레임이 화면 맨 위 12px). */}
      {mode !== "landscape" ? (
        <header className={styles.guide} data-stage-layer="guide">
          <div className={styles.eyebrow}>{t("arena.final.eyebrow")}</div>
          <h1 className={styles.title}>{t("arena.final.title")}</h1>
          <p className={styles.desc}>{t("arena.final.sub")}</p>
        </header>
      ) : null}

      <div
        ref={frameRef}
        className={styles.frame}
        data-stage-layer="frame"
        aria-busy={loading || picked !== null}
      >
        <div className={styles.cells}>
          {finalists.slice(0, 3).map((c, i) => {
            const side = SIDES[i];
            return (
              <StageSide
                key={c.id}
                contestant={c}
                side={side}
                armed={armed === side}
                dimmed={armed !== null && armed !== side}
                confirmed={picked === side}
                rings={timeline.rings.count}
                waiting={picked === side && loading}
                errorNote={picked === side || armed === side ? errorNote : null}
                lost={picked !== null && picked !== side}
                locked={locked}
                onEnter={onEnter}
                onLeave={onLeave}
                onPress={onPress}
              />
            );
          })}
        </div>
      </div>

      {timeline.needsButton && picked && !loading ? (
        <button
          type="button"
          className={styles.advanceButton}
          data-testid="confirm-advance"
          onClick={sendPick}
        >
          {t("arena.confirm.toCrownCard")}
        </button>
      ) : null}

      {mode !== "landscape" ? (
        <p className={styles.finalFoot}>{t("arena.final.foot")}</p>
      ) : null}

      {bannerVariant(mode) ? (
        <div className={styles.bannerRow} data-stage-layer="banner">
          <BannerSlot
            slot="arena-match-below"
            onSignIn={onSignIn}
            className={styles.banner}
            variant={bannerVariant(mode) ?? undefined}
          />
        </div>
      ) : null}
    </section>
  );
}
