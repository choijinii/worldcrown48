/**
 * StageSide — VS 스플릿 무대의 칸 하나 (ARENA-1 PR 1 · 원장 D-11 · D-12 · D-15).
 *
 * 칸 = 정사각 창문. 안에 세 겹:
 *   ① 정지 포스터 <img> (object-fit: cover + object-position — lib/media/stageCrop)
 *   ② arm 된 쪽만 LoopPlayer (동시 1개 R3 · 자동재생 금지 R4 · pointer-events:none)
 *      재생이 실제로 시작되면 0.25초 크로스페이드로 포스터를 덮는다 (D-15 ②)
 *   ③ 덮개(세로 그늘 · 확정 순간 골드 빛) + 띠(이름 · 국적 · 소속)
 *
 * 칸 전체가 버튼이다 — 선택 버튼은 따로 없다 (D-11 조작 ④). 출처 칩 "▶ YouTube"(R4 임베드
 * 파사드 법리)는 링크라 버튼 안에 둘 수 없어 버튼의 형제로 둔다. 누른 도구(마우스/터치/키보드)를
 * 상태 머신에 넘기면 데스크톱은 한 번에, 모바일은 두 번째 탭에 확정된다 (D-17).
 *
 * 무대에 올리지 않는 것 (R2 · D-11 금지 4종): 라운드 라벨 · 득표율 · 마감 타이머 · 고지문.
 * 이 컴포넌트는 그런 값을 props 로 받지도 않는다.
 */
"use client";

import { useEffect, useRef, useState } from "react";
import type { Contestant } from "@/lib/types/tournament";
import { contestantAffiliation } from "@/lib/types/tournament";
import { displayRegion } from "@/lib/i18n/regionName";
import { useT } from "@/lib/i18n/useT";
import { posterCrop, posterSources, resolveStageMedia } from "@/lib/media/stageCrop";
import { buildWatchUrl } from "@/lib/embed/loopRange";
import type { StagePointer, StageSideKey } from "@/lib/arena/stageState";
import { LoopPlayer } from "@/components/embed/LoopPlayer";
import styles from "./stage.module.css";

type SideContestant = Pick<
  Contestant,
  "id" | "name" | "nationality" | "affiliation" | "position" | "media"
>;

interface StageSideProps {
  contestant: SideContestant;
  side: StageSideKey;
  /** 커진 칸(호버·1탭) — 이 칸만 재생한다. */
  armed: boolean;
  /** 옆칸이 커져 있다 — 채도만 낮춘다. */
  dimmed: boolean;
  /** 이 칸이 선택 확정됐다. */
  confirmed: boolean;
  /** 옆칸이 선택 확정됐다 — 어둡게. */
  lost: boolean;
  locked: boolean;
  onEnter: (side: StageSideKey, pointer: StagePointer) => void;
  onLeave: (side: StageSideKey, pointer: StagePointer) => void;
  onPress: (side: StageSideKey, pointer: StagePointer) => void;
}

/** 유튜브가 "그런 썸네일 없음" 대신 돌려주는 회색 자리표시 그림의 폭. */
const YT_PLACEHOLDER_WIDTH = 120;

function asPointer(type: string | undefined): StagePointer {
  return type === "touch" || type === "pen" ? type : "mouse";
}

export function StageSide({
  contestant,
  side,
  armed,
  dimmed,
  confirmed,
  lost,
  locked,
  onEnter,
  onLeave,
  onPress,
}: StageSideProps): JSX.Element {
  const { lang } = useT();
  const media = resolveStageMedia(contestant.media);
  const sources = media ? posterSources(media.videoId, media.orientation) : [];
  const [sourceIndex, setSourceIndex] = useState(0);
  const [videoReady, setVideoReady] = useState(false);
  const [videoFailed, setVideoFailed] = useState(false);
  const pointerRef = useRef<StagePointer>("mouse");

  // 다음 매치로 넘어가 참가자가 바뀌면 포스터·재생 상태를 새로 시작한다.
  useEffect(() => {
    setSourceIndex(0);
    setVideoFailed(false);
  }, [contestant.id]);

  // 재생기가 내려가면 다음 arm 때 다시 크로스페이드한다.
  const playing = armed && Boolean(media) && !videoFailed;
  useEffect(() => {
    if (!playing) setVideoReady(false);
  }, [playing]);

  const meta = [displayRegion(contestant.nationality, lang), contestantAffiliation(contestant)]
    .filter(Boolean)
    .join(" · ");
  const posterSrc = sources[sourceIndex];
  const initial = contestant.name?.charAt(0).toUpperCase() || "?";

  return (
    <div
      className={styles.cell}
      data-side={side}
      data-armed={armed}
      data-dimmed={dimmed}
      data-confirmed={confirmed}
      data-lost={lost}
      onPointerEnter={(e) => onEnter(side, asPointer(e.pointerType))}
      onPointerLeave={(e) => onLeave(side, asPointer(e.pointerType))}
    >
      <button
        type="button"
        className={styles.hit}
        data-testid={side === "L" ? "vote-left" : "vote-right"}
        aria-pressed={armed}
        aria-disabled={locked}
        onPointerDown={(e) => {
          pointerRef.current = asPointer(e.pointerType);
        }}
        onClick={(e) => {
          // 키보드(Enter·Space)로 눌린 click 은 detail 이 0 이다 — 터치처럼 두 단계로.
          const pointer: StagePointer = e.detail === 0 ? "keyboard" : pointerRef.current;
          pointerRef.current = "mouse";
          onPress(side, pointer);
        }}
      >
        <span className={styles.media}>
          {posterSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              className={styles.poster}
              src={posterSrc}
              alt=""
              style={posterCrop(media!.orientation, media!.focusY)}
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
          {playing && media ? (
            <span className={styles.video} data-ready={videoReady} data-testid="stage-player">
              <LoopPlayer
                fill
                showSourceChip={false}
                videoId={media.videoId}
                startSec={media.startSec}
                endSec={media.endSec}
                orientation={media.orientation}
                focusY={media.focusY}
                title={contestant.name}
                onPlaying={() => setVideoReady(true)}
                onError={() => setVideoFailed(true)}
              />
            </span>
          ) : null}
        </span>

        <span className={styles.shade} aria-hidden="true" />
        {confirmed ? <span className={styles.glow} aria-hidden="true" /> : null}

        <span className={styles.band} data-side={side}>
          <span className={styles.bandName}>{contestant.name}</span>
          {meta ? <span className={styles.bandMeta}>{meta}</span> : null}
        </span>
      </button>

      {playing && media ? (
        <a
          className={styles.sourceChip}
          href={buildWatchUrl(media.videoId, media.startSec)}
          target="_blank"
          rel="noopener noreferrer"
          data-testid="stage-source"
        >
          ▶ YouTube
        </a>
      ) : null}
    </div>
  );
}
