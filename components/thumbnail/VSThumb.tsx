/**
 * VSThumb — 대회 썸네일 = 대표 매치 VS 장면 (THUMB-1 · 원장 D-35 · 합격 시안
 * `docs/design/claude-design/THUMB-1_2026-10-18/VSThumb.dc.html`).
 *
 * 16:9 한 장을 반으로 나눠 왼쪽 A · 오른쪽 B(각 8:9), 가운데 VS. 공용 부품이다 —
 * 피치 카드 커버 · 편집기 미리보기, 그리고 ARENA-2 의 아카이브 카드·대기실 전광판이
 * 같은 부품을 쓴다. 테마와 무관하게 커버 자체는 늘 매치 무대 색(다크)이다.
 *
 * **파일로 합성·저장하지 않는다**(법리) — 두 엔트리의 유튜브 포스터를 화면에서
 * 나란히 보일 뿐이다. 포스터 자르기는 한 방향만(`coverObjectPosition`).
 *
 * 시안 값: VS = 커버 너비의 10%(매치 무대 136/1320) · A/B 경계 = 1px 흰 10% 선
 * (`--arena-cell-border`) · 왼쪽 Turquoise · 오른쪽 Crimson = 칸 아래 2px 띠(65%,
 * 무대 띠 테두리와 같은 투명도) · 제목은 커버 하단 딤 위(17px, 2줄 말줄임).
 */
"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { posterSources, type EmbedOrientation } from "@/lib/media/stageCrop";
import { coverObjectPosition } from "@/lib/thumbnail/pair";
import { posterStep, posterZoom } from "@/lib/thumbnail/poster";

export interface VSThumbSide {
  videoId: string;
  orientation: EmbedOrientation;
  /** 0~100 — 가로 영상은 좌우, 세로는 위아래. */
  pos: number;
}

export interface VSThumbProps {
  a: VSThumbSide | null;
  b: VSThumbSide | null;
  /** 커버 하단 딤 위에 겹치는 대회 제목. 없으면 딤도 없다. */
  title?: string;
  /** 제목 글자 크기 — 시안: 데스크톱 17 · 모바일 15. 숫자 = px, 문자열 = CSS 값(피치는 변수로 폭마다 바꾼다). */
  titleSize?: number | string;
  /** 편집기 미리보기 전용 — 칸마다 자르기 값을 보인다. */
  showCrop?: boolean;
  /** 마지막 포스터 주소까지 실패(그림 깨짐, 킥 §4 ㉣). */
  onBroken?: (side: "a" | "b") => void;
  testId?: string;
}

const EDGE: Record<"a" | "b", string> = {
  a: "color-mix(in srgb, var(--color-turquoise) 65%, transparent)",
  b: "color-mix(in srgb, var(--color-crimson) 65%, transparent)",
};

const inkAlpha = (pct: number) => `color-mix(in srgb, var(--arena-ink) ${pct}%, transparent)`;

