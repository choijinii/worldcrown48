/**
 * ARENA-1 PR 2b — 배너 자리 크기 (원장 D-21 바뀜 2026-09-21 · 구글 광고 표준).
 *
 *   데스크톱   970×90  (무대 프레임 아래 가운데 정렬 · 대형 리더보드)
 *   모바일 세로 320×100 (큰 모바일 배너)
 *   모바일 가로  없음   (D-17 ③ 집중 모드 · D-21 바뀜 09-19 계승)
 *   라운드 전환  없음   (약 2초 전환 화면 · D-26)
 *
 * 자리와 광고가 같은 크기라 빈 테두리가 없다(D-21 정의). 옛 1320×140 · 폭 366 은 폐기.
 */
import { describe, expect, it } from "vitest";
import { AD_BOX_SIZES, bannerVariant, BANNER_SIZES, pageBannerVariant } from "@/lib/banner/bannerVariant";

describe("bannerVariant — 어느 화면에 어떤 크기", () => {
  it("데스크톱 = 970×90", () => {
    expect(bannerVariant("desktop")).toBe("desktop");
    expect(BANNER_SIZES.desktop).toEqual({ width: 970, height: 90 });
  });

  it("모바일 세로 = 320×100", () => {
    expect(bannerVariant("portrait")).toBe("mobile");
    expect(BANNER_SIZES.mobile).toEqual({ width: 320, height: 100 });
  });

  it("모바일 가로 = 배너 없음", () => {
    expect(bannerVariant("landscape")).toBeNull();
  });

  it("광고 표준 크기 그대로 — 자리 안에 광고를 넣지 않는다 (D-21 아니라고 한 것)", () => {
    // 1320×140 · 366×문구높이 는 폐기된 값이다.
    for (const s of Object.values(BANNER_SIZES)) {
      expect([970, 320]).toContain(s.width);
      expect([90, 100]).toContain(s.height);
    }
  });
});

// THUMB-1 PR 2 · 원장 D-21 · D-55 — 무대가 아닌 화면(피치)의 배너 크기.
// 무대처럼 칸 계산이 없으니 폭·높이만 본다: 휴대폰 가로(높이 ≤ 500)는 없음 · 폭 ≤ 860 은
// 320×100 · 그 밖은 970×90. 860 은 기존 useBannerVariant 와 같은 경계(메뉴바가 접히는 폭).
describe("pageBannerVariant — 피치 배너 크기 (D-21)", () => {
  it("데스크톱 1440 · 태블릿 가로 1180×820 = 970×90", () => {
    expect(pageBannerVariant(1440, 900)).toBe("desktop");
    expect(pageBannerVariant(1180, 820)).toBe("desktop");
  });
  it("모바일 세로 390 · 태블릿 세로 834 = 320×100", () => {
    expect(pageBannerVariant(390, 844)).toBe("mobile");
    expect(pageBannerVariant(834, 1194)).toBe("mobile");
  });
  it("모바일 가로(844×390 · 932×430) = 없음", () => {
    expect(pageBannerVariant(844, 390)).toBeNull();
    expect(pageBannerVariant(932, 430)).toBeNull();
  });
  it("작은 데스크톱 창(1000×800 가로)은 휴대폰 가로가 아니다 = 970×90", () => {
    expect(pageBannerVariant(1000, 800)).toBe("desktop");
  });
});

// ARENA-2 · 원장 D-69 — 아레나 홈 광고 칸. 배너(970×90 / 320×100)와 따로 둔다.
describe("AD_BOX_SIZES — 아레나 홈 광고 칸 (D-69)", () => {
  it("오른쪽 칸 = 300×250 (애드센스 중간 사각형) · 띠 옆 = 300×90", () => {
    expect(AD_BOX_SIZES.rect).toEqual({ width: 300, height: 250 });
    expect(AD_BOX_SIZES.strip).toEqual({ width: 300, height: 90 });
  });
});
