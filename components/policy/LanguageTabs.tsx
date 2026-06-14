/**
 * LanguageTabs — KO/EN segmented control for the policy header.
 *
 * Reads/writes through the I18n Context, so toggling here propagates
 * to every other surface (banner, modal, future Locker Room).
 *
 * Variant: defaults to "page" styling. Pass `compact` when nested in a
 * tight surface like the modal header (which has its own .mh-lang
 * styling already in globals.css — this component is for the policy
 * page header).
 */

"use client";

import { useI18n } from "@/lib/i18n";
import { trackWithConsent } from "@/lib/analytics";

export interface LanguageTabsProps {
  /** Analytics surface tag — `'policy' | 'modal' | ...`. */
  surface: string;
}

export function LanguageTabs({ surface }: LanguageTabsProps): JSX.Element {
  const { lang, setLang } = useI18n();

  const onPick = (next: "ko" | "en") => {
    if (next === lang) return;
    void trackWithConsent("cookie_lang_switch", {
      from: lang,
      to: next,
      surface,
    });
    setLang(next);
  };

  return (
    <div
      className="policy-lang-tabs"
      role="group"
      aria-label="Document language"
    >
      <button
        type="button"
        aria-pressed={lang === "ko"}
        onClick={() => onPick("ko")}
      >
        KO · 한국어
      </button>
      <button
        type="button"
        aria-pressed={lang === "en"}
        onClick={() => onPick("en")}
      >
        EN · English
      </button>
    </div>
  );
}
