/**
 * fullscreenGate — 모바일 가로에서 전체화면으로 들어갈지 판정 (ARENA-1 PR 2a).
 *
 * 원장 "D-17 · 바뀜 (2026-09-20)": 모바일 가로에서 **팬의 첫 탭에** 브라우저 전체화면으로
 * 들어간다(되는 기기만). 세로로 돌리면 자동 해제. 가로 = 집중 모드(D-17 ③)라 주소창도 방해다.
 *
 *   · 브라우저는 **사용자 동작 안에서만** 전체화면을 허용한다 — "돌리면 자동"은 불가(기각).
 *   · "한 번만": 팬이 일부러 전체화면을 나갔는데 다음 탭에서 또 끌고 들어가면 방해다.
 *     그래서 가로 진입 1회당 1번만 요청하고, 세로로 돌아가면 다음 진입을 위해 잊는다.
 *   · 지원하지 않는 기기(아이폰 사파리 — `requestFullscreen` 없음)에는 아무것도 하지 않는다.
 *     대신 무대 칸이 실제로 남는 높이에 맞춰 계산된다(useStageViewport).
 *
 * 순수 모듈이다. 실제 호출(`requestFullscreen`/`exitFullscreen`)과 사용자 동작 안에서
 * 불러야 한다는 제약은 화면(SplitStage)이 맡는다. **탭 규칙(1탭 확대 · 2탭 확정)은
 * 이 판정과 무관하게 그대로다** — 전체화면 요청은 같은 탭에 얹히는 부수 효과일 뿐이다(D-17).
 */
import type { StageMode } from "@/lib/arena/stageLayout";

export type FullscreenAction = "request" | "exit" | "none";

export interface FullscreenGateInput {
  /** 지금 무대 배치 — lib/arena/stageLayout 의 StageMode 그대로. */
  mode: StageMode;
  /** 지금 전체화면인가 (document.fullscreenElement !== null). */
  isFullscreen: boolean;
  /** 이 기기가 전체화면을 지원하는가 (requestFullscreen 존재 여부). */
  supported: boolean;
  /** 이번 가로 진입에서 이미 요청했는가. */
  requestedThisLandscape: boolean;
}

export function fullscreenAction(input: FullscreenGateInput): FullscreenAction {
  const { mode, isFullscreen, supported, requestedThisLandscape } = input;
  if (mode !== "landscape") {
    // 세로로 돌아가면(또는 데스크톱 폭이 되면) 전체화면을 자동으로 푼다.
    return isFullscreen ? "exit" : "none";
  }
  if (!supported || isFullscreen || requestedThisLandscape) return "none";
  return "request";
}

/** "이번 가로 진입에서 요청했는가"의 다음 값. 세로·데스크톱으로 나가면 잊는다. */
export function nextRequestedThisLandscape(
  prev: boolean,
  mode: StageMode,
  action: FullscreenAction,
): boolean {
  if (mode !== "landscape") return false;
  return action === "request" ? true : prev;
}
