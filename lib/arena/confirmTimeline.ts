/**
 * confirmTimeline — 선택 확정 연출의 단계·시각 (ARENA-1 PR 2b · 디자인 정본 10~14 · 27).
 *
 * "골랐다"가 읽히는 짧은 반응이다(원장 D-24 정의 — 대관 연출과 다른 것이고, 이것은 만든다).
 * 한 번 참여에 46번 보게 되므로 짧고 조용해야 한다.
 *
 *   0ms      금색 테두리·그림자 즉시 (--arena-cell-confirm-*)
 *   0→180ms  고른 칸 크기 스냅: 기준 → 기준+0.035 → 기준 (크기만, 위치·투명도 외 금지 · R5)
 *   0→300ms  금색 고리 두 겹 0.55 → 1.5배로 퍼지며 투명해짐
 *   0ms      옆칸 밝기 40%
 *   520ms    기존 onVote 흐름으로 다음 매치 (선택 엔진 불변 · R1)
 *
 * **크라운 표식은 넣지 않는다** — 크라운은 Crown Card 에만 나온다(D-28). 디자인 데이터에
 * `crown` 항목이 남아 있어도 무시한다.
 *
 * prefers-reduced-motion: 스냅·고리 없음, 테두리·그림자·옆칸 40% 는 전환 없이 즉시,
 * 기다리는 시간 없이 **버튼**으로 넘어간다(자동 넘김 금지 · R5 "대기 시간도 제거").
 */

/** 확정 유지 시간 — 토큰 --arena-t-confirm-hold 와 같은 값. */
export const CONFIRM_HOLD_MS = 520;

/** 스냅에서 기준 배율 위에 얹는 양 (1.20 → 1.235). 결승(1.3)에도 같은 문법으로 얹힌다. */
export const CONFIRM_SNAP_DELTA = 0.035;

export interface ConfirmTimeline {
  /** 크기 스냅의 각 지점. reduced-motion 이면 1.0 한 점. */
  snap: Array<{ atMs: number; scale: number }>;
  /** 금색 고리 — reduced-motion 이면 count 0. */
  rings: { count: number; fromScale: number; toScale: number; durationMs: number };
  /** 옆칸 밝기(0~1). */
  sideBrightness: number;
  /** 테두리·그림자가 나타나는 시각. */
  borderAtMs: number;
  /** 확정 뒤 다음 매치까지 기다리는 시간. reduced-motion 이면 0. */
  holdMs: number;
  /** 시간이 지나면 저절로 넘어가는가. */
  autoAdvance: boolean;
  /** 넘어가려면 버튼이 필요한가 (reduced-motion). */
  needsButton: boolean;
  /** 전환(transition) 길이 — reduced-motion 이면 0. */
  transitionMs: number;
}

export function confirmTimeline(input: {
  /** 확정 순간 고른 칸의 기준 배율 — 매치 1.2(D-11) · 결승 1.3(D-29). */
  baseScale: number;
  reducedMotion: boolean;
}): ConfirmTimeline {
  const { baseScale, reducedMotion } = input;
  const round = (n: number) => Math.round(n * 1000) / 1000;

  if (reducedMotion) {
    return {
      snap: [{ atMs: 0, scale: 1 }],
      rings: { count: 0, fromScale: 0.55, toScale: 1.5, durationMs: 0 },
      sideBrightness: 0.4,
      borderAtMs: 0,
      holdMs: 0,
      autoAdvance: false,
      needsButton: true,
      transitionMs: 0,
    };
  }

  return {
    snap: [
      { atMs: 0, scale: round(baseScale) },
      { atMs: 90, scale: round(baseScale + CONFIRM_SNAP_DELTA) },
      { atMs: 180, scale: round(baseScale) },
    ],
    rings: { count: 2, fromScale: 0.55, toScale: 1.5, durationMs: 300 },
    sideBrightness: 0.4,
    borderAtMs: 0,
    holdMs: CONFIRM_HOLD_MS,
    autoAdvance: true,
    needsButton: false,
    transitionMs: 180,
  };
}
