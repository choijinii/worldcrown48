/**
 * Resolve the boot lang. Pure — only reads window/document parameters, no React.
 * Exported for tests and re-exported by i18n.tsx.
 */
import type { Lang } from "./cookieConsent";

export function resolveBootLang(args: {
  url?: URL | null;
  navigatorLang?: string | null;
}): Lang {
  // 1. URL query
  const queryLang = args.url?.searchParams.get("lang");
  if (queryLang === "ko" || queryLang === "en" || queryLang === "es") return queryLang;

  // 2. (intentionally skipped — Firestore preference is Locker Room scope, MVP2)

  // 3. navigator.language
  const nav = args.navigatorLang?.toLowerCase() ?? "";
  if (nav.startsWith("ko")) return "ko";
  if (nav.startsWith("es")) return "es";

  // 4. default
  return "en";
}
