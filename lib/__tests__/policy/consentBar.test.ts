/**
 * COOKIE-1 — 동의 바 배치 판정 (순수).
 *
 * 대표 확정 의도: "동의 바가 무대·배너 자리를 가리지 않게". 끝까지 스크롤하면 배너 자리가
 * 동의 바 위로 완전히 드러나야 한다 → 동의 바가 **보이는 동안만** 페이지 맨 아래에 동의 바의
 * **실제 높이**만큼 여백을 둔다. 사라지면 여백도 0. (무대·BannerSlot·stageLayout 은 그대로 — R7)
 */
import { describe, expect, it } from "vitest";
import { consentBarReserve, shouldShowConsentBar } from "@/lib/policy/consentBar";
import { stageMode } from "@/lib/arena/stageLayout";

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

/**
 * §9 게이트 2 — 모바일 가로(폭 < 1024 · 가로가 세로보다 김 = stageMode "landscape")에서는
 * 동의 바를 보이지 않는다. 동의를 **미루는 것**이지 가정하는 것이 아니다(R2) — 그동안은
 * 필수 쿠키만. 세로로 돌리면 다시 보인다. 가로 판정은 stageLayout 을 가져다 쓰기만 한다(R7).
 */
describe("shouldShowConsentBar — 모바일 가로는 미룬다", () => {
  it("가로(landscape)면 보이지 않는다", () => {
    expect(shouldShowConsentBar({ mode: "landscape" })).toBe(false);
  });

  it("세로·데스크톱이면 보인다", () => {
    expect(shouldShowConsentBar({ mode: "portrait" })).toBe(true);
    expect(shouldShowConsentBar({ mode: "desktop" })).toBe(true);
  });

  it("휴대폰 가로 844×390 → 숨김, 세로로 돌린 390×844 → 보임", () => {
    expect(shouldShowConsentBar({ mode: stageMode(844, 390) })).toBe(false);
    expect(shouldShowConsentBar({ mode: stageMode(390, 844) })).toBe(true);
  });

  it("폭 1024 경계 — 1024 가로 창은 데스크톱이라 보이고, 1023 가로는 숨김", () => {
    expect(shouldShowConsentBar({ mode: stageMode(1024, 600) })).toBe(true);
    expect(shouldShowConsentBar({ mode: stageMode(1023, 600) })).toBe(false);
  });
});
