/**
 * PITCH-2 PR A · 추가 지시 ① — WORLD PRESS 열은 loadWorldPress 하나로만 읽고, 지금은 언제나 빈 목록.
 * TIOZ.AI 띠는 상수로 꺼 둔다(지시서 7절).
 */
import { describe, expect, it } from "vitest";
import { loadWorldPress, WORLD_PRESS_MEDIA_NAME } from "@/lib/pitch/worldPress";
import { TIOZ_BAND_ENABLED } from "@/lib/pitch/tiozBand";

describe("loadWorldPress", () => {
  it.each([null, "KPOP", "CREATOR"])("탭 %s → 빈 목록(외신 개편 전)", async (cat) => {
    await expect(loadWorldPress(cat)).resolves.toEqual([]);
  });
  it("매체 이름 = TIOZ(대표 11/18 · 3언어 공통)", () => {
    expect(WORLD_PRESS_MEDIA_NAME).toBe("TIOZ");
  });
});

describe("TIOZ.AI 띠", () => {
  it("기본 꺼짐(상수 · 환경변수 아님)", () => {
    expect(TIOZ_BAND_ENABLED).toBe(false);
  });
});
