/**
 * useT — React binding over the pure message resolver.
 *
 * Reads the active lang from the i18n Context and resolves catalog keys.
 * Thin by design (all logic is in messages.ts / resolveMessage, node-tested);
 * this shell is Playwright-covered per repo convention.
 */
"use client";

import { useCallback } from "react";
import { useI18n } from "@/lib/i18n";
import { resolveMessage, type MessageKey } from "./messages";

export function useT(): {
  t: (key: MessageKey, vars?: Record<string, string | number>) => string;
  lang: ReturnType<typeof useI18n>["lang"];
} {
  const { lang } = useI18n();
  const t = useCallback(
    (key: MessageKey, vars?: Record<string, string | number>) =>
      resolveMessage(lang, key, vars),
    [lang],
  );
  return { t, lang };
}
