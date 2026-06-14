/**
 * FooterPolicyRow — site-wide footer with two policy actions.
 *
 *   • "Report content" → mailto:report@worldcrown48.com (handoff §9 trap 12)
 *   • "Cookie 설정 다시 열기" → re-shows the banner (handoff §4 Banner AC)
 *
 * Lives under the CookieConsentProvider, so it can call useCookieConsent.
 *
 * Theme adaptation:
 *   The footer references `--color-text-muted` and `--color-gold`, both
 *   defined in the dark `:root` and overridable inside the light scope.
 *   No wrapper data-theme — the footer picks up whichever theme is
 *   active in its tree (dark on Domain 0~3, light on policy pages).
 */

"use client";

import { useCookieConsent } from "./CookieConsentProvider";

export function FooterPolicyRow(): JSX.Element {
  const { reopen } = useCookieConsent();

  return (
    <div className="policy-footer-row">
      <a href="mailto:report@worldcrown48.com">Report content</a>
      <button
        type="button"
        onClick={reopen}
        aria-label="Reopen cookie preferences"
      >
        Cookie 설정 다시 열기 · Reopen
      </button>
    </div>
  );
}
