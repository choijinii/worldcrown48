/**
 * CookieBanner — first-visit fixed-bottom GDPR banner.
 *
 * Rendering rules:
 *   - Mounted by the Provider into the same React tree, but visually
 *     fixed to the viewport bottom (CSS `position: fixed`).
 *   - When bannerState !== "visible", the entire `<aside>` is removed
 *     from the DOM via the `hidden` attribute so the slide-down animation
 *     can fully exit and assistive tech doesn't read stale content.
 *
 * Three actions (handoff §4 Banner AC):
 *   - "Accept all"    → ACCEPT_ALL_PREFERENCES, save, hide
 *   - "Reject"        → REJECT_ALL_PREFERENCES (essential only), save, hide
 *   - "Customize"     → open the ConsentModal (banner stays mounted but
 *                        hidden behind the scrim)
 *
 * Bilingual content per handoff §4: "배너 내 텍스트는 ko + en 동시 표기".
 * The Korean line is the primary content; the English line follows on a
 * second visual block, muted. Both are present in the DOM at all times
 * (no language toggle here — the modal handles that).
 */

"use client";

import { useCookieConsent } from "./CookieConsentProvider";

export function CookieBanner(): JSX.Element | null {
  const { bannerState, acceptAll, rejectAll, openModal } = useCookieConsent();

  // During the boot resolve, render nothing (avoids flash before we know
  // whether the user has already consented).
  if (bannerState === "resolving") return null;

  const hidden = bannerState !== "visible";

  return (
    <aside
      className="cookie-banner"
      data-state={bannerState}
      role="region"
      aria-label="Cookie consent"
      hidden={hidden}
    >
      <div className="cb-inner">
        <div className="cb-copy">
          <div className="cb-eyebrow">
            <span className="cb-dot" aria-hidden="true" />
            <span>쿠키 동의 · COOKIE CONSENT · GDPR</span>
          </div>
          <h2 className="cb-title">
            데이터를 정중하게 다루기 위한 동의가 필요합니다.
          </h2>
          <p className="cb-body">
            WC48은 서비스 제공에 필요한 필수 쿠키를 사용하며,
            기능·분석·광고 쿠키는 모두 선택사항입니다. 카테고리별로 동의를
            변경할 수 있습니다. 자세한 내용은{" "}
            <a href="/policies/cookies">쿠키 정책</a> ·{" "}
            <a href="/policies/privacy">개인정보처리방침</a>을 참고하세요.
            <span className="cb-body-en">
              We use essential cookies to run the service. Functional,
              analytics, and marketing cookies are all optional — set each
              category individually. See our{" "}
              <a href="/policies/cookies">Cookie Policy</a> ·{" "}
              <a href="/policies/privacy">Privacy Policy</a>.
            </span>
          </p>
        </div>
        <div className="cb-actions">
          <button
            type="button"
            className="btn-ghost"
            onClick={() => {
              void rejectAll();
            }}
          >
            필수만 · Reject non-essential
          </button>
          <button
            type="button"
            className="btn-outline"
            onClick={openModal}
          >
            설정하기 · Customize
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={() => {
              void acceptAll();
            }}
          >
            모두 허용 · Accept all
          </button>
        </div>
      </div>
    </aside>
  );
}
