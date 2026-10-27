/**
 * bannerVariant — 배너 자리의 크기 변형 (ARENA-1 PR 2b · 원장 D-21 바뀜 2026-09-21).
 *
 * 배너 자리 크기를 **광고 크기와 같게** 둔다 — 자리와 광고가 같은 크기라 빈 테두리가 없다.
 *   데스크톱   970×90  (구글 애드센스 대형 리더보드)
 *   모바일 세로 320×100 (큰 모바일 배너)
 *   모바일 가로  없음   (가로 = 집중 모드 · D-17 ③)
 *
 * "1320×140 자리 안에 970×90"은 기각됐다(낭비). 라운드 전환 화면에는 배너가 없다(D-26).
 */
import type { StageMode } from "@/lib/arena/stageLayout";

export type BannerVariant = "desktop" | "mobile";

export const BANNER_SIZES: Record<BannerVariant, { width: number; height: number }> = {
  desktop: { width: 970, height: 90 },
  mobile: { width: 320, height: 100 },
};

/**
 * 아레나 홈 광고 칸 (원장 D-69) — 배너 자리와 따로 센다(배너는 970×90 / 320×100 둘뿐).
 *   rect  300×250  오른쪽 뉴스 칸 안 (애드센스 "중간 사각형")
 *   strip 300×90   가로 띠 오른쪽 · 데스크톱만 (구글 표준 목록 밖 — 붙일 때 반응형 광고)
 */
export type AdBoxVariant = "rect" | "strip";

export const AD_BOX_SIZES: Record<AdBoxVariant, { width: number; height: number }> = {
  rect: { width: 300, height: 250 },
  strip: { width: 300, height: 90 },
};

/** 이 배치에서 배너를 어떤 크기로 그리는가. null = 그리지 않는다. */
export function bannerVariant(mode: StageMode): BannerVariant | null {
  if (mode === "desktop") return "desktop";
  if (mode === "portrait") return "mobile";
  return null;
}

/** 휴대폰 가로로 보는 높이의 상한 — 이보다 낮은 가로 화면은 휴대폰 가로다(844×390 · 932×430). */
const PHONE_LANDSCAPE_MAX_HEIGHT = 500;
/** 이 폭 이하 = 휴대폰 크기(320×100). useBannerVariant 와 같은 경계 — 메뉴바가 접히는 폭. */
const MOBILE_MAX_WIDTH = 860;

/**
 * 무대가 아닌 화면(피치 · THUMB-1 PR 2)의 배너 크기. 무대처럼 칸 계산이 없으니 창 크기만 본다.
 * 휴대폰 가로 = 없음(D-21) · 좁은 화면 = 320×100 · 그 밖 = 970×90.
 */
export function pageBannerVariant(width: number, height: number): BannerVariant | null {
  if (width > height && height <= PHONE_LANDSCAPE_MAX_HEIGHT) return null;
  return width <= MOBILE_MAX_WIDTH ? "mobile" : "desktop";
}
