/**
 * stageLayout — 매치 무대의 영상 상자 크기 (YT-FIX-1 · 원장 D-76 · 시안 Arena Match Stage v5).
 *
 * 상자는 언제나 16:9 다. 유튜브 플레이어를 자르지 않고, 위에 아무것도 겹치지 않는다.
 *   · 데스크톱 1440 — 640×360 두 칸 맞붙임. 포커스 = 768×432 + 512×288(위로만 커진다).
 *   · 결승 데스크톱 — 426×240 세 칸 맞붙임 · 호버 1.12배.
 *   · 휴대폰 세로 — 320×180 위아래, 재생 칸만 364×205.
 *   · 휴대폰 가로 — 330×186 두 칸, 재생 칸만 366×206. 결승 240×135 → 366×206 · 나머지 183×103.
 *
 * 기기별 숫자는 시안 기준값이고, 화면이 다르면 같은 비율로 늘고 준다. 두 하한은 정책이다:
 * 재생 상자는 어디서든 200×200 이상(III.C.1), 포스터는 120×70 이상(III.C.1).
 *
 * `top` 은 화면 맨 위에서 무대 자리 윗변까지의 실제 거리다(메뉴·안내 문구 층을 화면이 재서 넘긴다).
 */

export type StageMode = "desktop" | "portrait" | "landscape";

/** D-17 ④ — 태블릿 구분 기준은 화면 폭 1024. */
export const STAGE_DESKTOP_MIN_WIDTH = 1024;

/** 데스크톱 상자들의 합 — 1320 프레임 − 패딩 20×2. */
const DESKTOP_ROW = 1280;
const DESKTOP_SIDE = 60;
const FRAME_PAD = 20;
/** 프레임 테두리 — 위아래 합. */
const FRAME_BORDER = 2;
/** 재생 상자 하한 — 세로 200 을 지키는 16:9 폭(정책 III.C.1). */
const MIN_PLAYING_W = 356;
/** 포스터 하한 — 세로 70 을 지키는 16:9 폭(120 도 함께 넘는다 · 정책 III.C.1). */
const MIN_POSTER_W = 125;

const NAME_GAP = 16;
const NAME_H = 72;
/** 프레임 아래 — 배너 간격 22 + 배너 90 + 첫 화면 경계까지 15 (시안: 배너 아래 끝 885). */
const BELOW_FRAME = 127;
/** 결승 프레임 안 맨 아래 한 줄(간격 14 + 글자 20). */
const FINAL_FOOT = 34;

/** 휴대폰 가로 두 칸 사이 틈 (D-76 · 2026-11-02). */
export const LANDSCAPE_GAP = 42;

export const MATCH_FOCUS_SCALE = 1.2;
export const FINAL_FOCUS_SCALE = 1.12;

export interface StageBox {
  w: number;
  h: number;
}

const box = (w: number): StageBox => ({ w, h: Math.round((w * 9) / 16) });

export interface StageLayout {
  cells: 2 | 3;
  mode: StageMode;
  direction: "row" | "column";
  /** 아무도 포커스되지 않은 상자. */
  base: StageBox;
  /** 포커스된(재생 중인) 상자. */
  big: StageBox;
  /** 포커스된 상자의 옆 상자. */
  small: StageBox;
  /** 상자 줄의 자리(세로 px) — 포커스돼도 아래 선이 움직이지 않게 미리 잡는다. */
  rowH: number;
  /** 프레임 바깥 폭. */
  frameW: number;
  /** 프레임이 가장 커졌을 때 높이 — 무대 자리의 높이. */
  slotH: number;
}

/**
 * 무대가 실제로 쓸 수 있는 높이 (ARENA-1 PR 2a).
 *
 * 크롬 안드로이드의 `window.innerHeight` 는 주소창이 접히고 펴져도 그대로라(레이아웃 뷰포트),
 * 그 값으로 칸을 계산하면 주소창이 펴진 동안 무대가 화면 밖으로 밀린다(09-20 눈검사).
 * 지금 눈에 보이는 높이는 `visualViewport.height` 다 — 있으면 그쪽을 쓴다.
 * 전체화면에 들어가면 둘이 같아진다.
 */
export function pickViewportHeight(
  innerHeight: number,
  visualViewportHeight: number | null | undefined,
): number {
  return typeof visualViewportHeight === "number" &&
    Number.isFinite(visualViewportHeight) &&
    visualViewportHeight > 0
    ? visualViewportHeight
    : innerHeight;
}

export function stageMode(width: number, height: number): StageMode {
  if (width >= STAGE_DESKTOP_MIN_WIDTH) return "desktop";
  return width > height ? "landscape" : "portrait";
}

function desktopRow(input: { width: number; height: number; top: number }, chrome: number, scale: number, cells: 2 | 3): number {
  const byWidth = Math.min(DESKTOP_ROW, input.width - 2 * DESKTOP_SIDE - 2 * FRAME_PAD);
  // 포커스된 상자까지 첫 화면에 들어가는 폭. 하한은 재생 200×200 이 깨지지 않는 값.
  const availH = input.height - input.top - chrome;
  const byHeight = Math.floor((((availH * 16) / 9) / scale) * cells + 0.01);
  const floor = Math.ceil((MIN_PLAYING_W / scale) * cells);
  return Math.max(Math.min(byWidth, byHeight), Math.min(byWidth, floor));
}