function Half({
  side,
  data,
  showCrop,
  onBroken,
  alone = false,
}: {
  side: "a" | "b";
  data: VSThumbSide | null;
  showCrop: boolean;
  onBroken?: (side: "a" | "b") => void;
  /** 혼자 그려지는 칸(편집기 자르기 창) — A/B 경계선이 필요 없다. */
  alone?: boolean;
}) {
  const sources = data ? posterSources(data.videoId, data.orientation) : [];
  const [index, setIndex] = useState(0);
  const [broken, setBroken] = useState(false);
  const videoId = data?.videoId;
  useEffect(() => {
    setIndex(0);
    setBroken(false);
  }, [videoId]);

  const settle = (outcome: "error" | { loadedWidth: number }) => {
    const step = posterStep(index, sources.length, outcome);
    if (step === "next") setIndex((i) => i + 1);
    else if (step === "broken") {
      setBroken(true);
      onBroken?.(side);
    }
  };

  const crop = data ? coverObjectPosition(data.orientation, data.pos) : "";
  // hqdefault 폴백이면 그림에 박힌 검은 띠를 가운데 기준 확대로 칸 밖에 민다(`posterZoom`).
  const zoom = data ? posterZoom(index, sources.length, data.orientation) : 1;
  const cell: CSSProperties = {
    flex: 1,
    minWidth: 0,
    position: "relative",
    overflow: "hidden",
    background: "var(--arena-cell-bg)",
    borderLeft: side === "b" && !alone ? "var(--arena-cell-border)" : undefined,
  };

  return (
    <div style={cell} data-testid={`vsthumb-${side}`} data-empty={!data || broken}>
      {data && !broken && sources[index] && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={sources[index]}
          alt=""
          data-testid={`vsthumb-${side}-img`}
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            objectPosition: crop,
            transform: zoom === 1 ? undefined : `scale(${zoom})`,
            display: "block",
          }}
          onError={() => settle("error")}
          onLoad={(e) => settle({ loadedWidth: e.currentTarget.naturalWidth })}
        />
      )}
      <div
        style={{ position: "absolute", inset: 0, background: "var(--arena-cell-shade)", pointerEvents: "none" }}
      />
      {(!data || broken) && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/brand/wc48-crown-circle-outline.svg"
            alt=""
            style={{ width: "22%", maxWidth: 40, opacity: 0.35 }}
          />
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              letterSpacing: "0.2em",
              color: "var(--color-text-muted)",
            }}
          >
            {side.toUpperCase()}
          </span>
        </div>
      )}
      {showCrop && data && (
        <span
          data-testid={`vsthumb-${side}-crop`}
          style={{
            position: "absolute",
            [side === "a" ? "left" : "right"]: 8,
            // 커버에선 아래(칩이 위에 있다), 혼자 그리는 자르기 창에선 위 — 시안 그대로.
            [alone ? "top" : "bottom"]: 8,
            fontFamily: "var(--font-mono)",
            fontSize: 9,
            letterSpacing: "0.14em",
            color: "var(--arena-icon)",
            background: inkAlpha(55),
            padding: "2px 6px",
            borderRadius: 2,
          }}
        >
          {side.toUpperCase()} · {crop}
        </span>
      )}
      <div
        style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 2, background: EDGE[side], zIndex: 9 }}
      />
    </div>
  );
}

export function VSThumb({
  a,
  b,
  title,
  titleSize = 17,
  showCrop = false,
  onBroken,
  testId = "vsthumb",
}: VSThumbProps): JSX.Element {
  return (
    <div
      data-testid={testId}
      style={{
        position: "relative",
        width: "100%",
        aspectRatio: "16 / 9",
        display: "flex",
        overflow: "hidden",
        background: "var(--arena-frame-bg)",
        containerType: "inline-size",
      }}
    >
      <Half side="a" data={a} showCrop={showCrop} onBroken={onBroken} />
      <Half side="b" data={b} showCrop={showCrop} onBroken={onBroken} />
      {title && (
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 9,
            padding: "32px 14px 12px",
            background: `linear-gradient(180deg, ${inkAlpha(0)} 0%, ${inkAlpha(72)} 45%)`,
            pointerEvents: "none",
          }}
        >
          <div
            data-testid={`${testId}-title`}
            style={{
              fontSize: titleSize,
              fontWeight: 700,
              lineHeight: 1.25,
              letterSpacing: "-0.01em",
              color: "var(--color-text)",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {title}
          </div>
        </div>
      )}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          transform: "translate(-50%, -50%)",
          fontFamily: "var(--font-display)",
          fontStyle: "italic",
          fontWeight: 700,
          fontSize: "10cqw",
          lineHeight: 1,
          color: "var(--arena-vs-color)",
          textShadow: "var(--arena-vs-shadow)",
          zIndex: 10,
          pointerEvents: "none",
        }}
      >
        VS
      </div>
    </div>
  );
}

/** 반쪽 한 칸(8:9)만 — 편집기 패널의 A·B 자르기 창. 커버와 같은 자르기를 쓴다. */
export function VSThumbHalf({
  side,
  data,
}: {
  side: "a" | "b";
  data: VSThumbSide | null;
}): JSX.Element {
  return (
    <div
      data-testid={`pair-window-${side}`}
      style={{ aspectRatio: "8 / 9", display: "flex", border: "var(--arena-cell-border)", overflow: "hidden" }}
    >
      <Half side={side} data={data} showCrop alone />
    </div>
  );
}
