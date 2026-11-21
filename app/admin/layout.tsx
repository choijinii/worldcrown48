/**
 * /admin layout — light-theme wrapper for the G-1 Admin Dashboard (Domain 6).
 *
 * `.wc-admin` scopes the entire light palette (app/admin/admin.css) so it never
 * leaks into the dark global app. The class also carries the design-token CSS
 * variables, so both the gate and the dashboard inherit them.
 *
 * Auth + i18n come from the root layout (AuthProvider · I18nProvider), so this
 * layer only sets the visual container. noindex lives on the page metadata +
 * middleware X-Robots-Tag (defense-in-depth).
 */
import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./admin.css";

/**
 * LAB-FIX-5 §3-6 — 크롬 자동 번역이 켜져 있으면 Lab 화면이 멈췄다(B줄 사전 점검). 번역기가 React 가 쥔 글자 마디를
 * 다른 마디로 바꿔 끼워, 다음 화면 갱신이 그 마디를 못 찾고 멈춘다. 관리자 화면(The Lab · 대시보드 · 뉴스 데스크)만
 * 번역을 끈다: 페이지 머리 `google: notranslate`(번역 제안 자체를 끔) + 묶음에 `translate="no"` · `notranslate`(두 겹).
 * 팬 화면에는 달지 않는다 — 지원하지 않는 언어의 팬은 크롬 번역으로 본다(막을지는 대표 결정 · 지시서 §3-6).
 */
export const metadata: Metadata = {
  other: { google: "notranslate" },
};

export default function AdminLayout({
  children,
}: {
  children: ReactNode;
}): JSX.Element {
  return (
    <div className="wc-admin notranslate" data-theme="light" translate="no" data-testid="admin-root">
      {children}
    </div>
  );
}
