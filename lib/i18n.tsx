/**
 * i18n — shared KO/EN/ES state for the policy surfaces.
 *
 * Handoff §C decision waterfall (in order):
 *   1. URL `?lang=ko|en|es` (explicit user choice via shareable link)
 *   2. Firestore user preference (when signed in — out of MVP1 scope, hook ready)
 *   3. navigator.language (`ko-KR` → ko, `es-*` → es, anything else → en)
 *   4. Default → en (global-first)
 *
 * Why Context, not Zustand:
 *   - Only two consumers (ConsentModal in PR-A, Policy pages in PR-B).
 *   - Zustand would add a runtime dep with no upside at this scale.
 *   - When the same state is needed by 4+ surfaces or we need persistence
 *     middleware, migrate to Zustand without changing this module's API.
 *
 * Module note: `resolveBootLang` lives in `lib/resolveBootLang.ts` because
 * Vitest cannot parse `.tsx` files under `"jsx": "preserve"` in tsconfig.
 */

"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Lang } from "./cookieConsent";
import { resolveBootLang } from "./resolveBootLang";

interface I18nContextValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export { resolveBootLang };

export interface I18nProviderProps {
  children: ReactNode;
  /** Override for tests / Storybook. */
  initialLang?: Lang;
}

export function I18nProvider({
  children,
  initialLang,
}: I18nProviderProps): JSX.Element {
  // Start with the SSR-safe fallback ("en") to avoid hydration mismatch.
  // The real value is resolved in the effect on the client.
  const [lang, setLangState] = useState<Lang>(initialLang ?? "en");

  useEffect(() => {
    if (initialLang) return;
    if (typeof window === "undefined") return;
    const resolved = resolveBootLang({
      url: new URL(window.location.href),
      navigatorLang: window.navigator.language,
    });
    setLangState(resolved);
  }, [initialLang]);

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
  }, []);

  const value = useMemo<I18nContextValue>(
    () => ({ lang, setLang }),
    [lang, setLang],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

/**
 * Read the current lang and a setter. Falls back to `{ lang: "en",
 * setLang: noop }` when called outside the provider so unwrapped surfaces
 * (preview routes, error boundaries) don't crash.
 */
export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (ctx) return ctx;
  return { lang: "en", setLang: () => undefined };
}
