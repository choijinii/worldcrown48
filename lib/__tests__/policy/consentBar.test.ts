/**
 * COOKIE-1 — 동의 바 배치 판정 (순수).
 *
 * 대표 확정 의도: "동의 바가 무대·배너 자리를 가리지 않게". 끝까지 스크롤하면 배너 자리가
 * 동의 바 위로 완전히 드러나야 한다 → 동의 바가 **보이는 동안만** 페이지 맨 아래에 동의 바의
 * **실제 높이**만큼 여백을 둔다. 사라지면 여백도 0. (무대·BannerSlot·stageLayout 은 그대로 — R7)
 */
import { describe, expect, it } from "vitest";
import { consentBarReserve } from "@/lib/policy/consentBar";

describe("consentBarReserve — 페이지 맨 아래 여백", () => {
  it("보이는 동안은 측정한 높이만큼 (소수는 올림 — 1px 도 겹치지 않게)", () => {
    expect(consentBarReserve({ shown: true, height: 56 })).toBe(56);
    expect(consentBarReserve({ shown: true, height: 131.5 })).toBe(132);
  });

  it("'자세히'를 펼쳐 높이가 바뀌면 여백도 그 높이", () => {
    expect(consentBarReserve({ shown: true, height: 197 })).toBe(197);
  });

  it("동의 바가 사라지면 여백도 0", () => {
    expect(consentBarReserve({ shown: false, height: 56 })).toBe(0);
  });

  it("아직 재지 못했거나 이상한 값이면 0 (여백을 지어내지 않는다)", () => {
    expect(consentBarReserve({ shown: true, height: 0 })).toBe(0);
    expect(consentBarReserve({ shown: true, height: Number.NaN })).toBe(0);
    expect(consentBarReserve({ shown: true, height: -4 })).toBe(0);
  });
});
