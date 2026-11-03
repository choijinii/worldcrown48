/**
 * 매치 무대의 칸 — 영상 상자(StageBox)와 이름 버튼(StageNameButton) (YT-FIX-1 · 원장 D-76).
 *
 * 보기와 고르기를 다른 자리로 나눈다. 플레이어 안 클릭은 유튜브만 받고 IFrame API 는 클릭 신호를
 * 주지 않으므로, 클릭을 가로채지 않는 "영상 눌러 선택"은 불가능하다(정책 III.I.4 · III.I.21).
 *
 *   · StageBox — 16:9 상자. 플레이어를 자르지 않고, 위에 아무것도 겹치지 않고, 버튼 안에 넣지 않는다.
 *     포스터는 재생이 시작되면 0.25초 동안 사라진 뒤 DOM 에서 걷어 낸다. 플레이어에는 opacity ·
 *     filter · transform 을 걸지 않는다.
 *   · StageNameButton — 칸 아래 이름 · 국적 · 소속. 한 번 누르면 확정. "확인 중"·실패 한 줄은 버튼 아래.
 *
 * 선택 엔진(onVote · voteStore · roundProgress)은 모른다. 데이터 층 호출 없음 (R1 · R6).
 */
"use client";

import { useEffect, useRef, useState } from "react";
import type { Contestant } from "@/lib/types/tournament";
import { contestantAffiliation } from "@/lib/types/tournament";
import { displayRegion } from "@/lib/i18n/regionName";
import { useT } from "@/lib/i18n/useT";
import { localizedName } from "@/lib/contestantName";
import { posterSources, resolveStageMedia } from "@/lib/media/stageCrop";
import type { StageBox as StageBoxSize } from "@/lib/arena/stageLayout";
import type { StagePointer, StageSideKey } from "@/lib/arena/stageState";
import { LoopPlayer } from "@/components/embed/LoopPlayer";
import styles from "./stage.module.css";

type SideContestant = Pick<
  Contestant,
  "id" | "name" | "nameI18n" | "nationality" | "affiliation" | "position" | "media"
>;

/**
 * 포스터는 이 화면의 LCP 다 — 글꼴보다 먼저 받게 한다.
 *
 * Next 가 번들한 React 는 camelCase `fetchPriority` 를 알고 소문자 속성으로 내보낸다.
 * 소문자로 넘기면 개발 빌드에서 "Invalid DOM property" 경고가 콘솔 에러로 찍힌다
 * (2026-09-21 프리플라이트 실측 — 운영 빌드에서는 경고가 제거돼 스모크 때 보이지 않았다).
 * @types/react 18.3 에는 아직 이 prop 이 없어 타입만 넓혀 넘긴다.
 */
const HIGH_PRIORITY = { fetchPriority: "high" } as unknown as Record<string, string>;

/**
 * 이름 버튼의 시험용 이름표. 매치는 왼쪽·오른쪽 둘, 결승은 가운데(M)가 하나 더 있다(D-06).
 */
const SIDE_TESTID: Record<StageSideKey, string> = {
  L: "vote-left",
  M: "vote-mid",
  R: "vote-right",
};

/** 유튜브가 "그런 썸네일 없음" 대신 돌려주는 회색 자리표시 그림의 폭. */
const YT_PLACEHOLDER_WIDTH = 120;

/** 포스터가 사라지는 시간 — CSS `.poster` transition 과 같은 값. */
const POSTER_FADE_MS = 250;

function asPointer(type: string | undefined): StagePointer {
  return type === "touch" || type === "pen" ? type : "mouse";
}

interface StageBoxProps {
  contestant: SideContestant;
  side: StageSideKey;
  size: StageBoxSize | null;
  /** 이 칸이 재생된다 — 포커스·확정. */
  armed: boolean;
  /** 옆칸이 커져 있거나 확정됐다 — 채도만 낮춘다. 재생 중인 칸에는 걸리지 않는다. */
  dimmed: boolean;
  onEnter: (side: StageSideKey, pointer: StagePointer) => void;
  onLeave: (side: StageSideKey, pointer: StagePointer) => void;
  onTap: (side: StageSideKey) => void;
}

