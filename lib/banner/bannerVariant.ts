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

/** 이 배치에서 배너를 어떤 크기로 그리는가. null = 그리지 않는다. */
export function bannerVariant(mode: StageMode): BannerVariant | null {
  if (mode === "desktop") return "desktop";
  if (mode === "portrait") return "mobile";
  return null;
}
