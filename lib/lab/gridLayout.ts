/**
 * gridLayout — STEP 2 그리드의 열 수 (LAB-UX-1 A, 대표 확정 2026-08-23).
 *
 * 6열 × 8행 → **8열 × 6행**. 슬롯 폼에서 포지션·이미지 URL 칸이 빠지면서 카드가
 * 좁아졌고, 좁아진 만큼 한 줄에 더 들어간다. 세로 스크롤이 두 행 줄어든다.
 *
 * 리터럴 금지(R5)와 같은 이유로 상수를 여기 한 곳에 둔다 — 그리드·목업 검증·테스트가
 * 같은 수를 본다. 행 수는 계산해서 쓴다(48/8을 손으로 적으면 규모가 바뀔 때 갈라진다).
 */
export const GRID_COLUMNS = 8;

/**
 * 그리드 열 설정(EDITOR-GRID-FIX). `1fr` 의 최소 너비는 내용 최소 폭이라, 줄바꿈 없는 긴
 * 영상 제목 하나가 그 세로줄을 제목 길이만큼 넓혀 페이지가 가로로 넘쳤다(대표 실측
 * 2026-11-10 · 1440 창에서 0번 칸 1841px). 하한을 0 으로 묶어 칸 너비는 열 수로만 정한다.
 */
export const GRID_TEMPLATE_COLUMNS = `repeat(${GRID_COLUMNS}, minmax(0, 1fr))`;

/** 총 N칸을 GRID_COLUMNS 열로 깔았을 때의 행 수. */
export function gridRows(total: number): number {
  return Math.ceil(total / GRID_COLUMNS);
}
