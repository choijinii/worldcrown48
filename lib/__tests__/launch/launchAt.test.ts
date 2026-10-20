/**
 * THUMB-1 PR 2 · 원장 D-59 — 런칭 시각 설정값 하나.
 *
 * 런칭 시각 = D-52 의 런칭일(11/26 목) 0시 KST. 이 값은 코드 설정에만 있고 화면 글자에는
 * 날짜를 쓰지 않는다(D-52 "대외 문안에는 날짜를 쓰지 않는다"). 런칭이 밀리면 이 한 줄만 바꾼다.
 */
import { describe, expect, it } from "vitest";
import { LAUNCH_AT_MS, isBeforeLaunch } from "@/lib/launch/launchAt";

describe("LAUNCH_AT_MS — D-52 런칭일", () => {
  it("2026-11-26 00:00 KST (= 11-25 15:00 UTC)", () => {
    expect(LAUNCH_AT_MS).toBe(Date.UTC(2026, 10, 25, 15, 0, 0));
  });
});

describe("isBeforeLaunch — 시각을 주입해서 판정", () => {
  it("런칭 1ms 전 = 런칭 전", () => {
    expect(isBeforeLaunch(LAUNCH_AT_MS - 1)).toBe(true);
  });
  it("런칭 시각 정각부터 = 런칭 뒤", () => {
    expect(isBeforeLaunch(LAUNCH_AT_MS)).toBe(false);
    expect(isBeforeLaunch(LAUNCH_AT_MS + 86_400_000)).toBe(false);
  });
  it("기준 시각도 주입할 수 있다(런칭이 밀릴 때 값 하나만 바뀐다)", () => {
    expect(isBeforeLaunch(100, 200)).toBe(true);
    expect(isBeforeLaunch(200, 200)).toBe(false);
  });
});
