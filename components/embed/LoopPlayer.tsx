/**
 * LoopPlayer — 무음 루프 임베드 플레이어 (LAB-EV-1 W3 · ARENA-1 세로 지원).
 *
 * 전 서비스가 재사용할 코어다: 검수기 미리보기(이 킥) → Arena VS 무대 → Pitch
 * 쇼케이스(다음 킥들). 그래서 UI 의존이 없다 — props로 받은 구간을 그대로 돌린다
 * (ADR-EV-7 "코어는 UI 비의존").
 *
 * 규칙(ADR-EV-1·3):
 *   · 무음 고정 — 자동재생을 브라우저가 허용하는 유일한 조건이기도 하다
 *   · YT-FIX-1(원장 D-76 · 정책 III.I.4 · III.I.6): 16:9 상자에 **자르지 않고** 넣는다. 조작 막기
 *     없음, controls 등 유튜브 기본값 그대로, opacity·filter·transform 금지. 세로 영상은 유튜브가
 *     스스로 양옆 검은 띠를 넣는다.
 *   · 에러(2·5·100·101·150) → 썸네일 폴백 + onError 콜백(호출자가 마킹한다)
 *
 * 판정·구간 계산은 전부 lib/embed 순수 로직이고, 이 컴포넌트는 IFrame API에
 * 값을 넘기고 되감는 얇은 래퍼다(§0.5 렌더 테스트 금지 스택이라 로직을 뺐다).
 */
"use client";

import { useEffect, useRef, useState } from "react";
import {
  buildPlayerVars,
  buildThumbnailUrl,
  buildWatchUrl,
  resolveLoopRange,
  shouldLoopBack,
} from "@/lib/embed/loopRange";
import { describePlayerError, type PlayerErrorInfo } from "@/lib/embed/playerErrors";
import { loadIframeApi, type YTPlayer } from "@/lib/embed/client/iframeApi";
import styles from "./LoopPlayer.module.css";

/** 되감기 검사 주기 — 250ms면 이음매가 보이지 않고 CPU도 한가하다. */
const TICK_MS = 250;

export interface LoopPlayerProps {
  videoId: string;
  startSec: number;
  /** 기본 start+LOOP_SECONDS(15 · D-12). 영상이 짧으면 resolveLoopRange가 접는다. */
  endSec?: number;
  durationSec?: number | null;
  /** ADR-EV-3 출처 칩. 검수기 미리보기처럼 옆에 [원본 열기]가 따로 있으면 끈다. */
  showSourceChip?: boolean;
  /** 재생이 아니라 정지 썸네일만 (ADR-EV-4 — 활성 슬롯 1개만 라이브). */
  thumbnailOnly?: boolean;
  title?: string;
  className?: string;
  /** 부모 상자를 꽉 채운다(무대 칸). 기본은 자기 16:9 상자. */
  fill?: boolean;
  /** 실제로 재생이 시작된 순간 — 무대가 포스터를 여기서 걷기 시작한다(D-15 · D-76). */
  onPlaying?: () => void;
  onError?: (info: PlayerErrorInfo) => void;
}

export function LoopPlayer({
  videoId,
  startSec,
  endSec,
  durationSec = null,
  showSourceChip = true,
  thumbnailOnly = false,
  title = "",
  className,
  fill = false,
  onPlaying,
  onError,
}: LoopPlayerProps): JSX.Element {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const playerRef = useRef<YTPlayer | null>(null);
  const [failed, setFailed] = useState(false);

  const range =
    typeof endSec === "number"
      ? { startSec, endSec }
      : resolveLoopRange({ startSec, durationSec });

  // 콜백·구간은 ref로 읽는다 — 값이 바뀔 때마다 플레이어를 다시 만들면
  // 슬라이더를 1초 움직일 때마다 영상이 처음부터 로드된다.
  const rangeRef = useRef(range);
  rangeRef.current = range;
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;
  const onPlayingRef = useRef(onPlaying);
  onPlayingRef.current = onPlaying;

  useEffect(() => {
    if (thumbnailOnly) return;
    let cancelled = false;
    let timer: ReturnType<typeof setInterval> | null = null;

    void loadIframeApi()
      .then((YT) => {
        if (cancelled || !hostRef.current) return;
        setFailed(false);

        const player = new YT.Player(hostRef.current, {
          videoId,
          // 개인정보처리방침의 약속 — 개인정보 보호 강화 모드로 재생한다.
          host: "https://www.youtube-nocookie.com",
          playerVars: buildPlayerVars(rangeRef.current),
          events: {
            onReady: (e) => {
              e.target.mute(); // 무음은 협상 대상이 아니다 (ADR-EV-1)
              e.target.seekTo(rangeRef.current.startSec, true);
              e.target.playVideo();
            },
            onStateChange: (e) => {
              if (e.data === YT.PlayerState.PLAYING) onPlayingRef.current?.();
              if (e.data === YT.PlayerState.ENDED) {
                e.target.seekTo(rangeRef.current.startSec, true);
                e.target.playVideo();
              }
            },
            onError: (e) => {
              const info = describePlayerError(Number(e.data ?? 0));
              setFailed(true);
              onErrorRef.current?.(info);
            },
          },
        });
        playerRef.current = player;

        // `end` 파라미터만 믿으면 정지 후 ENDED까지 한 박자 검은 화면이 생긴다.
        timer = setInterval(() => {
          const p = playerRef.current;
          if (!p) return;
          const now = p.getCurrentTime?.();
          if (typeof now !== "number" || Number.isNaN(now)) return;
          if (shouldLoopBack(now, rangeRef.current)) {
            p.seekTo(rangeRef.current.startSec, true);
            p.playVideo();
          }
        }, TICK_MS);
      })
      .catch(() => {
        // API 로드 실패(네트워크·차단) → 썸네일로 산다. Auto-STOP ③은 이게
        // "지속"될 때의 이야기이고, 한 번의 실패로 화면을 죽이지는 않는다.
        if (!cancelled) setFailed(true);
      });

    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
      playerRef.current?.destroy?.();
      playerRef.current = null;
    };
  }, [videoId, thumbnailOnly]);

  // 슬라이더로 구간만 바꾼 경우 — 플레이어는 그대로 두고 위치만 옮긴다.
  useEffect(() => {
    playerRef.current?.seekTo?.(range.startSec, true);
  }, [range.startSec]);

  const showThumb = thumbnailOnly || failed;

  return (
    <div
      className={[
        styles.frame,
        fill ? styles.fill : "",
        className ?? "",
      ]
        .filter(Boolean)
        .join(" ")}
      data-testid="loop-player"
      data-failed={failed}
    >
      {showThumb ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className={styles.thumb} src={buildThumbnailUrl(videoId)} alt={title} />
          {failed && <span className={styles.fallbackNote}>재생할 수 없어 썸네일로 표시합니다</span>}
        </>
      ) : (
        <div className={styles.stage}>
          <div ref={hostRef} />
        </div>
      )}

      {showSourceChip && (
        <a
          className={styles.sourceChip}
          href={buildWatchUrl(videoId, range.startSec)}
          target="_blank"
          rel="noopener noreferrer"
          data-testid="loop-player-source"
          // 칩은 카드(무대 칸) 안에 있다 — 출처로 나가는 클릭이 선택으로 번지면 안 된다.
          onClick={(e) => e.stopPropagation()}
        >
          ▶ YouTube
        </a>
      )}
    </div>
  );
}
