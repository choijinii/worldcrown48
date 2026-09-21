/**
 * stageLayout — VS 스플릿 무대의 칸 크기 (ARENA-1 PR 1 · 원장 D-17 · D-11 바뀜 09-17).
 *
 * 원장 D-17 "칸 크기를 정하는 일반 규칙":
 *   > 칸은 언제나 정사각이다. 한 변의 길이는 그 칸에 주어진 자리의 가로와 세로 중 짧은 쪽이다.
 *   · 좌우 배치 — 가로 = (화면 폭 − 좌우 여백) ÷ 2 · 세로 = (화면 높이 − 위 − 아래 여백)
 *   · 상하 배치 — 가로 = (화면 폭 − 좌우 여백)     · 세로 = (화면 높이 − 위 − 아래 여백) ÷ 2
 *
 * 기기별 숫자를 따로 정하지 않는다. 아래 상수는 "여백"이지 칸 크기가 아니다 —
 * 칸 640(데스크톱) · 364(모바일 세로) · 366(모바일 가로)은 이 규칙이 계산해 낸 값이고,
 * 유닛 테스트가 디자인 파일(아트보드 1·6·9)과 검산한다.
 *
 * `top` 은 화면 맨 위에서 무대 프레임 윗변까지의 실제 거리다(메뉴·안내 문구 층을 화면이
 * 재서 넘긴다). 메뉴 높이를 여기서 추정하지 않는다 — 메뉴바는 NAV-1이 바꿀 공통 부품이다.
 */

export type StageMode = "desktop" | "portrait" | "landscape";

/** D-17 ④ — 태블릿 구분 기준은 화면 폭 1024. */
export const STAGE_DESKTOP_MIN_WIDTH = 1024;

/** 데스크톱 칸 상한 — 유튜브 썸네일 원본이 1280×720이라 더 키우면 흐려진다 (D-08 왜 (1)). */
export const STAGE_DESKTOP_MAX_CELL = 640;

/** 아주 좁은 화면에서도 칸이 사라지지 않게 하는 바닥. */
export const STAGE_MIN_CELL = 120;

interface ModeSpacing {
  /** 화면 좌우 여백(한쪽). */
  side: number;
  /** 프레임 안쪽 패딩(한쪽). */
  pad: number;
  /** 프레임 테두리가 자리를 먹는 두께(한쪽). 데스크톱은 안쪽 outline이라 0. */
  border: number;
  /** 프레임 아래 여백. */
  bottom: number;
}

/**
 * 여백 — 디자인 파일(대표 수정본 2026-09-19) 실측.
 *   desktop   : 좌우 60 · 패딩 20 · 아래 0 (프레임 아래 변 = 첫 화면 경계 900)
 *   portrait  : 좌우 12 · 테두리 1 · 아래 44 ("가로로 돌리면…" 한 줄 자리)
 *   landscape : 좌우 최소 12 · 테두리 없음 · 아래 12 (메뉴 없음 — D-17 ③)
 */
const SPACING: Record<StageMode, ModeSpacing> = {
  desktop: { side: 60, pad: 20, border: 0, bottom: 0 },
  portrait: { side: 12, pad: 0, border: 1, bottom: 44 },
  landscape: { side: 12, pad: 0, border: 0, bottom: 12 },
};

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

export interface StageLayout {
  mode: StageMode;
  /** row = 좌우 50:50 · column = 상하 2분할. */
  direction: "row" | "column";
  /** 칸 한 변(px, 정사각). */
  cell: number;
  /** 프레임 바깥 크기(px, 패딩·테두리 포함). */
  frameW: number;
  frameH: number;
  pad: number;
}

export function computeStageLayout(input: {
  width: number;
  height: number;
  top: number;
}): StageLayout {
  const mode = stageMode(input.width, input.height);
  const s = SPACING[mode];
  const direction = mode === "portrait" ? "column" : "row";
  const chrome = 2 * (s.pad + s.border);

  const availW = input.width - 2 * s.side - chrome;
  const availH = input.height - input.top - s.bottom - chrome;
  const perCellW = direction === "row" ? availW / 2 : availW;
  const perCellH = direction === "row" ? availH : availH / 2;

  let cell = Math.floor(Math.min(perCellW, perCellH));
  if (mode === "desktop") cell = Math.min(cell, STAGE_DESKTOP_MAX_CELL);
  cell = Math.max(cell, STAGE_MIN_CELL);

  const along = 2 * cell + chrome;
  const across = cell + chrome;
  return {
    mode,
    direction,
    cell,
    frameW: direction === "row" ? along : across,
    frameH: direction === "row" ? across : along,
    pad: s.pad,
  };
}
