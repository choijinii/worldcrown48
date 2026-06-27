/**
 * useLocaleSync — thin glue between the i18n Context and the URL/document.
 *
 * ADR-0007 state sync: selecting a locale must (a) flip the in-memory context
 * so copy re-renders, (b) write `?lang=` into the URL for shareable links, and
 * (c) keep `<html lang>` accurate for a11y/SEO.
 *
 * Pure URL math lives in `lib/locale` (unit-tested); this hook is the
 * React/next-router shell, verified via Playwright E2E per repo convention.
 */

"use client";

import { useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { Lang } from "./cookieConsent";
import { useI18n } from "./i18n";
import { buildLangHref } from "./locale";

export function useLocaleSync(): { lang: Lang; setLocale: (next: Lang) => void } {
  const { lang, setLang } = useI18n();
  const router = useRouter();

  // Mirror the active locale onto <html lang> (root layout hard-codes "ko").
  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = lang;
    }
  }, [lang]);

  const setLocale = useCallback(
    (next: Lang) => {
      setLang(next);
      if (typeof window !== "undefined") {
        const relative =
          window.location.pathname + window.location.search + window.location.hash;
        router.replace(buildLangHref(relative, next), { scroll: false });
        document.documentElement.lang = next;
      }
    },
    [router, setLang],
  );

  return { lang, setLocale };
}
