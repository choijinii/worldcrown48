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
 *   · 데스크톱 — 커서가 영상 상자에 올라가면 그 칸이 커지고 재생된다(arm).
 *   · 휴대폰 — 영상 상자를 누르면 그 칸이 커지고 재생된다(tap). 세로·가로 동일.
 *   · 확정은 어디서든 **이름 버튼 한 번**이다(D-76 — 플레이어 안 클릭은 유튜브만 받는다).
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

/** 도구. 터치 기기가 흘리는 합성 hover 를 거르는 데만 쓴다 — 확정은 도구와 상관없이 한 번이다. */
export type StagePointer = "mouse" | "touch" | "pen" | "keyboard";

export type StageEvent =
  /** 커서가 칸에 들어옴. 터치 기기가 흘리는 합성 hover는 pointer로 걸러진다. */
  | { type: "enter"; side: StageSideKey; pointer?: StagePointer }
  | { type: "leave"; side: StageSideKey; pointer?: StagePointer }
  /** 영상 상자를 눌렀다(휴대폰) — 그 칸을 재생한다. */
  | { type: "tap"; side: StageSideKey }
  /** 이름 버튼을 눌렀다 — 곧바로 확정. */
  | { type: "press"; side: StageSideKey }
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

/** 확정부터 서버 응답까지 고른 칸. `loading` 상태는 칸을 모르므로 화면이 기억한 값을 받는다. */
export function heldSide(status: StageStatus, lastPick: StageSideKey | null): StageSideKey | null {
  return pickedSide(status) ?? (status === "loading" ? lastPick : null);
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
    case "tap":
      return isStageLocked(status) ? status : focusOf(event.side);
    case "press":
      return isStageLocked(status) ? status : pickOf(event.side);
  }
}
