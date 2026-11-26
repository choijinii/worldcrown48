/**
 * TIOZ.AI 띠 — 켬 (TIOZ-BAND-ON · 대표 2026-11-24 · 시안 v2 정본에 있던 띠를 코드에서 놓친 것).
 * 상수 하나로 켜고 끈다(환경변수 아님). 모양 = "TIOZ.AI" 글자만 — 링크 · "OPEN ↗" 없음.
 * tioz.ai 소개 페이지가 생기면 그때 링크를 단다(지금 tioz.ai 는 "준비중").
 * 런칭 전(커튼 · prelaunch)에는 켜져 있어도 그리지 않는다(시안 P-6) → 런칭 시각부터 보인다.
 */
export const TIOZ_BAND_ENABLED = true;

/**
 * v1.1 그림 띠(대표 2026-11-26) — 검정 + 에메랄드 그라데이션 바탕 · TIOZ.AI 로고 · 슬로건 "Truth In Opinion Zeitgeist".
 * 그림은 코티오가 만든 원본 그대로(public/pitch/tioz/ · 다시 그리거나 줄이지 않음) · 같은 크기 webp 를 먼저 준다.
 * 폰(480px 이하) = 화면 350×56 의 2배 · 그 밖 = 1320×72 의 2배.
 */
export const TIOZ_BAND_IMAGE = {
  mobileMax: "(max-width: 480px)",
  mobile: { webp: "/pitch/tioz/tioz-band-mobile@2x.webp", png: "/pitch/tioz/tioz-band-mobile@2x.png" },
  desktop: { webp: "/pitch/tioz/tioz-band-desktop@2x.webp", png: "/pitch/tioz/tioz-band-desktop@2x.png" },
  /** 고유 이름이라 3언어 공통(새 화면 문구 아님). */
  alt: "TIOZ.AI — Truth In Opinion Zeitgeist",
} as const;
