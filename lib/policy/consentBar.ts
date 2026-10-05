/**
 * consentBar — 동의 바 배치 판정 (COOKIE-1 · 순수 · lib/__tests__/policy/consentBar.test.ts).
 *
 * 대표 확정 의도(2026-10-05): **동의 바가 무대·배너 자리를 가리지 않게.** 동의 바는 화면 아래에
 * 고정돼 있으므로, 보이는 동안만 페이지 맨 아래에 동의 바의 **실제 높이**만큼 여백을 둔다 —
 * 그러면 어느 화면 폭에서든 끝까지 내렸을 때 마지막 내용(아레나의 배너 자리 포함)이 동의 바
 * 위로 완전히 드러난다. 무대·BannerSlot·stageLayout 은 건드리지 않는다(R7).
 */
import type { StageMode } from "@/lib/arena/stageLayout";

/** 페이지 맨 아래에 둘 여백(px). 동의 바가 안 보이거나 아직 못 쟀으면 0. */
export function consentBarReserve(input: { shown: boolean; height: number }): number {
  if (!input.shown) return 0;
  if (!Number.isFinite(input.height) || input.height <= 0) return 0;
  return Math.ceil(input.height);
}

/**
 * 동의 바를 지금 보여도 되는가 (§9 게이트 2 · 대표 승인 2026-09-20).
 *
 * 모바일 가로(`stageMode` = "landscape" — 폭 < 1024 이고 가로가 세로보다 김)는 매치 무대의
 * 집중 모드다(원장 D-17 ③ · D-21 바뀜 09-19). 그 동안 동의 바는 **미룬다** — 동의를 가정하지
 * 않으므로 필수 쿠키만 쓴다(R2). 세로로 돌리면 다시 보인다.
 */
export function shouldShowConsentBar(input: { mode: StageMode }): boolean {
  return input.mode !== "landscape";
}
