/**
 * stageState — 무대의 조작 상태 머신 (ARENA-1 PR 1 · PR 2b · 원장 D-11 · D-17 · D-06).
 *
 * 칸이 둘인 매치(L·R)와 셋인 결승(L·M·R)이 **같은 규칙**을 쓴다 — 가운데 칸이 하나 늘어난 것
 * 말고는 다르지 않다(THE FINAL 은 1:1 대결이 아니라 셋 중 하나를 고르는 자리 · D-06).
 *
 *   idle ─enter/press─▶ focusL|focusR ─press(확정)─▶ pickedL|pickedR ─submit─▶ loading
 *     ▲                                                                          │
 *     └──────────────────────────── settle (다음 매치 · 실패) ◀───────────────────┘
 *
 * 규칙 (원장 문장 그대로):
 *   · 데스크톱 — 커서가 올라가면 그 칸이 커진다(arm). 커진 칸을 **클릭하면 선택 확정**.
 *     선택 버튼 없음 (D-11 조작 ①·④).
 *   · 모바일 — **1탭 = 확대·재생 / 2탭 = 확정. 세로·가로 동일** (D-17 "바뀌지 않는 것").
 *   · 회전은 화면 배치만 바꾼다 — 진행 중인 상태를 건드리지 않는다 (D-17 ①).
 *
 * 순수 모듈이다. 타이머(확정 유지 520ms)·선택 전송·재생기 마운트는 화면(SplitStage)이
 * 이 상태를 읽고 한다. 선택 엔진(onVote·roundProgress·voteStore)은 여기서 모른다 (R1).
 */

/** L = 왼쪽(모바일 세로 위) · M = 가운데(결승에만) · R = 오른쪽(모바일 세로 아래). */
export type StageSideKey = "L" | "M" | "R";

export type StageStatus =
  | "idle"
  | "focusL"
  | "focusM"
  | "focusR"
  | "pickedL"
  | "pickedM"
  | "pickedR"
  | "loading";

/**
 * 누른 도구. `mouse` 만 한 번에 확정한다 — 마우스는 누르기 전에 이미 호버로 arm을 거쳤다.
 * 터치·펜·키보드는 "무엇이 재생되는지 먼저 보고" 두 번째에 확정한다.
 */
export type StagePointer = "mouse" | "touch" | "pen" | "keyboard";

export type StageEvent =
  /** 커서가 칸에 들어옴. 터치 기기가 흘리는 합성 hover는 pointer로 걸러진다. */
  | { type: "enter"; side: StageSideKey; pointer?: StagePointer }
  | { type: "leave"; side: StageSideKey; pointer?: StagePointer }
  /** 클릭·탭·Enter. */
  | { type: "press"; side: StageSideKey; pointer: StagePointer }
  /** 확정 유지 시간이 지나 선택을 서버로 보냄. */
  | { type: "submit" }
  /** 다음 매치가 들어왔거나 선택이 실패함 — 처음으로. */
  | { type: "settle" }
  /** 기기 회전 (세로 ⇄ 가로). */
  | { type: "orient" };

export const initialStage: StageStatus = "idle";

const focusOf = (side: StageSideKey): StageStatus => `focus${side}` as StageStatus;
const pickOf = (side: StageSideKey): StageStatus => `picked${side}` as StageStatus;

export function armedSide(status: StageStatus): StageSideKey | null {
  const m = /^(?:focus|picked)([LMR])$/.exec(status);
  return m ? (m[1] as StageSideKey) : null;
}

export function pickedSide(status: StageStatus): StageSideKey | null {
  const m = /^picked([LMR])$/.exec(status);
  return m ? (m[1] as StageSideKey) : null;
}

/** 확정 이후 — 호버·탭이 더는 아무것도 바꾸지 않는다. */
export function isStageLocked(status: StageStatus): boolean {
  return status === "loading" || pickedSide(status) !== null;
}

export function reduceStage(status: StageStatus, event: StageEvent): StageStatus {
  switch (event.type) {
    case "orient":
      return status;
    case "settle":
      return "idle";
    case "submit":
      return pickedSide(status) ? "loading" : status;
    case "enter":
      if (isStageLocked(status) || (event.pointer && event.pointer !== "mouse")) return status;
      return focusOf(event.side);
    case "leave":
      if (isStageLocked(status) || (event.pointer && event.pointer !== "mouse")) return status;
      return armedSide(status) === event.side ? "idle" : status;
    case "press":
      if (isStageLocked(status)) return status;
      if (event.pointer === "mouse") return pickOf(event.side);
      return armedSide(status) === event.side ? pickOf(event.side) : focusOf(event.side);
  }
}