function frameSlotH(rowH: number, extra = 0): number {
  return 2 * FRAME_PAD + FRAME_BORDER + rowH + NAME_GAP + NAME_H + extra;
}

export function computeStageLayout(input: {
  width: number;
  height: number;
  top: number;
}): StageLayout {
  const mode = stageMode(input.width, input.height);
  if (mode === "desktop") {
    const chrome = 2 * FRAME_PAD + FRAME_BORDER + NAME_GAP + NAME_H + BELOW_FRAME;
    const row = desktopRow(input, chrome, MATCH_FOCUS_SCALE, 2);
    const big = box(Math.round((row / 2) * MATCH_FOCUS_SCALE));
    const rowH = big.h;
    return {
      cells: 2,
      mode,
      direction: "row",
      base: box(Math.round(row / 2)),
      big,
      small: box(row - big.w),
      rowH,
      frameW: row + 2 * FRAME_PAD,
      slotH: frameSlotH(rowH),
    };
  }
  if (mode === "portrait") {
    const bigW = Math.max(MIN_PLAYING_W, Math.min(input.width - 26, 640));
    const big = box(bigW);
    const base = box(Math.round((bigW * 320) / 364));
    return {
      cells: 2,
      mode,
      direction: "column",
      base,
      big,
      small: base,
      rowH: 2 * big.h,
      frameW: bigW + 2,
      slotH: 2 * big.h + 88 + 2,
    };
  }
  return landscape(input, 2);
}

function landscape(input: { width: number; height: number }, cells: 2 | 3): StageLayout {
  const scale = input.width / 844;
  const bigW = Math.max(MIN_PLAYING_W, Math.round(366 * scale));
  const big = box(bigW);
  const rest = input.width - 24 - bigW - (cells === 2 ? LANDSCAPE_GAP : 0);
  const base = box(
    cells === 2
      ? Math.max(MIN_POSTER_W, Math.min(Math.round(330 * scale), rest))
      : Math.max(MIN_POSTER_W, Math.min(Math.round(240 * scale), Math.floor((input.width - 24) / 3))),
  );
  const small = cells === 2 ? base : box(Math.max(MIN_POSTER_W, Math.min(Math.round(183 * scale), Math.floor(rest / 2))));
  return {
    cells,
    mode: "landscape",
    direction: "row",
    base,
    big,
    small,
    rowH: big.h,
    frameW: Math.min(input.width - 24, Math.max(Math.round(732 * scale), big.w + small.w * (cells - 1) + (cells === 2 ? LANDSCAPE_GAP : 0))),
    slotH: big.h + 66,
  };
}

/** THE FINAL — 같은 프레임 폭에 세 칸 (D-06 · D-76). */
export function computeFinalLayout(input: {
  width: number;
  height: number;
  top: number;
}): StageLayout {
  const mode = stageMode(input.width, input.height);
  if (mode === "desktop") {
    const chrome = 2 * FRAME_PAD + FRAME_BORDER + NAME_GAP + NAME_H + FINAL_FOOT + BELOW_FRAME;
    const row = desktopRow(input, chrome, FINAL_FOCUS_SCALE, 3);
    const unit = Math.floor(row / 3);
    const big = box(Math.max(MIN_PLAYING_W, Math.round((row / 3) * FINAL_FOCUS_SCALE)));
    const small = box(Math.round((row - big.w) / 2));
    return {
      cells: 3,
      mode,
      direction: "row",
      base: box(unit),
      big,
      small,
      rowH: big.h,
      frameW: row + 2 * FRAME_PAD,
      // 배너 아래 끝을 매치와 같은 자리에 둔다(시안) — 프레임이 낮은 만큼 위가 빈다.
      slotH: Math.max(frameSlotH(big.h, FINAL_FOOT), Math.min(input.height, 900) - input.top - BELOW_FRAME),
    };
  }
  if (mode === "portrait") {
    const bigW = Math.max(MIN_PLAYING_W, Math.min(input.width - 26, 640));
    const big = box(bigW);
    const base = box(Math.round((bigW * 320) / 364));
    return {
      cells: 3,
      mode,
      direction: "column",
      base,
      big,
      small: base,
      rowH: big.h + 2 * base.h,
      frameW: bigW + 2,
      slotH: big.h + 2 * base.h + 3 * 48 + 2 + 36,
    };
  }
  return landscape(input, 3);
}

/**
 * 상자 하나의 지금 크기 — 포커스된 칸 = big · 옆 칸 = small · 아무도 없으면 base.
 * 휴대폰은 small 이 base 라 옆 칸 크기가 그대로다(시안: 재생 칸만 커진다).
 */
export function stageBoxSize(layout: StageLayout, focused: boolean, anyFocused: boolean): StageBox {
  if (!anyFocused) return layout.base;
  return focused ? layout.big : layout.small;
}
