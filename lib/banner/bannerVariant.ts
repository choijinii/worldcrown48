/**
 * bannerVariant — 배너 자리의 크기 (원장 D-74 · 2026-11-01 · D-21 · D-55 를 바꿈).
 *
 * 배너 자리 크기를 **광고 크기와 같게** 둔다 — 자리와 광고가 같은 크기라 빈 테두리가 없다.
 * 크기는 그 자리에 들어가는 가장 큰 구글 애드센스 표준 하나:
 *   970×90  (대형 리더보드) — 970 이 들어가면
 *   728×90  (리더보드)     — 970 이 안 들어가면
 *   320×100 (큰 모바일 배너) — 728 도 안 들어가면(휴대폰)
 *   모바일 가로 = 없음 (집중 모드 · D-17 ③)
 * 727×90 같은 비표준 축소는 쓰지 않는다. 실제 고르기는 공용 BannerSlot 의 CSS 컨테이너 쿼리가
 * 자리 폭으로 한다(첫 화면부터 맞는 크기 · 하이드레이션 깜빡임 없음) — 여기 표와 같은 경계.
 */
import type { StageMode } from "@/lib/arena/stageLayout";

/** 가로 배너 자리 하나(크기는 자리 폭이 정한다). 아레나 홈 광고 칸은 따로 — AdBoxVariant. */
export type BannerVariant = "leaderboard";

/** 큰 것부터. 들어가는 첫 크기를 쓴다. 경계는 components/layout/bannerSlot.module.css 와 같다. */
export const LEADERBOARD_SIZES = [
  { width: 970, height: 90 },
  { width: 728, height: 90 },
  { width: 320, height: 100 },
] as const;

export type LeaderboardSize = (typeof LEADERBOARD_SIZES)[number];

/** 자리 폭 `available` 에 들어가는 가장 큰 표준 크기. 320 도 안 들어가면 320(넘치는 쪽은 자리 CSS 가 자른다). */
export function leaderboardSize(available: number): LeaderboardSize {
  return LEADERBOARD_SIZES.find((s) => s.width <= available) ?? LEADERBOARD_SIZES[LEADERBOARD_SIZES.length - 1];
}

/**
 * 아레나 홈 광고 칸 (원장 D-69) — 배너 자리와 따로 센다(배너는 970×90 / 728×90 / 320×100).
 *   rect  300×250  오른쪽 뉴스 칸 안 (애드센스 "중간 사각형")
 *   strip 300×90   가로 띠 오른쪽 · 데스크톱만 (구글 표준 목록 밖 — 붙일 때 반응형 광고)
 */
export type AdBoxVariant = "rect" | "strip";

export const AD_BOX_SIZES: Record<AdBoxVariant, { width: number; height: number }> = {
  rect: { width: 300, height: 250 },
  strip: { width: 300, height: 90 },
};

/** 매치 무대에 배너를 그리나. null = 그리지 않는다(휴대폰 가로). */
export function bannerVariant(mode: StageMode): BannerVariant | null {
  return mode === "landscape" ? null : "leaderboard";
}

/** 휴대폰 가로로 보는 높이의 상한 — 이보다 낮은 가로 화면은 휴대폰 가로다(844×390 · 932×430). */
const PHONE_LANDSCAPE_MAX_HEIGHT = 500;

/** 무대가 아닌 화면(피치 · 아레나 홈)의 배너 — 휴대폰 가로만 없음(D-21). 크기는 자리 폭이 정한다. */
export function pageBannerVariant(width: number, height: number): BannerVariant | null {
  if (width > height && height <= PHONE_LANDSCAPE_MAX_HEIGHT) return null;
  return "leaderboard";
}
