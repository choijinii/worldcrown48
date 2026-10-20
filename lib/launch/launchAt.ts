/**
 * 런칭 시각 — 설정값 하나 (THUMB-1 PR 2 · 원장 D-59).
 *
 * = D-52 의 런칭일 11/26(목) 0시 KST. 화면 글자에는 날짜를 쓰지 않는다(D-52 "대외 문안에는
 * 날짜를 쓰지 않는다") — 이 값은 "런칭 전/뒤"를 가르는 데만 쓴다. 런칭이 밀리면(D-52 버퍼 →
 * 12/03) 이 한 줄만 바꾼다. 런칭 날 사람이 끄는 작업은 없다.
 */
export const LAUNCH_AT_MS = Date.parse("2026-11-26T00:00:00+09:00");

export function isBeforeLaunch(nowMs: number, launchAtMs: number = LAUNCH_AT_MS): boolean {
  return nowMs < launchAtMs;
}
