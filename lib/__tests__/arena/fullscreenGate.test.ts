/**
 * ARENA-1 PR 2a — 모바일 가로 첫 탭 전체화면 판정 (원장 "D-17 · 바뀜 2026-09-20").
 *
 *   · 가로 + 되는 기기 + 아직 전체화면 아님 + 이번 가로 진입에서 아직 요청 안 함 → request
 *   · 세로·데스크톱으로 바뀌었는데 전체화면 → exit (자동 해제)
 *   · 그 외 none
 *
 * "한 번만"의 의도: 팬이 일부러 전체화면을 나갔는데 다음 탭에서 또 끌고 들어가면 방해다.
 * 그래서 가로 진입 1회당 1번만 요청하고, 세로로 돌아가면 다음 진입을 위해 초기화한다.
 * 브라우저는 사용자 동작(탭) 안에서만 전체화면을 허용하므로 "돌리면 자동"은 불가(D-17 바뀜).
 */
import { describe, expect, it } from "vitest";
import {
  fullscreenAction,
  nextRequestedThisLandscape,
  type FullscreenGateInput,
} from "@/lib/arena/fullscreenGate";

const input = (over: Partial<FullscreenGateInput> = {}): FullscreenGateInput => ({
  mode: "landscape",
  isFullscreen: false,
  supported: true,
  requestedThisLandscape: false,
  ...over,
});

describe("fullscreenAction — 가로 첫 탭", () => {
  it("가로 · 지원 · 아직 아님 · 이번 진입 첫 탭 → request", () => {
    expect(fullscreenAction(input())).toBe("request");
  });

  it("같은 가로 진입에서 두 번째 탭 → none (한 번만)", () => {
    expect(fullscreenAction(input({ requestedThisLandscape: true }))).toBe("none");
  });

  it("이미 전체화면이면 → none", () => {
    expect(fullscreenAction(input({ isFullscreen: true }))).toBe("none");
  });

  it("지원하지 않는 기기(아이폰 사파리)는 아무것도 하지 않는다 → none", () => {
    expect(fullscreenAction(input({ supported: false }))).toBe("none");
  });
});

describe("fullscreenAction — 세로·데스크톱", () => {
  it("세로에서는 요청하지 않는다", () => {
    expect(fullscreenAction(input({ mode: "portrait" }))).toBe("none");
  });

  it("데스크톱에서는 요청하지 않는다", () => {
    expect(fullscreenAction(input({ mode: "desktop" }))).toBe("none");
  });

  it("세로로 돌렸는데 전체화면이면 → exit (자동 해제)", () => {
    expect(fullscreenAction(input({ mode: "portrait", isFullscreen: true }))).toBe("exit");
  });

  it("데스크톱으로 바뀌었는데 전체화면이면 → exit", () => {
    expect(fullscreenAction(input({ mode: "desktop", isFullscreen: true }))).toBe("exit");
  });

  it("이미 요청 기록이 남아 있어도 해제는 해제다", () => {
    expect(
      fullscreenAction(input({ mode: "portrait", isFullscreen: true, requestedThisLandscape: true })),
    ).toBe("exit");
  });
});

describe("nextRequestedThisLandscape — '이번 가로 진입' 기억", () => {
  it("가로에서 요청했으면 기록한다", () => {
    expect(nextRequestedThisLandscape(false, "landscape", "request")).toBe(true);
  });

  it("가로에서 아무것도 안 했으면 그대로", () => {
    expect(nextRequestedThisLandscape(true, "landscape", "none")).toBe(true);
    expect(nextRequestedThisLandscape(false, "landscape", "none")).toBe(false);
  });

  it("세로·데스크톱으로 돌아가면 초기화한다 — 다시 가로로 오면 또 한 번 요청", () => {
    expect(nextRequestedThisLandscape(true, "portrait", "none")).toBe(false);
    expect(nextRequestedThisLandscape(true, "desktop", "exit")).toBe(false);
    expect(nextRequestedThisLandscape(true, "portrait", "exit")).toBe(false);
  });

  it("세로 → 가로 → 세로 → 가로: 가로 진입마다 딱 한 번 request", () => {
    let requested = false;
    const seq: Array<{ mode: FullscreenGateInput["mode"]; fs: boolean }> = [
      { mode: "landscape", fs: false }, // 첫 탭
      { mode: "landscape", fs: true }, // 두 번째 탭
      { mode: "portrait", fs: true }, // 세로로 돌림 → 해제
      { mode: "landscape", fs: false }, // 다시 가로, 첫 탭
    ];
    const actions = seq.map(({ mode, fs }) => {
      const action = fullscreenAction({
        mode,
        isFullscreen: fs,
        supported: true,
        requestedThisLandscape: requested,
      });
      requested = nextRequestedThisLandscape(requested, mode, action);
      return action;
    });
    expect(actions).toEqual(["request", "none", "exit", "request"]);
  });
});