export function StageBox({
  contestant,
  side,
  size,
  armed,
  dimmed,
  onEnter,
  onLeave,
  onTap,
}: StageBoxProps): JSX.Element {
  const { lang } = useT();
  const media = resolveStageMedia(contestant.media);
  const sources = media ? posterSources(media.videoId, media.orientation) : [];
  const [sourceIndex, setSourceIndex] = useState(0);
  const [videoReady, setVideoReady] = useState(false);
  const [posterGone, setPosterGone] = useState(false);
  const [videoFailed, setVideoFailed] = useState(false);

  // 다음 매치로 넘어가 참가자가 바뀌면 포스터·재생 상태를 새로 시작한다.
  useEffect(() => {
    setSourceIndex(0);
    setVideoFailed(false);
  }, [contestant.id]);

  const playing = armed && Boolean(media) && !videoFailed;
  useEffect(() => {
    if (!playing) {
      setVideoReady(false);
      setPosterGone(false);
    }
  }, [playing]);

  // 재생이 시작되면 포스터가 사라지고, 다 사라지면 DOM 에서 걷어 낸다 — 플레이어 위에 아무것도 남지 않는다.
  useEffect(() => {
    if (!videoReady) return;
    const timer = setTimeout(() => setPosterGone(true), POSTER_FADE_MS);
    return () => clearTimeout(timer);
  }, [videoReady]);

  const posterSrc = sources[sourceIndex];
  const name = localizedName(contestant, lang);
  const initial = name.charAt(0).toUpperCase() || "?";

  return (
    <div
      className={styles.box}
      data-side={side}
      data-dimmed={dimmed}
      data-testid={`stage-box-${side}`}
      style={size ? { width: size.w, height: size.h } : undefined}
      onPointerEnter={(e) => onEnter(side, asPointer(e.pointerType))}
      onPointerLeave={(e) => onLeave(side, asPointer(e.pointerType))}
      onClick={(e) => {
        // 마우스는 호버로 이미 재생 중이다. 터치 노트북도 손가락 탭은 여기로 온다.
        if ((e.nativeEvent as PointerEvent).pointerType !== "mouse") onTap(side);
      }}
    >
      {playing && media ? (
        <div className={styles.video} data-testid="stage-player">
          <LoopPlayer
            fill
            showSourceChip={false}
            videoId={media.videoId}
            startSec={media.startSec}
            endSec={media.endSec}
            title={name}
            onPlaying={() => setVideoReady(true)}
            onError={() => setVideoFailed(true)}
          />
        </div>
      ) : null}
      {posterGone ? null : (
        <div
          className={styles.poster}
          data-portrait={media?.orientation === "portrait"}
          data-ready={videoReady}
          data-testid="stage-poster"
        >
          {posterSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={posterSrc}
              alt=""
              {...HIGH_PRIORITY}
              onError={() => setSourceIndex((i) => i + 1)}
              onLoad={(e) => {
                // 없는 해상도를 요청하면 404 대신 120×90 회색 그림이 올 때가 있다.
                if (
                  e.currentTarget.naturalWidth <= YT_PLACEHOLDER_WIDTH &&
                  sourceIndex < sources.length - 1
                ) {
                  setSourceIndex((i) => i + 1);
                }
              }}
            />
          ) : (
            <span className={styles.initial} aria-hidden="true">
              {initial}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

interface StageNameButtonProps {
  contestant: SideContestant;
  side: StageSideKey;
  /** 시안: 데스크톱은 버튼 폭이 상자 폭을 따라간다. 휴대폰은 칸마다 같다(undefined). */
  width?: number;
  focused: boolean;
  dimmed: boolean;
  confirmed: boolean;
  /** 서버 응답을 기다리는 중 — 버튼 아래 작은 표시. */
  waiting?: boolean;
  /** 선택이 실패했을 때 버튼 아래 뜨는 한 줄 (기존 오류 키 문구). */
  errorNote?: string | null;
  locked: boolean;
  onEnter: (side: StageSideKey, pointer: StagePointer) => void;
  onLeave: (side: StageSideKey, pointer: StagePointer) => void;
  onPress: (side: StageSideKey) => void;
}

export function StageNameButton({
  contestant,
  side,
  width,
  focused,
  dimmed,
  confirmed,
  waiting = false,
  errorNote = null,
  locked,
  onEnter,
  onLeave,
  onPress,
}: StageNameButtonProps): JSX.Element {
  const { t, lang } = useT();
  const meta = [displayRegion(contestant.nationality, lang), contestantAffiliation(contestant)]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className={styles.nameCell} style={width ? { width } : undefined}>
      <button
        type="button"
        className={styles.nameButton}
        data-side={side}
        data-focused={focused}
        data-dimmed={dimmed}
        data-confirmed={confirmed}
        data-testid={SIDE_TESTID[side]}
        aria-disabled={locked}
        // 키보드로 온 팬도 무엇이 재생되는지 먼저 본다 — 영상 상자는 초점을 받지 않는다.
        onFocus={(e) => {
          if (e.currentTarget.matches(":focus-visible")) onEnter(side, "mouse");
        }}
        onBlur={() => onLeave(side, "mouse")}
        onClick={() => onPress(side)}
      >
        <span className={styles.bandName} data-testid="stage-name">
          {localizedName(contestant, lang)}
        </span>
        {meta ? <span className={styles.bandMeta}>{meta}</span> : null}
      </button>
      {waiting ? (
        <span className={styles.waiting} data-testid="confirm-waiting">
          <span className={styles.spinner} aria-hidden="true" />
          {t("arena.confirm.waiting")}
        </span>
      ) : null}
      {errorNote ? (
        <span className={styles.errorNote} data-testid="confirm-error" role="status">
          {errorNote}
        </span>
      ) : null}
    </div>
  );
}
