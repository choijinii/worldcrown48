import type { Metadata } from "next";

/**
 * /beta — 1차 · 2차 베타 초대 페이지 (BETA-PASS-1 · 대표 결정 2026-11-25).
 *
 * 검색엔진에 잡히지 않게 noindex(middleware 도 X-Robots-Tag 를 단다) · 사이트맵에 넣지 않는다.
 * 메뉴바는 늘 숨긴다 — 커튼 중 /launch 와 같은 표시(`data-curtain-root`)를 달아 navbar.css 한 줄로.
 * 배너 자리 없음(원장 D-21 — 런칭 전 베타 전용 임시 페이지, 런칭 시각에 / 로 이동).
 */
export const metadata: Metadata = {
  title: "월크48 1차 베타 초대",
  robots: { index: false, follow: false },
};

export default function BetaLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div data-curtain-root hidden />
      {children}
    </>
  );
}
