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

describe("reduceStage — 데스크톱 (마우스)", () => {
  it("처음엔 아무 쪽도 arm되지 않는다 (자동재생 금지 R4)", () => {
    expect(initialStage).toBe("idle");
    expect(armedSide(initialStage)).toBeNull();
  });

  it("커서가 올라가면 그 칸이 arm된다", () => {
    expect(run("idle", { type: "enter", side: "L" })).toBe("focusL");
    expect(run("idle", { type: "enter", side: "R" })).toBe("focusR");
  });

  it("옆칸으로 옮기면 arm도 옮겨간다", () => {
    expect(run("focusL", { type: "enter", side: "R" })).toBe("focusR");
  });

  it("커서가 빠지면 idle", () => {
    expect(run("focusL", { type: "leave", side: "L" })).toBe("idle");
  });

  it("이미 옆칸으로 옮겨 간 뒤 늦게 온 leave는 무시한다", () => {
    expect(run("focusR", { type: "leave", side: "L" })).toBe("focusR");
  });

  it("마우스 클릭 = 곧바로 선택 확정", () => {
    expect(run("focusL", { type: "press", side: "L", pointer: "mouse" })).toBe("pickedL");
    // 호버 이벤트가 오기 전에 눌려도(자동화·빠른 손) 한 번에 확정된다.
    expect(run("idle", { type: "press", side: "R", pointer: "mouse" })).toBe("pickedR");
  });
});

describe("reduceStage — 모바일 1탭 arm / 2탭 확정 (D-17)", () => {
  it("1탭 = arm, 같은 칸 2탭 = 확정", () => {
    const once = run("idle", { type: "press", side: "L", pointer: "touch" });
    expect(once).toBe("focusL");
    expect(run(once, { type: "press", side: "L", pointer: "touch" })).toBe("pickedL");
  });

  it("arm된 칸이 아닌 옆칸을 탭하면 확정이 아니라 arm이 옮겨간다", () => {
    expect(
      run("focusL", { type: "press", side: "R", pointer: "touch" }),
    ).toBe("focusR");
  });

  it("펜·키보드도 터치와 같은 2단계다", () => {
    expect(run("idle", { type: "press", side: "R", pointer: "pen" })).toBe("focusR");
    expect(
      run("idle", { type: "press", side: "R", pointer: "keyboard" }, { type: "press", side: "R", pointer: "keyboard" }),
    ).toBe("pickedR");
  });

  it("터치 기기의 합성 hover(enter/leave)는 무시한다 — 탭 규칙이 흔들리지 않게", () => {
    expect(run("idle", { type: "enter", side: "L", pointer: "touch" })).toBe("idle");
    expect(run("focusL", { type: "leave", side: "L", pointer: "touch" })).toBe("focusL");
  });
});

describe("reduceStage — 확정 이후 잠금", () => {
  it("확정된 뒤에는 호버·탭이 아무것도 바꾸지 않는다", () => {
    for (const ev of [
      { type: "enter", side: "R" },
      { type: "leave", side: "L" },
      { type: "press", side: "R", pointer: "mouse" },
      { type: "press", side: "L", pointer: "touch" },
    ] as const) {
      expect(run("pickedL", ev)).toBe("pickedL");
      expect(run("loading", ev)).toBe("loading");
    }
  });

  it("확정 유지 시간이 지나 선택을 보내면 loading", () => {
    expect(run("pickedL", { type: "submit" })).toBe("loading");
    expect(run("pickedR", { type: "submit" })).toBe("loading");
  });

  it("idle·focus 에서 submit 은 무시 (확정 없이 선택이 나가지 않는다)", () => {
    expect(run("idle", { type: "submit" })).toBe("idle");
    expect(run("focusL", { type: "submit" })).toBe("focusL");
  });

  it("다음 매치로 넘어가거나 실패하면 settle → idle", () => {
    expect(run("loading", { type: "settle" })).toBe("idle");
    expect(run("pickedR", { type: "settle" })).toBe("idle");
    expect(run("focusL", { type: "settle" })).toBe("idle");
  });
});

describe("reduceStage — 회전은 상태를 건드리지 않는다 (D-17 ①)", () => {
  const all: StageStatus[] = ["idle", "focusL", "focusR", "pickedL", "pickedR", "loading"];
  it.each(all)("%s 에서 orient → 그대로", (s) => {
    expect(run(s, { type: "orient" })).toBe(s);
  });
});

describe("selectors", () => {
  it("armedSide — focus·picked 둘 다 그 쪽 (확정 칸도 커진 채 유지)", () => {
    expect(armedSide("focusL")).toBe("L");
    expect(armedSide("pickedR")).toBe("R");
    expect(armedSide("loading")).toBeNull();
    expect(armedSide("idle")).toBeNull();
  });

  it("pickedSide", () => {
    expect(pickedSide("pickedL")).toBe("L");
    expect(pickedSide("focusL")).toBeNull();
  });

  it("isStageLocked — 확정 이후만 잠긴다", () => {
    expect(isStageLocked("pickedL")).toBe(true);
    expect(isStageLocked("loading")).toBe(true);
    expect(isStageLocked("focusR")).toBe(false);
    expect(isStageLocked("idle")).toBe(false);
  });
});

// ── ARENA-1 PR 2b — 결승 3칸 (원장 D-06 THE FINAL · D-29) ──
describe("3칸 (결승) — 가운데 칸 M 이 늘어난 것 말고는 같은 규칙", () => {
  it("가운데 칸도 호버로 arm 된다", () => {
    expect(reduceStage("idle", { type: "enter", side: "M" })).toBe("focusM");
    expect(armedSide("focusM")).toBe("M");
  });

  it("가운데 칸 마우스 클릭 = 곧바로 확정", () => {
    expect(reduceStage("focusM", { type: "press", side: "M", pointer: "mouse" })).toBe("pickedM");
    expect(pickedSide("pickedM")).toBe("M");
    expect(armedSide("pickedM")).toBe("M");
  });

  it("터치는 1탭 arm · 2탭 확정 (세 칸 모두 같은 규칙 · D-17)", () => {
    const once = reduceStage("idle", { type: "press", side: "M", pointer: "touch" });
    expect(once).toBe("focusM");
    expect(reduceStage(once, { type: "press", side: "M", pointer: "touch" })).toBe("pickedM");
  });

  it("다른 칸을 탭하면 arm 이 옮겨간다 (L → M → R)", () => {
    expect(reduceStage("focusL", { type: "press", side: "M", pointer: "touch" })).toBe("focusM");
    expect(reduceStage("focusM", { type: "press", side: "R", pointer: "touch" })).toBe("focusR");
  });

  it("확정 뒤에는 세 칸 모두 잠긴다", () => {
    expect(isStageLocked("pickedM")).toBe(true);
    expect(reduceStage("pickedM", { type: "enter", side: "L" })).toBe("pickedM");
    expect(reduceStage("pickedM", { type: "submit" })).toBe("loading");
  });

  it("회전해도 가운데 칸 arm 이 유지된다 (D-17 ①)", () => {
    expect(reduceStage("focusM", { type: "orient" })).toBe("focusM");
  });
});
