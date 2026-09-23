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
import { bannerVariant, BANNER_SIZES } from "@/lib/banner/bannerVariant";

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
