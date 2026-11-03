/**
 * ARENA-1 PR 1 — VS 스플릿 무대 상태 머신 (원장 D-11 · D-17).
 *
 * idle | focusL | focusR | pickedL | pickedR | loading
 *
 *   · 데스크톱: 커서가 올라가면 arm(focus), 클릭 = 선택 확정 (버튼 없음)
 *   · 모바일: 1탭 = arm(확대·재생) / 2탭 = 확정 — 세로·가로 동일 (D-17)
 *   · 회전은 배치만 바꾼다 — 진행 중인 상태를 건드리지 않는다 (D-17 ①)
 */
import { describe, expect, it } from "vitest";
import {
  armedSide,
  initialStage,
  isStageLocked,
  pickedSide,
  reduceStage,
  type StageStatus,
} from "@/lib/arena/stageState";

const run = (from: StageStatus, ...events: Parameters<typeof reduceStage>[1][]) =>
  events.reduce(reduceStage, from);

describe("reduceStage — 포커스 (D-76)", () => {
  it("처음엔 아무 쪽도 arm되지 않는다 (자동재생 금지 R4)", () => {
    expect(armedSide(initialStage)).toBeNull();
  });

  it("커서가 올라가면 그 칸이 arm되고, 옮기면 따라가고, 빠지면 idle", () => {
    const l = reduceStage("idle", { type: "enter", side: "L", pointer: "mouse" });
    expect(l).toBe("focusL");
    expect(reduceStage(l, { type: "enter", side: "R", pointer: "mouse" })).toBe("focusR");
    expect(reduceStage(l, { type: "leave", side: "L", pointer: "mouse" })).toBe("idle");
  });

  it("이미 옆칸으로 옮겨 간 뒤 늦게 온 leave는 무시한다", () => {
    expect(reduceStage("focusR", { type: "leave", side: "L", pointer: "mouse" })).toBe("focusR");
  });

  it("터치 기기의 합성 hover는 무시한다", () => {
    expect(reduceStage("idle", { type: "enter", side: "L", pointer: "touch" })).toBe("idle");
    expect(reduceStage("focusL", { type: "leave", side: "L", pointer: "touch" })).toBe("focusL");
  });

  it("영상 상자 탭 = 그 칸 재생 · 옆 상자 탭 = 옮겨 간다 · 확정은 없다", () => {
    expect(reduceStage("idle", { type: "tap", side: "L" })).toBe("focusL");
    expect(reduceStage("focusL", { type: "tap", side: "R" })).toBe("focusR");
    expect(reduceStage("focusL", { type: "tap", side: "L" })).toBe("focusL");
  });

  it("결승 가운데 칸도 같다", () => {
    expect(reduceStage("focusL", { type: "tap", side: "M" })).toBe("focusM");
  });
});

describe("reduceStage — 이름 버튼 한 번에 확정 (D-76)", () => {
  it.each(["idle", "focusL", "focusR"] as const)("%s 에서 눌러도 곧바로 확정", (from) => {
    expect(reduceStage(from, { type: "press", side: "L" })).toBe("pickedL");
  });

  it("결승 세 칸 모두 같다", () => {
    expect(reduceStage("idle", { type: "press", side: "M" })).toBe("pickedM");
  });
});

describe("reduceStage — 확정 이후", () => {
  it("확정된 뒤에는 호버·탭·버튼이 아무것도 바꾸지 않는다", () => {
    const events = [
      { type: "enter", side: "R", pointer: "mouse" },
      { type: "leave", side: "L", pointer: "mouse" },
      { type: "tap", side: "R" },
      { type: "press", side: "R" },
    ] as const;
    for (const e of events) expect(reduceStage("pickedL", e)).toBe("pickedL");
  });

  it("확정 유지 시간이 지나면 loading · 확정 없이는 나가지 않는다", () => {
    expect(reduceStage("pickedL", { type: "submit" })).toBe("loading");
    expect(reduceStage("idle", { type: "submit" })).toBe("idle");
    expect(reduceStage("focusL", { type: "submit" })).toBe("focusL");
  });

  it("다음 매치·실패 = settle → idle · 회전은 상태를 건드리지 않는다", () => {
    expect(reduceStage("loading", { type: "settle" })).toBe("idle");
    expect(reduceStage("focusM", { type: "orient" })).toBe("focusM");
  });
});

describe("selectors", () => {
  it("armedSide — focus·picked 둘 다 그 쪽", () => {
    expect(armedSide("focusL")).toBe("L");
    expect(armedSide("pickedR")).toBe("R");
    expect(armedSide("loading")).toBeNull();
  });

  it("pickedSide · isStageLocked", () => {
    expect(pickedSide("pickedM")).toBe("M");
    expect(pickedSide("focusL")).toBeNull();
    expect(isStageLocked("loading")).toBe(true);
    expect(isStageLocked("pickedL")).toBe(true);
    expect(isStageLocked("focusL")).toBe(false);
  });
});
