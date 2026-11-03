/**
 * FooterPolicyRow — 모든 화면 맨 아래의 공용 바닥 띠 (YT-FIX-1 PR A-1 · 구글 정책 III.A.2a).
 *
 *   개인정보처리방침(맨 앞) · 이용약관 · 콘텐츠 신고(mailto) · 쿠키 설정(동의 바 다시 열기)
 *
 * root layout 이 한 번만 붙인다 — 화면마다 따로 만들지 않는다. 띠는 언제나 어두운 면이라
 * 다크·화이트 화면 어디서나 같은 모양이고, 네 항목은 글꼴·크기·색·간격이 같다(app/globals.css).
 * 매치 무대·크라운 카드·차트도 같은 띠를 쓴다 — [data-arena-root] 가 최소 100vh 라 띠는
 * 언제나 첫 화면 아래에 놓이고 플레이어·이름 띠·배너를 가리지 않는다.
 *
 * 정책 링크에는 화면 언어를 붙인다 — 없으면 문서가 영어로 열린다(2026-11-02 실측: ko·es 에서 눌러도 en).
 * Lives under the CookieConsentProvider, so it can call useCookieConsent.
 */

"use client";

import { useT } from "@/lib/i18n/useT";
import { policyLinkHref } from "@/lib/policySectionId";
import { useCookieConsent } from "./CookieConsentProvider";

export function FooterPolicyRow(): JSX.Element {
  const { reopen } = useCookieConsent();
  const { t, lang } = useT();

  return (
    <div className="policy-footer-row" data-testid="footer-band">
      <a href={policyLinkHref("/policies/privacy", lang)} data-testid="footer-privacy-link">
        {t("footer.privacy")}
      </a>
      <a href={policyLinkHref("/policies/terms", lang)}>{t("nav.sub.terms")}</a>
      <a href="mailto:report@worldcrown48.com">{t("footer.report")}</a>
      <button type="button" onClick={reopen}>
        {t("footer.cookies")}
      </button>
    </div>
  );
}
