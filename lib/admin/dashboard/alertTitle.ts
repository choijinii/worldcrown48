/**
 * alertTitle — 운영자 페이지 알림 제목을 알림 종류(type)로 고른다 (CARD-FIX, 2026-10-04).
 *
 * 그동안 AlertList 는 모든 알림을 "차트 이상 징후" 하나로 그렸다. 크라운 카드 생성 실패
 * 알림(functions `crown_card_render_failed`)이 같은 제목으로 뜨면 운영자가 차트 문제로
 * 오해한다. 문구는 승인표 C안(대표 승인 2026-10-04) — 화면 카드는 멀쩡하고 서버 PNG 만
 * 안 생긴다는 점을 드러낸다. 모르는 종류는 지금 제목 그대로 둔다(기존 동작 유지). 언어 규칙도 AlertList 와
 * 같다 — ko 가 아니면 en.
 */
import type { Lang } from "@/lib/cookieConsent";

const TITLES: Record<string, { ko: string; en: string }> = {
  crown_card_render_failed: { ko: "크라운 카드 이미지 생성 실패", en: "Crown Card image failed" },
};
const DEFAULT_TITLE = { ko: "차트 이상 징후", en: "Chart anomaly" };

export function alertTitle(type: string, lang: Lang): string {
  const t = TITLES[type] ?? DEFAULT_TITLE;
  return lang === "ko" ? t.ko : t.en;
}
