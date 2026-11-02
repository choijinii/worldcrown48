/**
 * 배너 자리 크기 — 원장 D-74 (2026-11-01 · D-21 · D-55 를 바꿈).
 *
 *   자리에 970 이 들어가면 970×90 · 안 들어가면 728×90 · 그것도 안 들어가면(휴대폰) 320×100.
 *   세 크기 모두 구글 애드센스 표준. 727×90 같은 비표준 축소는 없다.
 *   모바일 가로 = 없음 (D-17 ③ 집중 모드 · D-21 바뀜 09-19 계승) · 라운드 전환 = 없음 (D-26).
 *
 * 크기는 공용 BannerSlot 이 **자기 자리 폭**(컨테이너 쿼리)으로 고른다 — 화면마다 따로 정하지 않는다.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  AD_BOX_SIZES,
  bannerVariant,
  LEADERBOARD_SIZES,
  leaderboardSize,
  pageBannerVariant,
} from "@/lib/banner/bannerVariant";

/** 구글 애드센스 표준 크기 중 배너 자리가 쓰는 셋. */
const ADSENSE = ["970x90", "728x90", "320x100"];
const key = (s: { width: number; height: number }) => `${s.width}x${s.height}`;

describe("leaderboardSize — 자리 폭에 맞는 표준 크기 하나 (D-74)", () => {
  it("970 이 들어가면 970×90", () => {
    expect(leaderboardSize(1320)).toEqual({ width: 970, height: 90 });
    expect(leaderboardSize(970)).toEqual({ width: 970, height: 90 });
  });
  it("970 이 안 들어가면 728×90 — 320×100 으로 내리지 않는다", () => {
    expect(leaderboardSize(969)).toEqual({ width: 728, height: 90 });
    expect(leaderboardSize(800)).toEqual({ width: 728, height: 90 });
    expect(leaderboardSize(728)).toEqual({ width: 728, height: 90 });
  });
  it("728 도 안 들어가면(휴대폰) 320×100", () => {
    expect(leaderboardSize(727)).toEqual({ width: 320, height: 100 });
    expect(leaderboardSize(358)).toEqual({ width: 320, height: 100 });
  });
  it("어떤 폭에서도 세 표준 크기 중 하나 — 727×90 같은 중간 크기는 없다", () => {
    for (let w = 280; w <= 1600; w += 1) expect(ADSENSE).toContain(key(leaderboardSize(w)));
    expect(LEADERBOARD_SIZES.map(key)).toEqual(ADSENSE);
  });
});

describe("bannerVariant — 매치 무대에 배너가 있나", () => {
  it("데스크톱 · 모바일 세로 = 있음(크기는 자리 폭이 정함)", () => {
    expect(bannerVariant("desktop")).toBe("leaderboard");
    expect(bannerVariant("portrait")).toBe("leaderboard");
  });
  it("모바일 가로 = 배너 없음", () => {
    expect(bannerVariant("landscape")).toBeNull();
  });
});

describe("pageBannerVariant — 무대가 아닌 화면", () => {
  it("데스크톱 · 태블릿 · 휴대폰 세로 = 있음", () => {
    for (const [w, h] of [[1440, 900], [1180, 820], [1024, 768], [768, 1024], [390, 844], [1000, 800]]) {
      expect(pageBannerVariant(w, h)).toBe("leaderboard");
    }
  });
  it("모바일 가로(844×390 · 932×430) = 없음", () => {
    expect(pageBannerVariant(844, 390)).toBeNull();
    expect(pageBannerVariant(932, 430)).toBeNull();
  });
});

// 크기 규칙이 CSS 한 곳(공용 부품)에만 있는지 — 자리마다 970 을 따로 박으면 727×90 이 다시 생긴다.
describe("배너 크기는 공용 BannerSlot 한 곳에서만 (D-74 · D-21 공통 부품 하나)", () => {
  const css = readFileSync("components/layout/bannerSlot.module.css", "utf8");
  it("컨테이너 쿼리 경계 = 728 · 970", () => {
    expect(css).toMatch(/@container[^{]*\(min-width:\s*728px\)/);
    expect(css).toMatch(/@container[^{]*\(min-width:\s*970px\)/);
    expect(css).toMatch(/--arena-banner-w-mid/);
  });
  it("다른 CSS 는 배너 폭 토큰을 쓰지 않는다", () => {
    const files: string[] = [];
    const walk = (dir: string) => {
      for (const f of readdirSync(dir)) {
        const p = join(dir, f);
        if (statSync(p).isDirectory()) walk(p);
        else if (p.endsWith(".css")) files.push(p);
      }
    };
    walk("components");
    walk("app");
    const offenders = files.filter(
      (f) =>
        !f.endsWith("components/layout/bannerSlot.module.css") &&
        !f.endsWith("app/arena_stage_tokens.css") &&
        /var\(--arena-banner-[wh]/.test(readFileSync(f, "utf8")),
    );
    expect(offenders).toEqual([]);
  });
});

// ARENA-2 · 원장 D-69 — 아레나 홈 광고 칸. 배너와 따로 센다.
describe("AD_BOX_SIZES — 아레나 홈 광고 칸 (D-69)", () => {
  it("오른쪽 칸 = 300×250 (애드센스 중간 사각형) · 띠 옆 = 300×90", () => {
    expect(AD_BOX_SIZES.rect).toEqual({ width: 300, height: 250 });
    expect(AD_BOX_SIZES.strip).toEqual({ width: 300, height: 90 });
  });
});
