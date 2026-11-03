/**
 * FinalStage — THE FINAL 세 칸 무대 (ARENA-1 PR 2b · YT-FIX-1 · 원장 D-06 · D-29 · D-28 · D-76).
 *
 * 16:9 상자 셋을 맞붙이고 각 상자 아래 이름 버튼을 둔다. 크기는 lib/arena/stageLayout.
 *
 *   · 호버(휴대폰 탭) 확대 1.12배 · 옆칸 채도 50% · 재생은 한 칸만(R3 · R4 자동재생 금지)
 *   · 이름 버튼 한 번 = 확정 → 금색 버튼 → **바로 Crown Card** (D-24 대관 연출 폐기)
 *   · 버튼 3색: 왼쪽 Turquoise · 가운데 Crown Gold · 오른쪽 Crimson, 같은 투명도 (D-29)
 *   · **크라운 표식 없음** (D-28) · 라운드 라벨·득표율·타이머·고지문 없음 (R2)
 *   · 휴대폰 세로는 세 칸으로 첫 화면이 다 차서 배너가 없다 (D-76)
 *
 * 문구는 `arena.final.*` 키를 그대로 쓴다. 선택 엔진은 모른다 —
 * 확정되면 기존 onPick(contestantId) 을 부를 뿐이다(R1).
 */
"use client";

import { Fragment, useCallback, useEffect, useReducer, useRef } from "react";
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
import { stageBoxSize } from "@/lib/arena/stageLayout";
import { useStageViewport } from "@/lib/arena/useStageViewport";
import { bannerVariant } from "@/lib/banner/bannerVariant";
import { BannerSlot } from "@/components/layout/BannerSlot";
import { StageBox, StageNameButton } from "./StageSide";
import styles from "./stage.module.css";

interface FinalStageProps {
  /** 세 명. 순서대로 왼쪽(위) · 가운데 · 오른쪽(아래). */
  finalists: Contestant[];
  loading: boolean;
  onPick: (contestantId: string) => void;
  /** 선택이 실패했을 때 고른 버튼 아래 뜨는 한 줄 (기존 오류 키 문구). */
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

  const timeline = confirmTimeline({ baseScale: 1, reducedMotion: prefersReducedMotion() });
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
  // 실패하면 상태가 처음으로 돌아간다 — 오류 한 줄은 마지막으로 고른 버튼 아래에 남긴다.
  const lastPick = useRef<StageSideKey | null>(null);
  if (picked) lastPick.current = picked;
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
  const onTap = useCallback((side: StageSideKey) => dispatch({ type: "tap", side }), []);
  const onPress = useCallback(
    (side: StageSideKey) => {
      if (loading) return;
      dispatch({ type: "press", side });
    },
    [loading],
  );

  const stageVars = layout
    ? ({
        "--stage-frame-w": `${layout.frameW}px`,
        "--stage-row-h": `${layout.rowH}px`,
        "--stage-slot-h": `${layout.slotH}px`,
      } as React.CSSProperties)
    : undefined;

  const box = (side: StageSideKey) =>
    layout ? stageBoxSize(layout, armed === side, armed !== null) : null;
  const dimmedOf = (side: StageSideKey) =>
    picked !== null ? picked !== side : armed !== null && armed !== side;
  const boxOf = (c: Contestant, side: StageSideKey) => (
    <StageBox
      contestant={c}
      side={side}
      size={box(side)}
      armed={armed === side}
      dimmed={dimmedOf(side)}
      onEnter={onEnter}
      onLeave={onLeave}
      onTap={onTap}
    />
  );
  const nameOf = (c: Contestant, side: StageSideKey) => (
    <StageNameButton
      contestant={c}
      side={side}
      width={mode === "portrait" ? undefined : box(side)?.w}
      focused={armed === side}
      dimmed={dimmedOf(side)}
      confirmed={picked === side}
      waiting={picked === side && loading}
      errorNote={lastPick.current === side ? errorNote : null}
      locked={locked}
      onEnter={onEnter}
      onLeave={onLeave}
      onPress={onPress}
    />
  );
  const shown = finalists.slice(0, 3);
  const banner = mode === "portrait" ? null : bannerVariant(mode);

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
      <header className={styles.guide} data-stage-layer="guide">
        <div className={styles.eyebrow}>{t("arena.final.eyebrow")}</div>
        <h1 className={styles.title}>{t("arena.final.title")}</h1>
        <p className={styles.desc}>{t("arena.final.sub")}</p>
      </header>

      <div ref={frameRef} className={styles.slot}>
        <div
          className={styles.frame}
          data-stage-layer="frame"
          aria-busy={loading || picked !== null}
        >
          {mode === "portrait" ? (
            // 세로는 칸마다 상자 바로 아래 버튼 (시안 22).
            shown.map((c, i) => (
              <div key={c.id} className={styles.finalStack}>
                {boxOf(c, SIDES[i])}
                {nameOf(c, SIDES[i])}
              </div>
            ))
          ) : (
            <>
              <div className={styles.boxes}>
                {shown.map((c, i) => (
                  <Fragment key={c.id}>{boxOf(c, SIDES[i])}</Fragment>
                ))}
              </div>
              <div className={styles.names}>
                {shown.map((c, i) => (
                  <Fragment key={c.id}>{nameOf(c, SIDES[i])}</Fragment>
                ))}
              </div>
            </>
          )}
          {mode !== "landscape" ? (
            <p className={styles.finalFoot}>{t("arena.final.foot")}</p>
          ) : null}
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

      {banner ? (
        <div className={styles.bannerRow} data-stage-layer="banner">
          <BannerSlot
            slot="arena-match-below"
            onSignIn={onSignIn}
            variant={banner}
          />
        </div>
      ) : null}
    </section>
  );
}
